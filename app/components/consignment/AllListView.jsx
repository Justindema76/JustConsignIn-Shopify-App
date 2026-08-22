/* eslint-disable react/prop-types */
import { money, productLabel, statusClass, statusLabel } from '../../lib/consignmentHelpers';
import { ItemRowAction } from './AllConsignorView';
import '../../styles/by-consignor-container.css';

export default function AllListView({ items, consignors = [], onOpenItem, onOpenConsignor, onMarkSold, onStartPayout }) {
  const consignorById = Object.fromEntries(consignors.map((c) => [c.id, c]));

  return (
    <>
      <div className="consignment-shared-scroll-hint" aria-hidden="true">Swipe to see more <span>→</span></div>
      <section className="consignment-card consignment-all-items-card">
        <div className="consignment-list-row consignment-list-head">
          <span>Item</span><span>SKU</span><span>Consignor</span><span>Price</span>
          <span>Commission</span><span>Expiry</span><span>Product</span><span>Status</span><span>Action</span>
        </div>
        {items.map((item) => {
          const consignor = consignorById[item.consignorId];
          const product = productLabel(item);
          const photo = item.shopifyPhoto || item.photo;
          return (
            <div className="consignment-all-item-row" key={item.id}>
              <button type="button" className="consignment-grouped-item-open" onClick={() => onOpenItem?.(item.id)}>
                {item.shopifyProductId && (
                  <span className={`consignment-batch-thumb ${photo ? '' : 'consignment-image-placeholder'}`}>
                    {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">No image</span>}
                  </span>
                )}
                <span>
                  <strong>{item.description || item.type || 'Consignment item'}</strong>
                  <span>{item.itemNumber}{item.size ? ` · ${item.size}` : ''}{item.brand ? ` · ${item.brand}` : ''}</span>
                  <span className="consignment-all-item-mobile-consignor">{consignor ? `${consignor.firstName} ${consignor.lastName}` : 'Unassigned'}</span>
                  <span className="consignment-all-item-mobile-expiry">Expiry: {item.expiryDate || '—'}</span>
                </span>
              </button>
              <strong>{item.itemNumber || '—'}</strong>
              {consignor ? (
                <button type="button" className="consignment-consignor-profile-link" onClick={() => onOpenConsignor?.(consignor.id)}>
                  {consignor.firstName} {consignor.lastName}
                </button>
              ) : <span>Unassigned</span>}
              <strong>{money(item.price)}</strong>
              <span>{item.commissionPct ?? consignor?.commissionPct ?? 0}%</span>
              <span className="consignment-expiry-date">{item.expiryDate || '—'}</span>
              <span className={`consignment-product-badge ${product.className}`}>{product.text}</span>
              <span className={`consignment-badge ${item.paidOut ? 'paid' : statusClass(item.status)}`}>
                {item.paidOut ? 'Paid' : statusLabel(item.status)}
              </span>
              <span className="consignment-item-quick-action">
                <ItemRowAction item={item} product={product} consignor={consignor} onOpenItem={onOpenItem} onMarkSold={onMarkSold} onStartPayout={onStartPayout} />
              </span>
            </div>
          );
        })}
      </section>
    </>
  );
}