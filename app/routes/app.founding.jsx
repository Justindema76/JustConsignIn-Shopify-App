import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { authenticate } from '../shopify.server';
import {
  approveFoundingAccess,
  getFoundingStats,
  isFoundingAdmin,
  listFoundingAccess,
  rejectFoundingAccess,
} from '../founding.server';
import '../styles/pricing-plans.css';

function requireOwner(shop) {
  if (!isFoundingAdmin(shop)) {
    throw new Response('Not found', { status: 404 });
  }
}

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  requireOwner(session.shop);

  const [entries, stats] = await Promise.all([
    listFoundingAccess(),
    getFoundingStats(),
  ]);

  return { entries, stats };
};

export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    requireOwner(session.shop);

    const formData = await request.formData();
    const intent = String(formData.get('intent') || '');
    const shop = String(formData.get('shop') || '');

    if (intent === 'approve') {
      const access = await approveFoundingAccess(shop);
      return { success: `${access.shop} approved as Founding Member #${access.position}.` };
    }

    if (intent === 'reject') {
      const access = await rejectFoundingAccess(shop);
      return { success: `${access.shop} was not approved.` };
    }

    return { error: 'Unknown approval action.' };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default function FoundingAdminRoute() {
  const { entries, stats } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const busy = navigation.state === 'submitting';

  const pending = entries.filter((entry) => entry.status === 'PENDING');
  const approved = entries
    .filter((entry) => entry.status === 'APPROVED')
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  const rejected = entries.filter((entry) => entry.status === 'REJECTED');

  return (
    <div className="pricing-page">
      <div className="pricing-wrap">
        <p className="pricing-eyebrow">Owner administration</p>
        <h1>Founding Members</h1>
        <p className="pricing-sub">
          You control every permanent free account. Approvals stop automatically at 20.
        </p>

        <div className="pricing-card featured" style={{ marginBottom: 24 }}>
          <div className="pricing-card-top">
            <h3 className="pricing-card-name">
              {stats.approved} of {stats.limit} approved
            </h3>
            <span className="pricing-badge">
              {stats.remaining} spots remaining
            </span>
          </div>
          <p className="pricing-desc">
            {stats.pending} request{stats.pending === 1 ? '' : 's'} waiting for your decision.
          </p>
        </div>

        {actionData?.success && (
          <div className="pricing-error" role="status">
            <p>{actionData.success}</p>
          </div>
        )}

        {actionData?.error && (
          <div className="pricing-error">
            <p>{actionData.error}</p>
          </div>
        )}

        <h2>Pending approval</h2>
        {pending.length === 0 ? (
          <div className="pricing-card" style={{ marginBottom: 24 }}>
            <p className="pricing-desc">No stores are waiting for approval.</p>
          </div>
        ) : (
          pending.map((entry) => (
            <div className="pricing-card" style={{ marginBottom: 16 }} key={entry.id}>
              <div className="pricing-card-top">
                <div>
                  <p className="pricing-eyebrow" style={{ marginBottom: 6 }}>Store</p>
                  <h3 className="pricing-card-name">{entry.shop}</h3>
                </div>
                <span className="pricing-badge">Pending</span>
              </div>
              <p className="pricing-desc">
                Requested {new Date(entry.requestedAt).toLocaleString()}.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Form method="post">
                  <input type="hidden" name="intent" value="approve" />
                  <input type="hidden" name="shop" value={entry.shop} />
                  <button
                    type="submit"
                    className="pricing-cta primary"
                    disabled={busy || stats.full}
                  >
                    Approve permanent free access
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="reject" />
                  <input type="hidden" name="shop" value={entry.shop} />
                  <button type="submit" className="pricing-cta" disabled={busy}>
                    Decline
                  </button>
                </Form>
              </div>
            </div>
          ))
        )}

        <h2>Approved founding stores</h2>
        {approved.length === 0 ? (
          <div className="pricing-card" style={{ marginBottom: 24 }}>
            <p className="pricing-desc">No founding stores approved yet.</p>
          </div>
        ) : (
          approved.map((entry) => (
            <div className="pricing-card" style={{ marginBottom: 12 }} key={entry.id}>
              <div className="pricing-card-top">
                <h3 className="pricing-card-name">{entry.shop}</h3>
                <span className="pricing-badge">Founding #{entry.position}</span>
              </div>
              <p className="pricing-desc">$0 permanently — full JustConsignIn access.</p>
            </div>
          ))
        )}

        {rejected.length > 0 && (
          <>
            <h2>Declined requests</h2>
            {rejected.map((entry) => (
              <div className="pricing-card muted" style={{ marginBottom: 12 }} key={entry.id}>
                <div className="pricing-card-top">
                  <h3 className="pricing-card-name">{entry.shop}</h3>
                  <span className="pricing-badge">Declined</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
