import { authenticate } from '../shopify.server';
import { getHostedPricingUrl } from '../billing.server';

export const loader = async ({ request }) => {
  const { redirect, session } = await authenticate.admin(request);

  return redirect(
    getHostedPricingUrl(session.shop),
    {
      target: '_top',
    },
  );
};

export default function PlansRoute() {
  return null;
}
