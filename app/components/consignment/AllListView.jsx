/* eslint-disable react/prop-types */
import { money, productLabel, statusClass, statusLabel } from '../../lib/consignmentHelpers';
import '../../styles/by-consignor-container.css';

export default function AllListView({ items, consignors = [], onOpenItem, onOpenConsignor, renderAction = null }) {
  const consignorById = Object.fromEntries(consignors.map((c) => [c.id, c]));

  return (
    <section className="consignment-card consignment-all-items-card">
      <div className="consignment-list-row consignment-list-head">
        <span>Item</span><span>SKU</span><span>Consignor</span><span>Price</span>
        <span>Commission</span><span>Product</span><span>Status</span><span>Action</span>
      </div>
      {items.map((item) => {
        const consignor = consignorById[item.consignorId];
        const product = productLabel(item);
        const photo = item.shopifyPhoto || item.photo;
        return (
          <div className="consignment-all-item-row" key={item.id}>
            <button type="button" className="consignment-grouped-item-open" onClick={() => onOpenItem?.(item.id)}>
              {photo && (
                <span className="consignment-batch-thumb">
                  <img src={photo} alt="" />
                </span>
              )}
              <span>
                <strong>{item.description || item.type || 'Consignment item'}</strong>
                <span>{item.itemNumber}{item.size ? ` · ${item.size}` : ''}{item.brand ? ` · ${item.brand}` : ''}</span>
                <span className="consignment-all-item-mobile-consignor">{consignor ? `${consignor.firstName} ${consignor.lastName}` : 'Unassigned'}</span>
              </span>
            </button>
            <strong>{item.itemNumber || '—'}</strong>
            {consignor ? (
              <button type="button" className="consignment-consignor-profile-link" onClick={() => onOpenConsignor?.(consignor.id)}>
                {consignor.firstName} {consignor.lastName}
              </button>
            ) : <span>Unassigned</span>}
            <strong>{money(item.price)}</strong>
            <span>{item.commissionPct}%</span>
            <span className={`consignment-product-badge ${product.className}`}>{product.text}</span>
            <span className={`consignment-badge ${item.paidOut ? 'sold' : statusClass(item.status)}`}>
              {item.paidOut ? 'Paid · archived' : statusLabel(item.status)}
            </span>
            <span className="consignment-item-quick-action">
              {renderAction ? renderAction(item, product) : (
                <button type="button" className="consignment-item-open-btn" onClick={() => onOpenItem?.(item.id)}>Open item</button>
              )}
            </span>
          </div>
        );
      })}
    </section>
  );
}
