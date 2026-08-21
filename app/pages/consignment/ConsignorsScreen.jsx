import { useState } from 'react';
import { FileUp, Download, Plus, ChevronDown, Search, Users, Grid3X3 } from 'lucide-react';
import { Header } from '../../components/consignment/SharedPieces';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import { productLabel, statusLabel } from '../../lib/consignmentHelpers';

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
          <div className="consignment-readable-grid">
            {filtered.map((item) => <ItemGridCardContainer key={item.id} item={item} consignor={consignorById[item.consignorId]} showConsignor onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onMarkSold={onMarkSold} onStartPayout={onStartPayout} />)}
          </div>
        )}
      </div>
    </>
  );
}
