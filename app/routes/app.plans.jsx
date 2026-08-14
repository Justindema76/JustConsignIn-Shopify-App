// app/routes/app.plans.jsx
//
// Plan picker screen. Merchants land here after install if they have no
// active subscription, or any time they want to upgrade/downgrade.

import { Form, useLoaderData, useNavigation } from 'react-router';
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
