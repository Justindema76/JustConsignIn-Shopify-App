/* eslint-disable react/prop-types */
import { useState } from 'react';
import { ChevronDown, Grid3X3, List, Search, Users } from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import { money } from '../../lib/consignmentHelpers';
import '../../styles/consignment-sales.css';

// This page shows only what currently needs to be paid — sold items that
// haven't been paid out. No payout history here; that lives elsewhere.
export default function PayoutsScreen({ items, consignors, onOpenItem, onOpenConsignor, onStartPayout }) {
  const [query, setQuery] = useState('');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [sort, setSort] = useState('amount');
  const [viewMode, setViewMode] = useState('grouped');
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));

  const owed = items.filter((item) => (item.status === 'Sold' || item.dateSold) && !item.paidOut);

  const dueForItem = (item) => {
    const consignor = consignorById[item.consignorId];
    return (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
  };

  const filtered = owed.filter((item) => {
    const q = query.trim().toLowerCase();
    const consignor = consignorById[item.consignorId];
    const matchesQuery = !q || `${item.description} ${item.itemNumber} ${item.type} ${item.brand || ''} ${consignor?.firstName || ''} ${consignor?.lastName || ''} ${consignor?.number || ''}`.toLowerCase().includes(q);
    const matchesConsignor = consignorFilter === 'All' || item.consignorId === consignorFilter;
    return matchesQuery && matchesConsignor;
  }).sort((a, b) => {
    const aConsignor = consignorById[a.consignorId];
    const bConsignor = consignorById[b.consignorId];
    if (sort === 'name') return `${aConsignor?.lastName || ''} ${aConsignor?.firstName || ''}`.localeCompare(`${bConsignor?.lastName || ''} ${bConsignor?.firstName || ''}`);
    if (sort === 'oldest') return String(a.dateSold || '').localeCompare(String(b.dateSold || ''));
    return dueForItem(b) - dueForItem(a);
  });

  const grouped = filtered.reduce((groups, item) => {
    const key = item.consignorId || 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());

  const dueForGroup = (groupItems) => groupItems.reduce((sum, item) => sum + dueForItem(item), 0);

  const groupedEntries = Array.from(grouped.entries()).sort(([aId, aItems], [bId, bItems]) => {
    if (sort === 'name') {
      const a = consignorById[aId];
      const b = consignorById[bId];
      return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(`${b?.lastName || ''} ${b?.firstName || ''}`);
    }
    if (sort === 'oldest') return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
    return dueForGroup(bItems) - dueForGroup(aItems);
  });

  const totalDue = filtered.reduce((sum, item) => sum + dueForItem(item), 0);
  const consignorsToPay = groupedEntries.length;

  return (
    <>
      <Header eyebrow="Payments" title="Payouts" />
      <div className="consignment-body">
        <div className="consignment-sales-summary-grid">
          <div className="consignment-card consignment-sales-summary-card"><span>Total due</span><strong>{money(totalDue)}</strong></div>
          <div className="consignment-card consignment-sales-summary-card"><span>Consignors to pay</span><strong>{consignorsToPay}</strong></div>
        </div>

        <div className="consignment-items-toolbar">
          <details className="consignment-items-filter-details">
            <summary className="consignment-items-filter-summary"><span>Filters &amp; sorting</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="consignment-items-toolbar-top">
              <label className="consignment-tool-field"><span>Consignor</span><select className="consignment-select consignment-filter-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)} aria-label="Filter by consignor"><option value="All">All consignors owed</option>{consignors.map((consignor) => <option key={consignor.id} value={consignor.id}>#{consignor.number} · {consignor.firstName} {consignor.lastName}</option>)}</select></label>
              <label className="consignment-tool-field"><span>Sort</span><select className="consignment-select consignment-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort payouts"><option value="amount">Highest amount due</option><option value="name">Consignor name</option><option value="oldest">Oldest unpaid sale</option></select></label>
            </div>
          </details>
          <div className="consignment-items-toolbar-bottom">
            <div className="consignment-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, SKU, or consignor" /></div>
            <div className="consignment-tool-view"><span>View</span><div className="consignment-view-toggle consignment-finder-toggle" aria-label="Choose payouts view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> All items</button>
              <button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
            </div></div>
          </div>
        </div>

        {filtered.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">Nothing outstanding — every sale is paid out.</div></section>}

        {viewMode === 'list' && filtered.length > 0 && <AllListView items={filtered} consignors={consignors} onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onStartPayout={onStartPayout} />}

        {viewMode === 'grouped' && <div className="consignment-item-groups">{groupedEntries.map(([consignorId, consignorItems]) => <AllConsignorView key={consignorId} consignor={consignorById[consignorId]} items={consignorItems} itemLabel="unpaid sale" onOpenConsignor={onOpenConsignor} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />)}</div>}

        {viewMode === 'grid' && filtered.length > 0 && (
          <div className="consignment-readable-grid">
            {filtered.map((item) => <ItemGridCardContainer key={item.id} item={item} consignor={consignorById[item.consignorId]} showConsignor onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onStartPayout={onStartPayout} />)}
          </div>
        )}
      </div>
    </>
  );
}
