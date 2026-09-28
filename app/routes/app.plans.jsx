// app/routes/app.plans.jsx
//
// Plan picker + founding member request screen.

import { useEffect } from 'react';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { authenticate } from '../shopify.server';
import {
  PLANS,
  getActivePlan,
  getEffectivePlan,
  createSubscription,
  cancelActiveSubscription,
} from '../billing.server';
import {
  getFoundingAccess,
  getFoundingStats,
  requestFoundingAccess,
} from '../founding.server';
import '../styles/pricing-plans.css';

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const [activePlan, foundingAccess, foundingStats] = await Promise.all([
    getEffectivePlan(admin, session.shop),
    getFoundingAccess(session.shop),
    getFoundingStats(),
  ]);

  return {
    activePlan,
    plans: PLANS,
    foundingAccess,
    foundingStats,
  };
};

export const action = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);

    const formData = await request.formData();
    const intent = formData.get('intent');

    if (intent === 'request-founding') {
      const paidPlan = await getActivePlan(admin);

      if (paidPlan) {
        return {
          error:
            'This store already has an active paid subscription. Founding access is for stores that have not started a paid plan.',
        };
      }

      const foundingAccess = await requestFoundingAccess(session.shop);

      return {
        foundingRequested: true,
        foundingAccess,
      };
    }

    if (intent === 'cancel') {
      const cancelledSubscription = await cancelActiveSubscription(admin, {
        prorate: false,
      });

      return {
        cancelled: true,
        cancelledSubscription,
      };
    }

    const planKey = formData.get('plan');

    if (!planKey || !PLANS[planKey]) {
      return {
        error: `Invalid or missing plan key: ${JSON.stringify(planKey)}`,
      };
    }

    const appUrl = process.env.SHOPIFY_APP_URL || '';

    if (!appUrl) {
      return {
        error:
          'SHOPIFY_APP_URL is not set on the server - required to build an absolute returnUrl for billing.',
      };
    }

    const returnUrl = new URL('/app/plans', appUrl);

    returnUrl.searchParams.set('shop', session.shop);

    const requestUrl = new URL(request.url);
    const hostParam = requestUrl.searchParams.get('host');

    if (hostParam) {
      returnUrl.searchParams.set('host', hostParam);
    }

    const confirmationUrl = await createSubscription(admin, planKey, {
      returnUrl: returnUrl.toString(),
      isTest: process.env.BILLING_LIVE_MODE !== 'true',
    });

    if (!confirmationUrl || typeof confirmationUrl !== 'string') {
      return {
        error: `createSubscription returned an invalid confirmationUrl: ${JSON.stringify(
          confirmationUrl,
        )}`,
      };
    }

    return {
      confirmationUrl,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.stack || error.message
        : String(error);

    console.error('[app.plans action] failed:', message);

    return {
      error: message,
    };
  }
};

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.5 4L6 11.5L2.5 8"
        stroke="#2952d9"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7V5a4 4 0 0 1 8 0v2"
        stroke="#5b606c"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="1.4"
        stroke="#5b606c"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function PlanCard({
  plan,
  isActive,
  isBestValue,
  submitting,
  activePlan,
}) {
  let actionLabel = `Start ${plan.trialDays}-day free trial`;

  if (activePlan === 'TIER1' && plan.key === 'TIER2') {
    actionLabel = `Start ${plan.trialDays}-day Shopify trial`;
  } else if (activePlan === 'TIER2' && plan.key === 'TIER1') {
    actionLabel = `Start ${plan.trialDays}-day Manual trial`;
  }

  return (
    <div className={`pricing-card${isBestValue ? ' featured' : ''}`}>
      {isBestValue && (
        <span className="pricing-kicker">
          Best value
        </span>
      )}

      <div className="pricing-card-top">
        <h3 className="pricing-card-name">
          {plan.shortName}
        </h3>

        <span className="pricing-badge">
          {plan.trialDays} days free
        </span>
      </div>

      <p className="pricing-trial-line">
        {plan.trialDays}-day free trial, then
      </p>

      <p className="pricing-price-line">
        ${plan.amount}{' '}
        <span>/ 30 days</span>
      </p>

      <p className="pricing-desc">
        {plan.description}
      </p>

      <ul className="pricing-features">
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckIcon />
            {feature}
          </li>
        ))}
      </ul>

      {isActive ? (
        <span className="pricing-cta primary current">
          Current plan
        </span>
      ) : (
        <Form method="post">
          <input
            type="hidden"
            name="plan"
            value={plan.key}
          />

          <button
            type="submit"
            className="pricing-cta primary"
            disabled={submitting}
          >
            {submitting
              ? 'Redirecting...'
              : actionLabel}
          </button>
        </Form>
      )}
    </div>
  );
}

function FoundingCard({
  activePlan,
  access,
  stats,
  requesting,
}) {
  const approved = activePlan === 'FOUNDING';
  const pending = access?.status === 'PENDING';
  const rejected = access?.status === 'REJECTED';
  const canRequest =
    !approved &&
    !pending &&
    !stats.full;

  return (
    <div className={`pricing-card${approved ? ' featured' : ''}`} style={{ marginBottom: 24 }}>
      <div className="pricing-card-top">
        <h3 className="pricing-card-name">
          Founding Member
        </h3>

        <span className="pricing-badge">
          {approved
            ? `#${access.position} of ${stats.limit}`
            : `${stats.remaining} of ${stats.limit} spots left`}
        </span>
      </div>

      <p className="pricing-price-line">
        $0 <span>/ forever</span>
      </p>

      <p className="pricing-desc">
        Approved founding stores receive full JustConsignIn access permanently at no monthly charge.
        Every founding member is personally approved before the free plan is activated.
      </p>

      <ul className="pricing-features">
        <li><CheckIcon />Everything in Manual</li>
        <li><CheckIcon />Shopify product creation and sync</li>
        <li><CheckIcon />Shopify POS and inventory integration</li>
        <li><CheckIcon />Permanent $0 founding membership after approval</li>
      </ul>

      {approved && (
        <span className="pricing-cta primary current">
          Approved — free forever
        </span>
      )}

      {pending && !approved && (
        <span className="pricing-cta current">
          Request pending approval
        </span>
      )}

      {stats.full && !approved && (
        <span className="pricing-cta disabled">
          Founding spots filled
        </span>
      )}

      {canRequest && (
        <Form method="post">
          <input type="hidden" name="intent" value="request-founding" />
          <button
            type="submit"
            className="pricing-cta primary"
            disabled={requesting}
          >
            {requesting
              ? 'Sending request...'
              : rejected
                ? 'Request reconsideration'
                : 'Request founding access'}
          </button>
        </Form>
      )}
    </div>
  );
}

export default function PlansScreen() {
  const {
    activePlan,
    plans,
    foundingAccess,
    foundingStats,
  } = useLoaderData();

  const actionData = useActionData();
  const navigation = useNavigation();

  const submitting =
    navigation.state === 'submitting' ||
    Boolean(actionData?.confirmationUrl);

  const cancelling =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'cancel';

  const requesting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'request-founding';

  useEffect(() => {
    if (!actionData?.confirmationUrl) {
      return;
    }

    window.open(
      actionData.confirmationUrl,
      '_top',
    );
  }, [actionData?.confirmationUrl]);

  const manualPlan = {
    ...plans.TIER1,
    shortName: 'Manual',
  };

  const shopifyPlan = {
    ...plans.TIER2,
    shortName: 'Shopify',
  };

  const hasActivePlan =
    Boolean(activePlan);

  const currentPlanName =
    activePlan === 'FOUNDING'
      ? 'Founding Member'
      : activePlan === 'TIER2'
        ? 'Manual + Shopify Sync'
        : activePlan === 'TIER1'
          ? 'Manual'
          : null;

  return (
    <div className="pricing-page">
      <div className="pricing-wrap">
        <p className="pricing-eyebrow">
          Pricing
        </p>

        <h1>
          {activePlan === 'FOUNDING'
            ? 'Your Founding Member access is active.'
            : hasActivePlan
              ? 'Change your JustConsignIn plan.'
              : 'Start with the plan that fits your workflow.'}
        </h1>

        <p className="pricing-sub">
          {activePlan === 'FOUNDING'
            ? 'Your store has permanent full access at $0 as an approved JustConsignIn Founding Member.'
            : hasActivePlan
              ? 'Your current plan stays active until you approve a different plan through Shopify.'
              : 'Request one of the 20 manually approved Founding Member spots, or start a paid plan immediately.'}
        </p>

        {actionData?.foundingRequested && (
          <div className="pricing-error" role="status">
            <p>
              Founding Member request sent. Access stays pending until it is personally approved.
            </p>
          </div>
        )}

        {actionData?.cancelled && (
          <div className="pricing-error" role="status">
            <p>
              Subscription cancelled successfully through Shopify.
            </p>
          </div>
        )}

        {actionData?.error && (
          <div className="pricing-error">
            <p>
              Could not complete that action:
            </p>

            <pre>
              {actionData.error}
            </pre>
          </div>
        )}

        {!['TIER1', 'TIER2'].includes(activePlan) && (
          <FoundingCard
            activePlan={activePlan}
            access={foundingAccess}
            stats={foundingStats}
            requesting={requesting}
          />
        )}

        {activePlan !== 'FOUNDING' && (
          <div className="pricing-grid">
            <PlanCard
              plan={manualPlan}
              isActive={
                activePlan === manualPlan.key
              }
              isBestValue={false}
              submitting={submitting}
              activePlan={activePlan}
            />

            <PlanCard
              plan={shopifyPlan}
              isActive={
                activePlan === shopifyPlan.key
              }
              isBestValue
              submitting={submitting}
              activePlan={activePlan}
            />

            <div className="pricing-card muted">
              <div className="pricing-card-top">
                <h3 className="pricing-card-name">
                  Advanced
                </h3>

                <div className="pricing-lock">
                  <LockIcon />
                </div>
              </div>

              <p
                className="pricing-trial-line"
                style={{
                  marginBottom: 20,
                }}
              >
                Coming later
              </p>

              <p className="pricing-desc">
                For larger operations and additional workflows.
              </p>

              <ul className="pricing-features">
                <li>
                  <CheckIcon />
                  Multi-location
                </li>

                <li>
                  <CheckIcon />
                  Consignor portal
                </li>

                <li>
                  <CheckIcon />
                  Advanced reporting
                </li>

                <li>
                  <CheckIcon />
                  Additional integrations
                </li>
              </ul>

              <button
                type="button"
                className="pricing-cta disabled"
                disabled
              >
                Not available yet
              </button>
            </div>
          </div>
        )}

        {['TIER1', 'TIER2'].includes(activePlan) && (
          <div className="pricing-card" style={{ marginTop: 24 }}>
            <div className="pricing-card-top">
              <div>
                <p className="pricing-eyebrow" style={{ marginBottom: 6 }}>
                  Subscription
                </p>
                <h3 className="pricing-card-name">
                  {currentPlanName}
                </h3>
              </div>
            </div>

            <p className="pricing-desc">
              Cancelling stops your active JustConsignIn Shopify app subscription. You can start a plan again later from this page.
            </p>

            <Form
              method="post"
              onSubmit={(event) => {
                if (!window.confirm('Cancel your JustConsignIn subscription?')) {
                  event.preventDefault();
                }
              }}
            >
              <input
                type="hidden"
                name="intent"
                value="cancel"
              />

              <button
                type="submit"
                className="pricing-cta"
                disabled={cancelling}
              >
                {cancelling
                  ? 'Cancelling...'
                  : 'Cancel subscription'}
              </button>
            </Form>
          </div>
        )}

        <p className="pricing-fineprint">
          Founding Member access is limited to 20 stores and requires manual approval.
          Paid plans are shown in USD and billed every 30 days after the selected plan&apos;s trial.
        </p>
      </div>
    </div>
  );
}
