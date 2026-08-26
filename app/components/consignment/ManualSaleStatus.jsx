/* eslint-disable react/prop-types */

import { useState } from 'react';
import '../../styles/consignment-global.css';

export default function ManualSaleStatus({
  item,
  onMarkSold,
  money,
}) {
  const [statusSaving, setStatusSaving] = useState(false);
  const [salePrice, setSalePrice] = useState(item.salePrice ?? item.price ?? '');
  const [dateSold] = useState(item.dateSold || new Date().toISOString().slice(0, 10));
  const [soldLocally, setSoldLocally] = useState(
    item.status === 'Sold' || Boolean(item.dateSold),
  );

  const isSold =
    soldLocally ||
    item.status === 'Sold' ||
    Boolean(item.dateSold);

  const isPaid = item.paidOut === true;

  async function handleSold() {
    if (statusSaving || !onMarkSold || salePrice === '') return;

    setStatusSaving(true);

    try {
      await onMarkSold(item.id, {
        salePrice,
        dateSold,
      });

      setSoldLocally(true);
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="consignment-status-card">
      {!isSold && (
        <div className="consignment-manual-sale">
          <div className="consignment-manual-sale-copy">
            <strong>Manual sale</strong>
            <span>Only use for a sale outside Shopify.</span>
          </div>

          <div className="consignment-manual-sale-controls">
            <div className="consignment-field">
              <label className="consignment-label">Sale price</label>

              <input
                className="consignment-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                disabled={statusSaving}
              />
            </div>

            <button
              type="button"
              className="consignment-btn consignment-sold-btn"
              disabled={statusSaving || salePrice === ''}
              onClick={handleSold}
            >
              {statusSaving ? 'Saving…' : 'Sold'}
            </button>
          </div>
        </div>
      )}

      {isSold && !isPaid && (
        <div className="consignment-sold-status">
          <span className="consignment-badge unpaid">
            Sold · unpaid
          </span>

          <span className="consignment-row-sub">
            Waiting in Payouts for payment.
          </span>
        </div>
      )}

      {isPaid && (
        <div className="consignment-status-actions">
          <span className="consignment-badge paid">
            Paid
          </span>

          <span className="consignment-paid-detail">
            {item.payoutDate || ''}
            {' · '}
            {item.payoutMethod || 'Payment recorded'}
            {' · '}
            {money?.(item.payoutAmount)}
          </span>
        </div>
      )}
    </div>
  );
}
