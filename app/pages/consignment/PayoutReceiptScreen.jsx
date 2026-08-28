/* eslint-disable react/prop-types */

import { Mail, Printer, UserRound } from 'lucide-react';
import Header from '../../components/consignment/Header';
import { money } from '../../lib/consignmentHelpers';

function formatReceiptDate(value) {
  if (!value) return '—';

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function receiptItemLines(items) {
  return items.map((item) => {
    const salePrice = Number(item.salePrice ?? item.price ?? 0);
    const commissionRate = Number(item.commissionPct ?? 0);
    const earnings = Number(
      item.payoutAmount ?? (salePrice * commissionRate) / 100,
    );

    return [
      `${item.itemNumber || 'Item'} - ${item.description || item.type || 'Consignment item'}`,
      `Sale price: ${money(salePrice)}`,
      `Commission: ${commissionRate}%`,
      `Consignor earnings: ${money(earnings)}`,
    ].join('\n');
  });
}

function buildReceiptEmail(receipt) {
  const { consignor, payout, items } = receipt;
  const consignorName = `${consignor.firstName} ${consignor.lastName}`.trim();
  const itemLines = receiptItemLines(items);

  return [
    `Payout receipt ${payout.id}`,
    '',
    `Consignor: ${consignorName} (#${consignor.number})`,
    `Payout date: ${formatReceiptDate(payout.date)}`,
    `Payment method: ${payout.method}`,
    payout.reference ? `Reference: ${payout.reference}` : '',
    '',
    ...itemLines.flatMap((line) => [line, '']),
    `Adjustment: ${money(payout.adjustment || 0)}`,
    `Total paid: ${money(payout.total)}`,
    payout.note ? `Note: ${payout.note}` : '',
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join('\n');
}

export default function PayoutReceiptScreen({
  receipt,
  onBack,
  onOpenConsignor,
}) {
  const { consignor, payout, items } = receipt;
  const consignorName = `${consignor.firstName} ${consignor.lastName}`.trim();
  const emailBody = buildReceiptEmail(receipt);
  const emailSubject = `Payout receipt ${payout.id}`;
  const emailHref = consignor.email
    ? `mailto:${consignor.email}?subject=${encodeURIComponent(
        emailSubject,
      )}&body=${encodeURIComponent(emailBody)}`
    : '';

  return (
    <>
      <Header
        eyebrow={`Consignor #${consignor.number}`}
        title="Payout receipt"
        onBack={onBack}
      />

      <div className="consignment-body">
        <div className="consignment-form-shell">
          <section className="consignment-form-section">
            <div className="consignment-form-section-head">
              <span
                className="consignment-form-section-marker"
                aria-hidden="true"
              />

              <div>
                <h2>{consignorName}</h2>
                <p>Receipt {payout.id}</p>
              </div>
            </div>

            <div className="consignment-form-section-body">
              <div className="consignment-form-grid consignment-form-grid-3">
                <div className="consignment-form-field">
                  <span className="consignment-label">Payout date</span>
                  <strong>{formatReceiptDate(payout.date)}</strong>
                </div>

                <div className="consignment-form-field">
                  <span className="consignment-label">Payment method</span>
                  <strong>{payout.method}</strong>
                </div>

                <div className="consignment-form-field">
                  <span className="consignment-label">Reference</span>
                  <strong>{payout.reference || '—'}</strong>
                </div>
              </div>

              {payout.note && (
                <div className="consignment-form-field">
                  <span className="consignment-label">Payout note</span>
                  <div>{payout.note}</div>
                </div>
              )}
            </div>
          </section>

          <section className="consignment-form-section">
            <div className="consignment-form-section-head">
              <span
                className="consignment-form-section-marker"
                aria-hidden="true"
              />

              <div>
                <h2>Items paid</h2>
                <p>
                  {items.length} item{items.length === 1 ? '' : 's'} included
                </p>
              </div>
            </div>

            <div className="consignment-form-section-body">
              {items.map((item) => {
                const salePrice = Number(item.salePrice ?? item.price ?? 0);
                const commissionRate = Number(item.commissionPct ?? 0);
                const earnings = Number(
                  item.payoutAmount ??
                    (salePrice * commissionRate) / 100,
                );

                return (
                  <div className="consignment-card" key={item.id}>
                    <div className="consignment-section-title">
                      <div>
                        <h2>
                          {item.description ||
                            item.type ||
                            'Consignment item'}
                        </h2>
                        <p>{item.itemNumber || '—'}</p>
                      </div>

                      <strong>{money(earnings)}</strong>
                    </div>

                    <div className="consignment-form-grid consignment-form-grid-3">
                      <div className="consignment-form-field">
                        <span className="consignment-label">Sale price</span>
                        <strong>{money(salePrice)}</strong>
                      </div>

                      <div className="consignment-form-field">
                        <span className="consignment-label">Commission</span>
                        <strong>{commissionRate}%</strong>
                      </div>

                      <div className="consignment-form-field">
                        <span className="consignment-label">
                          Consignor earnings
                        </span>
                        <strong>{money(earnings)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="consignment-form-section">
            <div className="consignment-form-section-head">
              <span
                className="consignment-form-section-marker"
                aria-hidden="true"
              />

              <div>
                <h2>Payout total</h2>
              </div>
            </div>

            <div className="consignment-form-section-body">
              <div className="consignment-form-grid consignment-form-grid-2">
                <div className="consignment-form-field">
                  <span className="consignment-label">Adjustment</span>
                  <strong>{money(payout.adjustment || 0)}</strong>
                </div>

                <div className="consignment-form-field">
                  <span className="consignment-label">Total paid</span>
                  <strong>{money(payout.total)}</strong>
                </div>
              </div>
            </div>
          </section>

          <div className="consignment-form-grid consignment-form-grid-3">
            <button
              type="button"
              className="consignment-btn secondary"
              onClick={onOpenConsignor}
            >
              <UserRound size={17} />
              Consignor dashboard
            </button>

            <button
              type="button"
              className="consignment-btn secondary"
              onClick={() => window.print()}
            >
              <Printer size={17} />
              Print receipt
            </button>

            {emailHref ? (
              <a className="consignment-btn" href={emailHref}>
                <Mail size={17} />
                Email receipt
              </a>
            ) : (
              <button type="button" className="consignment-btn" disabled>
                <Mail size={17} />
                No email on file
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
