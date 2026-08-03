import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ShoppingBag } from 'lucide-react';
import ConsignmentIntakeApp from './consignment_intake';

function UpgradePanel({ compact = false }) {
  return (
    <div className={`tier1-upgrade-card ${compact ? 'compact' : ''}`}>
      <div className="tier1-upgrade-heading">
        <div>
          <span className="tier1-upgrade-kicker">Shopify Connected</span>
          <h3>{compact ? 'Connect this store to Shopify' : 'Connect your consignment items directly to Shopify'}</h3>
          <p>
            The Manual plan keeps consignors, items, sales, payouts, store credit, and history.
            Upgrade when you need Shopify products and automatic sales syncing.
          </p>
        </div>
        <span className="tier1-paid-badge">Paid feature</span>
      </div>

      <div className="tier1-feature-grid">
        <span><Check size={16} /> Product images</span>
        <span><Check size={16} /> Shopify products</span>
        <span><Check size={16} /> Shopify POS</span>
        <span><Check size={16} /> Inventory tracking</span>
        <span><Check size={16} /> Automatic sales detection</span>
      </div>

      <button type="button" className="tier1-upgrade-button">
        <ShoppingBag size={17} /> Upgrade to Shopify Connected
      </button>
    </div>
  );
}

export default function TierOneConsignmentApp() {
  const [intakeTarget, setIntakeTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    function locateTargets() {
      const intake = document.querySelector('.jatb-shopify-section .jatb-shopify-content');
      const edit = document.querySelector('.jatb-product-card');

      if (intake) intake.classList.add('tier1-upgrade-target');
      if (edit) edit.classList.add('tier1-edit-upgrade-target');

      setIntakeTarget(intake || null);
      setEditTarget(edit || null);
    }

    locateTargets();
    const observer = new MutationObserver(locateTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        /* Tier 1 is a normal branch-level app mode. No install scripts or source patching. */
        .jatb-intake-primary > .jatb-photo-wrap { display: none !important; }
        .jatb-intake-primary {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .jatb-intake-primary-fields {
          width: 100% !important;
          grid-template-columns: minmax(0, 1fr) minmax(150px, 240px) !important;
        }

        .jatb-shopify-section .jatb-shopify-summary .jatb-row-sub {
          color: var(--green-dark);
          font-weight: 700;
        }
        .jatb-shopify-section .jatb-shopify-summary .jatb-row-sub::before {
          content: 'Upgrade to Shopify Connected';
          font-size: 12px;
        }
        .jatb-shopify-section .jatb-shopify-summary .jatb-row-sub {
          font-size: 0;
        }

        .tier1-upgrade-target > *:not(.tier1-upgrade-card),
        .tier1-edit-upgrade-target > *:not(.tier1-upgrade-card) {
          display: none !important;
        }
        .tier1-edit-upgrade-target {
          pointer-events: auto !important;
          opacity: 1 !important;
          background: var(--surface) !important;
          border-color: var(--line) !important;
        }

        .tier1-upgrade-card { padding: 18px 0 2px; }
        .tier1-edit-upgrade-target .tier1-upgrade-card { padding: 4px; }
        .tier1-upgrade-heading {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 18px;
        }
        .tier1-upgrade-heading h3 {
          margin: 4px 0 7px !important; font-family: inherit !important;
          font-size: 18px; line-height: 1.25;
        }
        .tier1-upgrade-heading p {
          margin: 0; max-width: 720px; color: var(--muted);
          font-size: 13px; line-height: 1.55;
        }
        .tier1-upgrade-kicker {
          color: var(--green); font-size: 11px; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .tier1-paid-badge {
          flex: 0 0 auto; padding: 6px 10px; border-radius: 999px;
          background: var(--gold-soft); border: 1px solid #EFD7A8;
          color: #765600; font-size: 11px; font-weight: 700;
        }
        .tier1-feature-grid {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 16px; margin: 18px 0;
        }
        .tier1-feature-grid span {
          display: flex; align-items: center; gap: 8px;
          color: var(--ink); font-size: 13px; font-weight: 600;
        }
        .tier1-feature-grid svg { color: var(--green); }
        .tier1-upgrade-button {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 8px; border: 0; border-radius: 10px; padding: 13px 18px;
          background: var(--green); color: #fff; font: inherit;
          font-size: 14px; font-weight: 700;
        }

        /* The Tier 1 save action remains the existing metaobject save function. */
        .jatb-fab-wrap .jatb-btn { font-size: 0 !important; }
        .jatb-fab-wrap .jatb-btn::after {
          content: 'Save manual item'; font-size: 14px; font-weight: 600;
        }
        .jatb-fab-wrap .jatb-btn svg { width: 18px; height: 18px; }

        @media (max-width: 700px) {
          .jatb-intake-primary-fields { grid-template-columns: minmax(0, 1fr) !important; }
          .tier1-upgrade-heading { flex-direction: column; }
          .tier1-feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <ConsignmentIntakeApp />
      {intakeTarget && createPortal(<UpgradePanel />, intakeTarget)}
      {editTarget && createPortal(<UpgradePanel compact />, editTarget)}
    </>
  );
}
