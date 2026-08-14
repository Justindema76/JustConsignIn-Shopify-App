// app/routes/app.plans.jsx
//
// Plan picker screen. Merchants land here after install if they have no
// active subscription, or any time they want to upgrade/downgrade.

import { Form, useLoaderData, useNavigation, useRouteError, isRouteErrorResponse } from 'react-router';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { authenticate } from '../shopify.server';
import { PLANS, getActivePlan, createSubscription } from '../billing.server';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const activePlan = await getActivePlan(admin);
  return { activePlan, plans: PLANS };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get('plan');

  const appUrl = process.env.SHOPIFY_APP_URL || '';
  if (!appUrl) {
    throw new Error('SHOPIFY_APP_URL is not set — required to build an absolute returnUrl for billing.');
  }
  const returnUrl = `${appUrl}/app`;

  const confirmationUrl = await createSubscription(admin, planKey, {
    returnUrl,
    isTest: process.env.NODE_ENV !== 'production',
  });

  return Response.redirect(confirmationUrl, 302);
};

export default function PlansScreen() {
  const { activePlan, plans } = useLoaderData();
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';

  return (
    <div className="jatb-body" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="jatb-section-heading">
        <label className="jatb-label">Choose your plan</label>
      </div>

      {Object.values(plans).map((plan) => {
        const isActive = activePlan === plan.key;
        const shortName = plan.name.split('—')[1]?.trim() || plan.name;
        return (
          <div
            key={plan.key}
            className="jatb-card"
            style={{ marginBottom: 16, border: isActive ? '2px solid var(--green-dark)' : undefined }}
          >
            <h3 style={{ margin: '0 0 4px' }}>{plan.name}</h3>
            <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>
              ${plan.amount}
              <span style={{ fontSize: 13, fontWeight: 400 }}> / 30 days</span>
            </p>
            <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {isActive ? (
              <span className="jatb-badge available">Current plan</span>
            ) : (
              <Form method="post">
                <input type="hidden" name="plan" value={plan.key} />
                <button type="submit" className="jatb-btn" disabled={submitting}>
                  {submitting ? 'Redirecting…' : `Choose ${shortName}`}
                </button>
              </Form>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Shopify's shared boundary.error() helper only renders content for thrown
// Response objects (redirects, the 402s in billing.server.js) — for a plain
// JS Error it just re-throws, which falls through to React Router's generic
// blank "Application Error" page with no message at all. Define our own
// boundary here so a real failure (bad returnUrl, missing env var, GraphQL
// error, etc.) actually shows its message instead of going dark.
export function ErrorBoundary() {
  const error = useRouteError();

  // Auth/redirect responses (expired session, exit-iframe bounce, etc.)
  // should still go through Shopify's normal handling, not our message box.
  if (isRouteErrorResponse(error)) {
    return boundary.error(error);
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="jatb-body" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="jatb-section-heading">
        <label className="jatb-label">Couldn't start that plan</label>
      </div>
      <div className="jatb-card" style={{ borderColor: '#c0392b' }}>
        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
