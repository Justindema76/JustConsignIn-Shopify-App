// app/routes/app.plans.jsx
//
// Plan picker screen. Merchants land here after install if they have no
// active subscription, or any time they want to upgrade/downgrade.

import { useEffect } from 'react';
import { Form, useLoaderData, useNavigation, useActionData } from 'react-router';
import { authenticate } from '../shopify.server';
import { PLANS, getActivePlan, createSubscription } from '../billing.server';
import '../styles/pricing-plans.css';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const activePlan = await getActivePlan(admin);
  return { activePlan, plans: PLANS };
};

export const action = async ({ request }) => {
  // IMPORTANT: this action never throws on purpose. React Router strips the
  // real message off thrown errors before they reach the browser in a
  // production build ("Unexpected Server Error" is all you'll ever see) —
  // so any failure here is caught and returned as normal action data
  // instead, which is NOT stripped. That's the only way to see what's
  // actually going wrong without pulling server logs.
  try {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const planKey = formData.get('plan');

    if (!planKey || !PLANS[planKey]) {
      return { error: `Invalid or missing plan key: ${JSON.stringify(planKey)}` };
    }

    const appUrl = process.env.SHOPIFY_APP_URL || '';
    if (!appUrl) {
      return { error: 'SHOPIFY_APP_URL is not set on the server — required to build an absolute returnUrl for billing.' };
    }
    // IMPORTANT: Shopify appends `charge_id` to whatever returnUrl we give
    // it and redirects the TOP-LEVEL browser tab there (not the iframe) —
    // but it does NOT add `shop`/`host` for us. If returnUrl is bare
    // (`/app`), the round trip lands with only `?charge_id=...`, and
    // authenticate.admin() has no shop to identify — it throws a raw
    // Response (status defaults to 200) from Shopify's own renderAppBridge()
    // helper trying to bootstrap App Bridge with nothing to redirect to.
    // That Response isn't caught by the app's error boundary (it's a raw
    // Response, not the wrapped error type the boundary checks for), so it
    // falls through to a bare "200" page. Carrying shop/host through fixes
    // the round trip.
    const requestUrl = new URL(request.url);
    const shopParam = requestUrl.searchParams.get('shop');
    const hostParam = requestUrl.searchParams.get('host');
    const returnUrlParams = new URLSearchParams();
    if (shopParam) returnUrlParams.set('shop', shopParam);
    if (hostParam) returnUrlParams.set('host', hostParam);
    const returnUrl = `${appUrl}/app${returnUrlParams.toString() ? `?${returnUrlParams.toString()}` : ''}`;

    const confirmationUrl = await createSubscription(admin, planKey, {
      returnUrl,
      // Do NOT derive this from NODE_ENV — Render sets NODE_ENV=production
      // on every Node web service by default, whether or not you're really
      // in production. That silently sent test: false to Shopify, which a
      // Developer Preview / dev store can't accept ("The shop cannot accept
      // the provided charge"). Use an explicit, deliberate flag instead —
      // set BILLING_LIVE_MODE=true on Render only once you're ready to
      // charge real merchants for real.
      isTest: process.env.BILLING_LIVE_MODE !== 'true',
    });

    if (!confirmationUrl || typeof confirmationUrl !== 'string') {
      return { error: `createSubscription returned an invalid confirmationUrl: ${JSON.stringify(confirmationUrl)}` };
    }

    // IMPORTANT: do NOT Response.redirect() here. This runs inside an
    // embedded app's iframe, and a server-side 3xx redirect gets followed
    // by the iframe's own document load — landing on
    // admin.shopify.com/.../confirm_recurring_application_charge INSIDE the
    // iframe, which Shopify's own anti-framing protection blocks outright
    // ("admin.shopify.com refused to connect"). The confirmation screen has
    // to load in the full top-level browser tab instead. So we hand the URL
    // back as normal data, and the client breaks out of the iframe itself
    // using target="_top" (Shopify's documented pattern for this exact case).
    return { confirmationUrl };
  } catch (error) {
    // Catches literally anything: GraphQL client errors, network failures,
    // authenticate.admin() failures, thrown Errors from billing.server.js,
    // bad URL construction in Response.redirect, all of it.
    const message = error instanceof Error ? (error.stack || error.message) : String(error);
    // Still goes to Render's logs for a permanent record...
    console.error('[app.plans action] failed:', message);
    // ...and also comes straight back to the browser, unstripped.
    return { error: message };
  }
};

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 4L6 11.5L2.5 8" stroke="#2952d9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M4 7V5a4 4 0 0 1 8 0v2" stroke="#5b606c" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="3" y="7" width="10" height="7" rx="1.4" stroke="#5b606c" strokeWidth="1.4" />
    </svg>
  );
}

function PlanCard({ plan, isActive, isBestValue, submitting }) {
  return (
    <div className={`pricing-card${isBestValue ? ' featured' : ''}`}>
      {isBestValue && <span className="pricing-kicker">Best value</span>}

      <div className="pricing-card-top">
        <h3 className="pricing-card-name">{plan.shortName}</h3>
        <span className="pricing-badge">{plan.trialDays} days free</span>
      </div>

      <p className="pricing-trial-line">{plan.trialDays}-day free trial, then</p>
      <p className="pricing-price-line">
        ${plan.amount} <span>/ 30 days</span>
      </p>
      <p className="pricing-desc">{plan.description}</p>

      <ul className="pricing-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>

      {isActive ? (
        <span className="pricing-cta primary current">Current plan</span>
      ) : (
        <Form method="post">
          <input type="hidden" name="plan" value={plan.key} />
          <button type="submit" className="pricing-cta primary" disabled={submitting}>
            {submitting ? 'Redirecting…' : 'Start free trial'}
          </button>
        </Form>
      )}
    </div>
  );
}

export default function PlansScreen() {
  const { activePlan, plans } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting' || Boolean(actionData?.confirmationUrl);

  // Escape the app's iframe to load Shopify's billing confirmation screen
  // in the full top-level browser tab. A server-side redirect can't do this
  // — it gets blocked by admin.shopify.com's own anti-framing protection.
  useEffect(() => {
    if (actionData?.confirmationUrl) {
      window.open(actionData.confirmationUrl, '_top');
    }
  }, [actionData?.confirmationUrl]);

  const manualPlan = { ...plans.TIER1, shortName: 'Manual' };
  const shopifyPlan = { ...plans.TIER2, shortName: 'Shopify' };

  return (
    <div className="pricing-page">
      <div className="pricing-wrap">
        <p className="pricing-eyebrow">Pricing</p>
        <h1>Start with the manual consignment workflow.</h1>
        <p className="pricing-sub">
          Try JustConsignIn free for 14 days on either plan below. A payment
          method is collected at signup, and billing starts only after the
          trial unless you cancel first.
        </p>

        {actionData?.error && (
          <div className="pricing-error">
            <p>Couldn't start that plan:</p>
            <pre>{actionData.error}</pre>
          </div>
        )}

        <div className="pricing-grid">
          <PlanCard
            plan={manualPlan}
            isActive={activePlan === manualPlan.key}
            isBestValue={false}
            submitting={submitting}
          />
          <PlanCard
            plan={shopifyPlan}
            isActive={activePlan === shopifyPlan.key}
            isBestValue
            submitting={submitting}
          />

          <div className="pricing-card muted">
            <div className="pricing-card-top">
              <h3 className="pricing-card-name">Advanced</h3>
              <div className="pricing-lock">
                <LockIcon />
              </div>
            </div>
            <p className="pricing-trial-line" style={{ marginBottom: 20 }}>Coming later</p>
            <p className="pricing-desc">For larger operations and additional workflows.</p>
            <ul className="pricing-features">
              <li><CheckIcon />Multi-location</li>
              <li><CheckIcon />Consignor portal</li>
              <li><CheckIcon />Advanced reporting</li>
              <li><CheckIcon />Additional integrations</li>
            </ul>
            <button type="button" className="pricing-cta disabled" disabled>Not available yet</button>
          </div>
        </div>

        <p className="pricing-fineprint">
          Prices shown in USD, billed every 30 days after your 14-day trial ends.
          Cancel anytime before the trial ends and you won't be charged.
        </p>
      </div>
    </div>
  );
}
