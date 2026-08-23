import { redirect, useLoaderData } from 'react-router';
import { authenticate } from '../shopify.server';
import { getActivePlan } from '../billing.server';
import TierOneConsignmentApp from '../tier1_consignment_app';

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const activePlan = await getActivePlan(admin);

  // No active subscription — send the merchant to the plan picker first.
  // This is what makes /app/plans the actual landing screen right after
  // install, instead of the dashboard rendering (unstyled/unusable) behind
  // a paywall nobody's hit yet. This stays inside the embedded app's own
  // iframe the whole way, so a normal server-side redirect is safe here —
  // this is NOT the Shopify billing confirmation redirect, which has to
  // break out to the top-level tab instead (see app.plans.jsx).
  if (!activePlan) {
    throw redirect('/app/plans');
  }

  return { activePlan };
};

export default function AppIndex() {
  const { activePlan } = useLoaderData();
  return <TierOneConsignmentApp activePlan={activePlan} />;
}
