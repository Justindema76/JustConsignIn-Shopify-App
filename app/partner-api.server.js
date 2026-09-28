// app/partner-api.server.js
//
// Shopify App Pricing subscription lookup.
// Shopify App Pricing subscription state is read from the Partner API.

const PARTNER_API_VERSION =
  process.env.SHOPIFY_PARTNER_API_VERSION || '2026-07';

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is required for Shopify App Pricing.`,
    );
  }

  return value;
}

export async function fetchActiveSubscription(shopId) {
  if (!shopId) {
    throw new Error(
      'A Shopify shop GID is required to query the active subscription.',
    );
  }

  const orgId = requiredEnv('SHOPIFY_PARTNER_ORG_ID');
  const accessToken = requiredEnv(
    'SHOPIFY_PARTNER_API_ACCESS_TOKEN',
  );
  const appId = requiredEnv('SHOPIFY_APP_GID');

  const response = await fetch(
    `https://partners.shopify.com/${orgId}/api/${PARTNER_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: `#graphql
          query ActiveSubscription($appId: ID!, $shopId: ID!) {
            activeSubscription(appId: $appId, shopId: $shopId) {
              billingPeriod
              cancelAtEndOfCycle
              trialEndsAt
              legacySubscriptionId
              items {
                handle
              }
            }
          }
        `,
        variables: {
          appId,
          shopId,
        },
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || payload?.errors?.length) {
    throw new Error(
      `Partner API request failed: ${JSON.stringify(
        payload?.errors || response.status,
      )}`,
    );
  }

  return payload?.data?.activeSubscription || null;
}
