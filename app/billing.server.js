// app/billing.server.js
//
// JustConsignIn Shopify App Pricing access control.
//
// Shopify owns plan prices, trials, approvals and recurring billing.
// This module only reads the active plan and gates app features.

import { fetchActiveSubscription } from './partner-api.server';

export const PLANS = {
  TIER1: {
    key: 'TIER1',
    handle: 'tier1',
    label: 'Manual',
    access: 'manual',
  },

  TIER2: {
    key: 'TIER2',
    handle: 'tier2',
    label: 'Manual + Shopify Sync',
    access: 'full',
  },

  BETA_TESTER: {
    key: 'BETA_TESTER',
    handle: 'beta-tester',
    label: 'Beta Tester',
    access: 'full',
  },

  SHOPIFY_TEST: {
    key: 'SHOPIFY_TEST',
    handle: 'shopify-test',
    label: 'Shopify Test',
    access: 'full',
  },
};

const PLAN_KEY_BY_HANDLE = Object.values(PLANS).reduce(
  (map, plan) => {
    map[plan.handle] = plan.key;
    return map;
  },
  {},
);

const LEGACY_PLAN_NAMES = {
  'JustConsignIn - Manual': 'TIER1',
  'JustConsignIn - Manual + Shopify Sync': 'TIER2',
};

const LEGACY_ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query ActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

const SHOP_ID_QUERY = `#graphql
  query ShopId {
    shop {
      id
    }
  }
`;

const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;
const planCache = new Map();

function normalizeShop(shop) {
  return String(shop || '').trim().toLowerCase();
}

function graphqlErrors(data) {
  if (!data?.errors?.length) {
    return null;
  }

  return data.errors
    .map((error) => error.message)
    .join(', ');
}

async function getShopId(admin) {
  const response = await admin.graphql(SHOP_ID_QUERY);
  const data = await response.json();

  const topLevelError = graphqlErrors(data);

  if (topLevelError) {
    throw new Error(topLevelError);
  }

  const shopId = data?.data?.shop?.id;

  if (!shopId) {
    throw new Error(
      'Shopify did not return the shop GID required for App Pricing.',
    );
  }

  return shopId;
}

function planKeyFromSubscription(subscription) {
  const handles = (subscription?.items || [])
    .map((item) => item?.handle)
    .filter(Boolean);

  for (const handle of handles) {
    const planKey = PLAN_KEY_BY_HANDLE[handle];

    if (planKey) {
      return planKey;
    }
  }

  return null;
}

async function getLegacyActivePlan(admin) {
  const response = await admin.graphql(
    LEGACY_ACTIVE_SUBSCRIPTIONS_QUERY,
  );

  const data = await response.json();

  const topLevelError = graphqlErrors(data);

  if (topLevelError) {
    throw new Error(topLevelError);
  }

  const subscriptions =
    data?.data?.currentAppInstallation?.activeSubscriptions || [];

  const active = subscriptions.find(
    (subscription) => subscription.status === 'ACTIVE',
  );

  if (!active) {
    return null;
  }

  return LEGACY_PLAN_NAMES[active.name] || null;
}

export async function getActivePlan(admin, shop) {
  const normalizedShop = normalizeShop(shop);

  if (!normalizedShop) {
    throw new Error(
      'A Shopify shop domain is required to check the active plan.',
    );
  }

  const cached = planCache.get(normalizedShop);

  if (
    cached &&
    Date.now() - cached.checkedAt < PLAN_CACHE_TTL_MS
  ) {
    return cached.planKey;
  }

  const shopId = await getShopId(admin);
  const subscription = await fetchActiveSubscription(shopId);

  if (!subscription) {
    return null;
  }

  let planKey = planKeyFromSubscription(subscription);

  // During the Billing API -> Shopify App Pricing migration, an existing
  // legacy subscription can still be active until its scheduled move takes
  // effect. Keep read-only legacy detection so those merchants aren't locked
  // out while the migration completes.
  if (!planKey && subscription.legacySubscriptionId) {
    planKey = await getLegacyActivePlan(admin);
  }

  if (!planKey) {
    const handles = (subscription.items || [])
      .map((item) => item?.handle)
      .filter(Boolean);

    throw new Error(
      `Active Shopify subscription uses an unknown plan handle: ${JSON.stringify(
        handles,
      )}`,
    );
  }

  // Cache only confirmed active plans. Never cache a missing subscription,
  // because a merchant may have just selected a plan and immediately returned.
  planCache.set(normalizedShop, {
    planKey,
    checkedAt: Date.now(),
  });

  return planKey;
}

export function planHasShopifySync(planKey) {
  return (
    planKey === 'TIER2' ||
    planKey === 'BETA_TESTER' ||
    planKey === 'SHOPIFY_TEST'
  );
}

export function getHostedPricingUrl(shop) {
  const normalizedShop = normalizeShop(shop);

  if (!normalizedShop.endsWith('.myshopify.com')) {
    throw new Error(
      'A valid .myshopify.com domain is required to build the pricing URL.',
    );
  }

  const storeHandle = normalizedShop.replace(
    '.myshopify.com',
    '',
  );

  const appHandle =
    process.env.SHOPIFY_APP_HANDLE || 'justconsignin';

  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

export async function requireTier2(admin, shop) {
  const plan = await getActivePlan(admin, shop);

  if (!planHasShopifySync(plan)) {
    throw new Response(
      JSON.stringify({
        error:
          'This feature requires Shopify integration access.',
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  return plan;
}

export async function requireActivePlan(admin, shop) {
  const plan = await getActivePlan(admin, shop);

  if (!plan) {
    throw new Response(
      JSON.stringify({
        error:
          'No active subscription. Choose a plan to continue.',
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  return plan;
}
