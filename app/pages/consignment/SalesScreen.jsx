/* eslint-disable react/prop-types */
import { useState } from 'react';
import { ChevronDown, Download, Grid3X3, List, Search, Users } from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import { downloadCsv, productLabel } from '../../lib/consignmentHelpers';
import '../../styles/consignment-sales.css';

export default function SalesScreen({ items, consignors, onOpenItem, onOpenConsignor, onStartPayout }) {
  const [query, setQuery] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('All');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('list');
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));

  const sales = items.filter((item) => item.status === 'Sold' || item.dateSold || item.orderId);
  const unpaidCount = sales.filter((item) => !item.paidOut).length;
  const paidCount = sales.filter((item) => item.paidOut).length;

  const filtered = sales.filter((item) => {
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
    const matchesPayout = payoutFilter === 'All'
      || (payoutFilter === 'Paid' && item.paidOut)
      || (payoutFilter === 'Unpaid' && !item.paidOut);
    return matchesQuery && matchesConsignor && matchesProduct && matchesPayout;
  }).sort((a, b) => {
    const aConsignor = consignorById[a.consignorId];
    const bConsignor = consignorById[b.consignorId];
    const aPrice = Number(a.salePrice ?? a.price ?? 0);
    const bPrice = Number(b.salePrice ?? b.price ?? 0);
    const aDue = (aPrice * Number(a.commissionPct ?? aConsignor?.commissionPct ?? 0)) / 100;
    const bDue = (bPrice * Number(b.commissionPct ?? bConsignor?.commissionPct ?? 0)) / 100;
    if (sort === 'oldest') return String(a.dateSold || '').localeCompare(String(b.dateSold || ''));
    if (sort === 'price') return bPrice - aPrice;
    if (sort === 'due') return bDue - aDue;
    if (sort === 'consignor') return `${aConsignor?.lastName || ''} ${aConsignor?.firstName || ''}`.localeCompare(`${bConsignor?.lastName || ''} ${bConsignor?.firstName || ''}`);
    if (sort === 'sku') return String(a.itemNumber || '').localeCompare(String(b.itemNumber || ''), undefined, { numeric: true });
    return String(b.dateSold || '').localeCompare(String(a.dateSold || ''));
  });

  const grouped = filtered.reduce((groups, item) => {
    const key = item.consignorId || 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());

  const groupedEntries = Array.from(grouped.entries()).sort(([aId, aItems], [bId, bItems]) => {
    if (sort !== 'consignor') return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
    const a = consignorById[aId];
    const b = consignorById[bId];
    return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(`${b?.lastName || ''} ${b?.firstName || ''}`);
  });

  const totalSales = sales.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const totalUnpaid = sales.filter((item) => !item.paidOut).reduce((sum, item) => {
    const consignor = consignorById[item.consignorId];
    const salePrice = Number(item.salePrice ?? item.price ?? 0);
    return sum + (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
  }, 0);

  function exportSales() {
    const headers = ['SKU', 'Item', 'Consignor', 'Source', 'Sale price', 'Consignor due', 'Payout status', 'Date sold', 'Order'];
    const rows = filtered.map((item) => {
      const consignor = consignorById[item.consignorId];
      const price = Number(item.salePrice ?? item.price ?? 0);
      const due = (price * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
      return [item.itemNumber || '', item.description || '', consignor ? `${consignor.firstName} ${consignor.lastName}` : '', productLabel(item).text, price, due, item.paidOut ? 'Paid' : 'Unpaid', item.dateSold || '', item.orderName || ''];
    });
    downloadCsv(`sales-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <>
      <Header eyebrow="Sales ledger" title="Sales" action={<button className="consignment-btn secondary" type="button" onClick={exportSales}><Download size={16} /> Export</button>} />
      <div className="consignment-body">
        <div className="consignment-sales-summary-grid">
          <div className="consignment-card consignment-sales-summary-card"><span>Total sales</span><strong>${totalSales.toFixed(2)}</strong></div>
          <div className="consignment-card consignment-sales-summary-card"><span>Unpaid to consignors</span><strong>${totalUnpaid.toFixed(2)}</strong></div>
          <div className="consignment-card consignment-sales-summary-card"><span>Unpaid sales</span><strong>{unpaidCount}</strong></div>
          <div className="consignment-card consignment-sales-summary-card"><span>Paid sales</span><strong>{paidCount}</strong></div>
        </div>

        <div className="consignment-items-toolbar">
          <details className="consignment-items-filter-details">
            <summary className="consignment-items-filter-summary"><span>Filters &amp; sorting</span><ChevronDown size={20} aria-hidden="true" /></summary>
            <div className="consignment-items-toolbar-top">
              <label className="consignment-tool-field"><span>Consignor</span><select className="consignment-select consignment-filter-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)} aria-label="Filter by consignor"><option value="All">All consignors</option>{consignors.map((consignor) => <option key={consignor.id} value={consignor.id}>#{consignor.number} · {consignor.firstName} {consignor.lastName}</option>)}</select></label>
              <label className="consignment-tool-field"><span>Sort</span><select className="consignment-select consignment-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort sales"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price">Highest sale price</option><option value="due">Highest consignor due</option><option value="consignor">Consignor name</option><option value="sku">SKU / item number</option></select></label>
              <label className="consignment-tool-field"><span>Sale source</span><select className="consignment-select consignment-filter-select" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} aria-label="Filter by sale source"><option value="All">All sale sources</option><option value="Manual">Manual</option><option value="POS">POS</option><option value="Online">Online</option><option value="POS + Online">POS + Online</option></select></label>
              <label className="consignment-tool-field"><span>Payout status</span><select className="consignment-select consignment-filter-select" value={payoutFilter} onChange={(event) => setPayoutFilter(event.target.value)} aria-label="Filter by payout status"><option value="All">All payout statuses ({sales.length})</option><option value="Unpaid">Unpaid ({unpaidCount})</option><option value="Paid">Paid ({paidCount})</option></select></label>
            </div>
          </details>
          <div className="consignment-items-toolbar-bottom">
            <div className="consignment-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, brand, or consignor" /></div>
            <div className="consignment-tool-view"><span>View</span><div className="consignment-view-toggle consignment-finder-toggle" aria-label="Choose sales view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> All items</button>
              <button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
            </div></div>
          </div>
        </div>

        {filtered.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">No sales match these filters.</div></section>}

        {viewMode === 'list' && filtered.length > 0 && <AllListView items={filtered} consignors={consignors} onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onStartPayout={onStartPayout} />}

        {viewMode === 'grouped' && <div className="consignment-item-groups">{groupedEntries.map(([consignorId, consignorItems]) => <AllConsignorView key={consignorId} consignor={consignorById[consignorId]} items={consignorItems} itemLabel="sale" onOpenConsignor={onOpenConsignor} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />)}</div>}

        {viewMode === 'grid' && filtered.length > 0 && (
          <div className="consignment-readable-grid">
            {filtered.map((item) => <ItemGridCardContainer key={item.id} item={item} consignor={consignorById[item.consignorId]} showConsignor onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onStartPayout={onStartPayout} />)}
          </div>
        )}
      </div>
    </>
  );
}
