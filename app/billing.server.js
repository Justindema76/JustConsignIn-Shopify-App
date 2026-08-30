// app/billing.server.js
//
// Central plan definitions + helpers for JustConsignIn's two-tier pricing:
//   TIER1 — Manual only
//   TIER2 — Manual + Shopify product sync
//
// Billing runs entirely through Shopify's GraphQL Billing API
// (appSubscriptionCreate / appSubscriptionCancel / activeSubscriptions). Do
// not add Stripe, PayPal, or any offsite checkout — Shopify App Store review
// requires billing to go exclusively through this API for AppStore-
// distributed apps.

export const PLANS = {
  TIER1: {
    key: 'TIER1',
    name: 'JustConsignIn — Manual',
    amount: 19,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    description: 'Payment method required at signup. Billing starts after the trial unless cancelled.',
    features: [
      'Consignors',
      'Items',
      'Manual sales',
      'Payouts',
      'Transactions',
      'Reports',
      'CSV import / export',
    ],
  },
  TIER2: {
    key: 'TIER2',
    name: 'JustConsignIn — Manual + Shopify Sync',
    amount: 29,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS',
    trialDays: 14,
    description: "Turn every item you take on consignment into a real, sellable Shopify listing — photo, price, and inventory live in minutes, not spreadsheets.",
    features: [
      'Everything in Manual',
      'Real Shopify products, not just line items',
      "Snap or upload a photo — it's on the listing instantly",
      'POS sync, so in-store sales update inventory everywhere',
      'Publish to your Online Store with one click',
      'Sold anywhere, marked sold everywhere — automatically',
    ],
  },
};

/* =========================================================
   GRAPHQL
   ========================================================= */

const ACTIVE_SUBSCRIPTIONS_QUERY = `#graphql
  query ActiveSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
      }
    }
  }
`;

const CREATE_SUBSCRIPTION_MUTATION = `#graphql
  mutation AppSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: URL!
    $test: Boolean
    $trialDays: Int
    $replacementBehavior: AppSubscriptionReplacementBehavior
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: $lineItems
      test: $test
      trialDays: $trialDays
      replacementBehavior: $replacementBehavior
    ) {
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

const CANCEL_SUBSCRIPTION_MUTATION = `#graphql
  mutation AppSubscriptionCancel(
    $id: ID!
    $prorate: Boolean
  ) {
    appSubscriptionCancel(
      id: $id
      prorate: $prorate
    ) {
      appSubscription {
        id
        name
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/* =========================================================
   HELPERS
   ========================================================= */

function planKeyFromSubscriptionName(name) {
  if (name === PLANS.TIER1.name) return 'TIER1';
  if (name === PLANS.TIER2.name) return 'TIER2';
  return null;
}

function graphqlErrors(data) {
  if (!data?.errors?.length) return null;
  return data.errors.map((error) => error.message).join(', ');
}

function userErrors(errors = []) {
  if (!errors.length) return null;
  return errors.map((error) => error.message).join(', ');
}

/* =========================================================
   ACTIVE SUBSCRIPTION
   ========================================================= */

/**
 * Returns the shop's active Shopify billing subscription, augmented with
 * `planKey` ('TIER1' | 'TIER2' | null), or null if there is none.
 */
export async function getActiveSubscription(admin) {
  const response = await admin.graphql(ACTIVE_SUBSCRIPTIONS_QUERY);
  const data = await response.json();

  const topLevelError = graphqlErrors(data);
  if (topLevelError) {
    throw new Error(topLevelError);
  }

  const subscriptions =
    data?.data?.currentAppInstallation?.activeSubscriptions || [];

  const active =
    subscriptions.find((subscription) => subscription.status === 'ACTIVE') ||
    null;

  if (!active) return null;

  return {
    ...active,
    planKey: planKeyFromSubscriptionName(active.name),
  };
}

/**
 * Returns 'TIER1' | 'TIER2' | null for the current admin session's shop.
 * null means there's no active paid subscription — the caller should send
 * the merchant to /app/plans.
 */
export async function getActivePlan(admin) {
  const subscription = await getActiveSubscription(admin);
  return subscription?.planKey || null;
}

/**
 * Starts a subscription for the given plan key ('TIER1' | 'TIER2').
 * Returns the confirmationUrl the merchant must be redirected to so they
 * can approve the charge on Shopify's side.
 */
export async function createSubscription(admin, planKey, { returnUrl, isTest = false }) {
  const plan = PLANS[planKey];
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);
  if (!returnUrl) throw new Error('A Shopify billing returnUrl is required.');

  const response = await admin.graphql(CREATE_SUBSCRIPTION_MUTATION, {
    variables: {
      name: plan.name,
      returnUrl,
      test: isTest,
      trialDays: plan.trialDays || 0,
      replacementBehavior: 'STANDARD',
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.amount, currencyCode: plan.currencyCode },
              interval: plan.interval,
            },
          },
        },
      ],
    },
  });

  const data = await response.json();
  const topLevelError = graphqlErrors(data);
  if (topLevelError) {
    // Top-level GraphQL errors (bad input types, auth issues, etc.) land
    // here, separate from userErrors. A common cause: returnUrl wasn't a
    // valid absolute URL — check that SHOPIFY_APP_URL is set correctly.
    throw new Error(topLevelError);
  }

  const result = data?.data?.appSubscriptionCreate;
  if (!result) {
    throw new Error('appSubscriptionCreate returned no data — check SHOPIFY_APP_URL is a full absolute URL.');
  }

  const mutationError = userErrors(result.userErrors);
  if (mutationError) {
    throw new Error(mutationError);
  }

  if (!result.confirmationUrl) {
    throw new Error('Shopify did not return a billing confirmation URL.');
  }

  return result.confirmationUrl;
}

/**
 * Cancels the shop's active Shopify billing subscription, if any.
 * Throws if there is no active subscription to cancel.
 */
export async function cancelActiveSubscription(admin, { prorate = false } = {}) {
  const subscription = await getActiveSubscription(admin);

  if (!subscription?.id) {
    throw new Error('No active Shopify subscription was found.');
  }

  const response = await admin.graphql(CANCEL_SUBSCRIPTION_MUTATION, {
    variables: {
      id: subscription.id,
      prorate,
    },
  });

  const data = await response.json();
  const topLevelError = graphqlErrors(data);
  if (topLevelError) {
    throw new Error(topLevelError);
  }

  const result = data?.data?.appSubscriptionCancel;
  if (!result) {
    throw new Error('Shopify did not return appSubscriptionCancel data.');
  }

  const mutationError = userErrors(result.userErrors);
  if (mutationError) {
    throw new Error(mutationError);
  }

  return result.appSubscription || null;
}

/**
 * Route/action guard: throws a 402 Response if the shop isn't on Tier 2.
 * Use inside any loader/action that touches Shopify product sync, e.g.:
 *   await requireTier2(admin);
 */
export async function requireTier2(admin) {
  const plan = await getActivePlan(admin);
  if (plan !== 'TIER2') {
    throw new Response(
      JSON.stringify({ error: 'This feature requires the Manual + Shopify Sync plan.' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return plan;
}

/**
 * Route/action guard: throws a 402 Response if the shop has no active plan
 * at all (neither Tier 1 nor Tier 2).
 */
export async function requireActivePlan(admin) {
  const plan = await getActivePlan(admin);
  if (!plan) {
    throw new Response(
      JSON.stringify({ error: 'No active subscription. Choose a plan to continue.' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return plan;
}