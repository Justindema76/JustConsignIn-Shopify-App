import { useState } from 'react';
import { FileUp, Download, Plus, ChevronDown, Search, Users, Grid3X3 } from 'lucide-react';
import { Header } from '../../components/consignment/SharedPieces';
import AllConsignorView, { ItemAction } from '../../components/consignment/AllConsignorView';
import { money, productLabel, statusClass, statusLabel } from '../../lib/consignmentHelpers';

const consignorsGridCss = `
.consignment-consignors-page-grid { display:grid; grid-template-columns:repeat(auto-fill,148px); gap:8px; justify-content:start; align-items:start; }
.consignment-consignors-page-card { width:148px; border:1px solid var(--line); border-radius:9px; background:var(--surface); overflow:hidden; min-width:0; }
.consignment-consignors-page-image { width:100%; height:78px; border:0; border-bottom:1px solid var(--line); background:#F4F6F8; display:block; padding:0; overflow:hidden; cursor:pointer; }
.consignment-consignors-page-image-wrapper { width:100%; height:100%; display:grid; place-items:center; overflow:hidden; }
.consignment-consignors-page-image img { display:block; width:100%; height:100%; max-width:100%; max-height:100%; object-fit:contain; object-position:center; }
.consignment-consignors-page-placeholder { color:var(--muted); font-size:9px; font-weight:700; }
.consignment-consignors-page-body { padding:8px; display:grid; gap:5px; overflow:hidden; }
.consignment-consignors-page-title { border:0; background:transparent; padding:0; color:var(--ink); font-size:11px; font-weight:800; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }
.consignment-consignors-page-sub { color:var(--muted); font-size:8px; }
.consignment-consignors-page-body .consignment-consignor-profile-link { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:9px; font-weight:700; }
.consignment-consignors-page-meta { display:grid; grid-template-columns:1fr; gap:7px; }
.consignment-consignors-page-meta span { min-width:0; }
.consignment-consignors-page-meta small,.consignment-consignors-page-meta strong { display:block; }
.consignment-consignors-page-meta small { color:var(--muted); font-size:7px; }
.consignment-consignors-page-meta strong { font-size:10px; margin-top:1px; }
.consignment-consignors-page-badges { display:flex; flex-wrap:wrap; gap:3px; min-height:17px; }
.consignment-consignors-page-badges .consignment-product-badge,.consignment-consignors-page-badges .consignment-badge { min-width:0; padding:3px 5px; font-size:6px; }
.consignment-consignors-page-card .consignment-quick-sold-btn,.consignment-consignors-page-card .consignment-grid-open-btn,.consignment-consignors-page-card .consignment-sales-pay-btn { width:100%; min-width:0; padding:6px; font-size:9px; }
@media (max-width:640px) {
  .consignment-consignors-page-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; justify-content:stretch; }
  .consignment-consignors-page-card { width:100%; }
  .consignment-consignors-page-image { height:78px; }
  .consignment-consignors-page-body { padding:8px; }
}
`;

export default function ConsignorsScreen({ consignors, items, query, setQuery, onOpenConsignor, onOpenItem, onMarkSold, onStartPayout, onNewConsignor, onNewItem, onImport, onExport }) {
  const [filter, setFilter] = useState('All');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sort, setSort] = useState('consignor');
  const [viewMode, setViewMode] = useState('grouped');
  const statuses = ['All', 'Draft', 'Available', 'Sold', 'Archived', 'Returned', 'Donated'];
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    const consignor = consignorById[item.consignorId];
    const matchesQuery = !q || `${item.description} ${item.itemNumber} ${item.type} ${item.brand || ''} ${consignor?.firstName || ''} ${consignor?.lastName || ''} ${consignor?.number || ''}`.toLowerCase().includes(q);
    const matchesConsignor = consignorFilter === 'All' || item.consignorId === consignorFilter;
    const product = productLabel(item);
    const matchesProduct = productFilter === 'All'
      || (productFilter === 'Manual' && product.className === 'manual')
      || (productFilter === 'POS' && product.text === 'POS')
      || (productFilter === 'Online' && product.text === 'Online')
      || (productFilter === 'POS + Online' && product.text === 'POS + Online');
    const matchesStatus = filter === 'All'
      ? true
      : filter === 'Archived'
        ? item.paidOut
        : filter === 'Available'
          ? item.status === 'Available' || item.status === 'Active'
          : item.status === filter && !item.paidOut;
    return matchesQuery && matchesConsignor && matchesProduct && matchesStatus;
  }).sort((a, b) => {
    if (sort === 'oldest') return String(a.dateReceived || '').localeCompare(String(b.dateReceived || ''));
    if (sort === 'consignor') {
      const aName = `${consignorById[a.consignorId]?.lastName || ''} ${consignorById[a.consignorId]?.firstName || ''}`;
      const bName = `${consignorById[b.consignorId]?.lastName || ''} ${consignorById[b.consignorId]?.firstName || ''}`;
      return aName.localeCompare(bName) || String(a.itemNumber || '').localeCompare(String(b.itemNumber || ''), undefined, { numeric: true });
    }
    if (sort === 'ticket') return String(a.itemNumber || '').localeCompare(String(b.itemNumber || ''), undefined, { numeric: true });
    if (sort === 'priceHigh') return Number(b.price || 0) - Number(a.price || 0);
    if (sort === 'priceLow') return Number(a.price || 0) - Number(b.price || 0);
    return String(b.dateReceived || '').localeCompare(String(a.dateReceived || '')) || String(b.itemNumber || '').localeCompare(String(a.itemNumber || ''), undefined, { numeric: true });
  });

  const grouped = filtered.reduce((groups, item) => {
    const key = item.consignorId || 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());

  if (filter === 'All' && productFilter === 'All') {
    const q = query.trim().toLowerCase();
    for (const consignor of consignors) {
      if (grouped.has(consignor.id)) continue;
      if (consignorFilter !== 'All' && consignor.id !== consignorFilter) continue;
      const matchesQuery = !q || `${consignor.firstName || ''} ${consignor.lastName || ''} ${consignor.number || ''}`.toLowerCase().includes(q);
      if (!matchesQuery) continue;
      grouped.set(consignor.id, []);
    }
  }

  const groupedEntries = Array.from(grouped.entries()).sort(([aId, aItems], [bId, bItems]) => {
    if (sort !== 'consignor') return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
    const a = consignorById[aId];
    const b = consignorById[bId];
    return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(`${b?.lastName || ''} ${b?.firstName || ''}`);
  });

  return (
    <>
      <style>{consignorsGridCss}</style>
      <Header eyebrow="Accounts" title="Consignors" action={(
        <div className="consignment-header-actions consignment-consignors-header-actions">
          <details className="consignment-data-menu"><summary><FileUp size={16} /> Data</summary><div className="consignment-data-menu-popover"><button type="button" onClick={onImport}><FileUp size={15} /> Import CSV</button><button type="button" onClick={onExport}><Download size={15} /> Export CSV</button></div></details>
          <button className="consignment-btn secondary" type="button" onClick={onNewItem}><Plus size={16} /> New item</button>
          <button className="consignment-btn" type="button" onClick={onNewConsignor}><Plus size={17} /> New consignor</button>
        </div>
      )} />

      <div className="consignment-body">
        <div className="consignment-items-toolbar">
          <details className="consignment-items-filter-details">
            <summary className="consignment-items-filter-summary"><span>Filters &amp; sorting</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="consignment-items-toolbar-top">
              <label className="consignment-tool-field"><span>Consignor</span><select className="consignment-select consignment-filter-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)} aria-label="Filter by consignor"><option value="All">All consignors</option>{consignors.map((consignor) => <option key={consignor.id} value={consignor.id}>#{consignor.number} · {consignor.firstName} {consignor.lastName}</option>)}</select></label>
              <label className="consignment-tool-field"><span>Sort</span><select className="consignment-select consignment-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort items"><option value="consignor">Consignor name</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="ticket">SKU / item number</option><option value="priceHigh">Price high to low</option><option value="priceLow">Price low to high</option></select></label>
              <label className="consignment-tool-field"><span>Product type</span><select className="consignment-select consignment-filter-select" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} aria-label="Filter by product type"><option value="All">All product types</option><option value="Manual">Manual</option><option value="POS">POS</option><option value="Online">Online</option><option value="POS + Online">POS + Online</option></select></label>
              <label className="consignment-tool-field"><span>Status</span><select id="consignor-status-filter" className="consignment-select consignment-filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>{statuses.map((status) => {
                const count = status === 'All' ? items.length : status === 'Archived' ? items.filter((item) => item.paidOut).length : items.filter((item) => item.status === status && !item.paidOut).length;
                return <option key={status} value={status}>{statusLabel(status)} ({count})</option>;
              })}</select></label>
            </div>
          </details>
          <div className="consignment-items-toolbar-bottom">
            <div className="consignment-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, brand, or consignor" /></div>
            <div className="consignment-tool-view"><span>View</span><div className="consignment-view-toggle consignment-finder-toggle" aria-label="Choose consignor view">
              <button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
            </div></div>
          </div>
        </div>

        {viewMode === 'grouped' && groupedEntries.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">No consignors match these filters.</div></section>}
        {viewMode === 'grid' && filtered.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">No items match these filters.</div></section>}

        {viewMode === 'grouped' && <div className="consignment-item-groups">{groupedEntries.map(([consignorId, consignorItems]) => <AllConsignorView key={consignorId} consignor={consignorById[consignorId]} items={consignorItems} onOpenConsignor={onOpenConsignor} onOpenItem={onOpenItem} onMarkSold={onMarkSold} onStartPayout={onStartPayout} />)}</div>}

        {viewMode === 'grid' && filtered.length > 0 && (
          <div className="consignment-consignors-page-grid">
            {filtered.map((item) => {
              const consignor = consignorById[item.consignorId];
              const product = productLabel(item);
              const photo = item.shopifyPhoto || item.photo;
              return (
                <article className="consignment-consignors-page-card" key={item.id}>
                  {item.shopifyProductId && (
                    <button type="button" className="consignment-consignors-page-image" onClick={() => onOpenItem?.(item.id)}>
                      <span className="consignment-consignors-page-image-wrapper">
                        {photo ? <img src={photo} alt="" /> : <span className="consignment-consignors-page-placeholder">No image</span>}
                      </span>
                    </button>
                  )}
                  <div className="consignment-consignors-page-body">
                    <button type="button" className="consignment-consignors-page-title" onClick={() => onOpenItem?.(item.id)}>{item.description || item.type || 'Consignment item'}</button>
                    <span className="consignment-consignors-page-sub">SKU {item.itemNumber || '—'}{item.size ? ` · ${item.size}` : ''}{item.brand ? ` · ${item.brand}` : ''}</span>
                    {consignor ? <button type="button" className="consignment-consignor-profile-link" onClick={() => onOpenConsignor?.(consignor.id)}>{consignor.firstName} {consignor.lastName}</button> : <span className="consignment-consignors-page-sub">Unassigned</span>}
                    <div className="consignment-consignors-page-meta"><span><small>Price</small><strong>{money(item.price)}</strong></span><span><small>Commission</small><strong>{item.commissionPct ?? consignor?.commissionPct ?? 0}%</strong></span></div>
                    <div className="consignment-consignors-page-badges"><span className={`consignment-product-badge ${product.className}`}>{product.text}</span><span className={`consignment-badge ${item.paidOut ? 'paid' : statusClass(item.status)}`}>{item.paidOut ? 'Paid' : statusLabel(item.status)}</span></div>
                    <ItemAction item={item} product={product} consignor={consignor} onMarkSold={onMarkSold} onStartPayout={onStartPayout} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
