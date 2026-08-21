/* eslint-disable react/prop-types */
import { money, productLabel, statusClass, statusLabel } from '../../lib/consignmentHelpers';
import { ItemAction } from './AllConsignorView';
import '../../styles/by-consignor-container.css';

export default function ItemGridCardContainer({
  item,
  consignor,
  showConsignor = true,
  onOpenItem,
  onOpenConsignor,
  onMarkSold,
  onStartPayout,
}) {
  const product = productLabel(item);
  const photo = item.shopifyPhoto || item.photo;
  const isSold = item.status === 'Sold' || Boolean(item.dateSold);
  const salePrice = Number(item.salePrice ?? item.price ?? 0);
  const commissionPct = Number(item.commissionPct ?? consignor?.commissionPct ?? 0);
  const consignorDue = (salePrice * commissionPct) / 100;

  return (
    <article className="consignment-readable-card">
      <div className="consignment-readable-card-top">
        <button type="button" className="consignment-grid-item-open" onClick={() => onOpenItem?.(item.id)}>
          <div className="consignment-grid-thumb-row">
            {photo && (
              <span className="consignment-grid-thumb">
                <img src={photo} alt="" />
              </span>
            )}
            <span className="consignment-readable-title-copy">
              <strong>{item.description || item.type || 'Consignment item'}</strong>
              <small className="consignment-readable-card-sku">
                <b>SKU {item.itemNumber || '—'}</b>
                {item.size ? <span> · {item.size}</span> : null}
                {item.brand ? <span> · {item.brand}</span> : null}
              </small>
            </span>
          </div>
        </button>

        <span className={`consignment-product-badge ${product.className}`}>{product.text}</span>
      </div>

      {showConsignor && (
        consignor ? (
          <button type="button" className="consignment-readable-consignor-link" onClick={() => onOpenConsignor?.(consignor.id)}>
            {consignor.firstName} {consignor.lastName}
          </button>
        ) : (
          <span className="consignment-readable-consignor-link consignment-grid-unassigned">Unassigned</span>
        )
      )}

      <div className="consignment-readable-card-meta consignment-sales-money-rows">
        {isSold ? (
          <>
            <span><small>Sale price</small><strong>{money(salePrice)}</strong></span>
            <span><small>Consignor due</small><strong>{money(consignorDue)}</strong></span>
          </>
        ) : (
          <>
            <span><small>Price</small><strong>{money(item.price)}</strong></span>
            <span><small>Commission</small><strong>{commissionPct}%</strong></span>
          </>
        )}
      </div>

      <div className="consignment-readable-card-details consignment-grid-status-action-row">
        <span className="consignment-grid-status-copy">
          <small>{isSold ? 'Sale date' : 'Status'}</small>
          {isSold && <strong>{item.dateSold || 'Sold'}</strong>}
        </span>
        <span className={`consignment-badge ${item.paidOut ? 'paid' : statusClass(item.status)}`}>
          {item.paidOut ? 'Paid' : statusLabel(item.status)}
        </span>
        <span className="consignment-item-quick-action consignment-grid-inline-action">
          <ItemAction
            item={item}
            product={product}
            consignor={consignor}
            onOpenConsignor={onOpenConsignor}
            onMarkSold={onMarkSold}
            onStartPayout={onStartPayout}
          />
        </span>
      </div>

      {item.expiryDate && <div className="consignment-sales-grid-order">Expiry {item.expiryDate}</div>}
    </article>
  );
}
