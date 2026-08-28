/* eslint-disable react/prop-types */

import { Mail, Printer, UserRound } from "lucide-react";
import Header from "../../components/consignment/Header";
import { money } from "../../lib/consignmentHelpers";
import "../../styles/payout-receipt.css";

function formatReceiptDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function itemAmounts(item) {
  const salePrice = Number(item.salePrice ?? item.price ?? 0);
  const commissionRate = Number(item.commissionPct ?? 0);
  const earnings = Number(
    item.payoutAmount ?? (salePrice * commissionRate) / 100,
  );
  return { salePrice, commissionRate, earnings };
}

function buildReceiptEmail(receipt) {
  const { consignor, payout, items } = receipt;
  const name = `${consignor.firstName} ${consignor.lastName}`.trim();
  const lines = items.flatMap((item) => {
    const { salePrice, commissionRate, earnings } = itemAmounts(item);
    return [
      `${item.itemNumber || "Item"} - ${item.description || item.type || "Consignment item"}`,
      `Sale price: ${money(salePrice)} | Commission: ${commissionRate}% | Earnings: ${money(earnings)}`,
      "",
    ];
  });

  return [
    `Payout receipt ${payout.id}`,
    `Consignor: ${name} (#${consignor.number})`,
    `Date: ${formatReceiptDate(payout.date)}`,
    `Payment: ${payout.method}${payout.reference ? ` | Reference: ${payout.reference}` : ""}`,
    "",
    ...lines,
    `Adjustment: ${money(payout.adjustment || 0)}`,
    `Total paid: ${money(payout.total)}`,
    payout.note ? `Note: ${payout.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function PayoutReceiptScreen({
  receipt,
  onBack,
  onOpenConsignor,
}) {
  const { consignor, payout, items } = receipt;
  const name = `${consignor.firstName} ${consignor.lastName}`.trim();
  const emailHref = consignor.email
    ? `mailto:${consignor.email}?subject=${encodeURIComponent(`Payout receipt ${payout.id}`)}&body=${encodeURIComponent(buildReceiptEmail(receipt))}`
    : "";

  return (
    <>
      <div className="consignment-receipt-screen-header">
        <Header
          eyebrow={`Consignor #${consignor.number}`}
          title="Payout receipt"
          onBack={onBack}
        />
      </div>

      <div className="consignment-body">
        <main className="consignment-payout-receipt">
          <header className="consignment-receipt-heading">
            <div>
              <span className="consignment-label">Payout receipt</span>
              <h1>{name}</h1>
              <p>Receipt {payout.id}</p>
            </div>
            <strong className="consignment-receipt-total">
              {money(payout.total)}
            </strong>
          </header>

          <dl className="consignment-receipt-meta">
            <div>
              <dt>Payout date</dt>
              <dd>{formatReceiptDate(payout.date)}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{payout.method || "—"}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{payout.reference || "—"}</dd>
            </div>
          </dl>

          <section className="consignment-receipt-items">
            <h2>
              Items paid <span>{items.length}</span>
            </h2>
            <div className="consignment-receipt-table-wrap">
              <table className="consignment-receipt-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Sale</th>
                    <th>Rate</th>
                    <th>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const { salePrice, commissionRate, earnings } =
                      itemAmounts(item);
                    return (
                      <tr key={item.id}>
                        <td>
                          <strong>
                            {item.description ||
                              item.type ||
                              "Consignment item"}
                          </strong>
                          <small>{item.itemNumber || "—"}</small>
                        </td>
                        <td>{money(salePrice)}</td>
                        <td>{commissionRate}%</td>
                        <td>
                          <strong>{money(earnings)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="consignment-receipt-summary">
            {payout.note && (
              <p>
                <strong>Note:</strong> {payout.note}
              </p>
            )}
            <div>
              <span>Adjustment</span>
              <strong>{money(payout.adjustment || 0)}</strong>
            </div>
            <div className="total">
              <span>Total paid</span>
              <strong>{money(payout.total)}</strong>
            </div>
          </section>

          <div className="consignment-receipt-actions">
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
        </main>
      </div>
    </>
  );
}
