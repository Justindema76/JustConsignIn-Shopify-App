/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  ChevronDown, Clock, Grid3X3, List, Search, Users,
} from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import { money, recordedPayoutGroups } from '../../lib/consignmentHelpers';
import '../../styles/consignment-payouts.css';

function OwedTab({ items, consignors, onOpenItem, onOpenConsignor, onStartPayout }) {
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
      <div className="consignment-payouts-summary-grid">
        <div className="consignment-card consignment-payouts-summary-card"><span>Total due</span><strong>{money(totalDue)}</strong></div>
        <div className="consignment-card consignment-payouts-summary-card"><span>Consignors to pay</span><strong>{consignorsToPay}</strong></div>
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
    </>
  );
}

function HistoryTab({ items, consignors, onOpenConsignor }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [expanded, setExpanded] = useState(() => new Set());
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));

  const groups = recordedPayoutGroups(items).map((group) => {
    const consignor = consignorById[group.consignorId] || consignorById[group.items[0]?.consignorId];
    const total = group.payoutTotal || group.items.reduce((sum, item) => sum + Number(item.payoutAmount || 0), 0);
    return { ...group, consignor, total };
  });

  const filtered = groups.filter((group) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const name = group.consignor ? `${group.consignor.firstName} ${group.consignor.lastName} #${group.consignor.number}` : '';
    return `${name} ${group.payoutMethod} ${group.payoutReference}`.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sort === 'oldest') return String(a.payoutDate || '').localeCompare(String(b.payoutDate || ''));
    if (sort === 'amount') return b.total - a.total;
    return String(b.payoutDate || '').localeCompare(String(a.payoutDate || ''));
  });

  const totalPaid = groups.reduce((sum, group) => sum + group.total, 0);

  function toggle(payoutId) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(payoutId)) next.delete(payoutId); else next.add(payoutId);
      return next;
    });
  }

  return (
    <>
      <div className="consignment-payouts-summary-grid">
        <div className="consignment-card consignment-payouts-summary-card"><span>Total paid out</span><strong>{money(totalPaid)}</strong></div>
        <div className="consignment-card consignment-payouts-summary-card"><span>Payouts recorded</span><strong>{groups.length}</strong></div>
      </div>

      <div className="consignment-items-toolbar">
        <div className="consignment-items-toolbar-bottom">
          <div className="consignment-search"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search consignor, method, or reference" /></div>
          <label className="consignment-tool-field"><span>Sort</span><select className="consignment-select consignment-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort payout history"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option></select></label>
        </div>
      </div>

      {filtered.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">No payouts recorded yet.</div></section>}

      {filtered.length > 0 && (
        <div className="consignment-payouts-history-list">
          {filtered.map((group) => {
            const isOpen = expanded.has(group.payoutId);
            return (
              <div key={group.payoutId} className="consignment-payouts-history-card">
                <button type="button" className="consignment-payouts-history-summary" onClick={() => toggle(group.payoutId)} aria-expanded={isOpen}>
                  <span className="consignment-payouts-history-who">
                    {group.consignor ? (
                      <>
                        <strong>{group.consignor.firstName} {group.consignor.lastName}</strong>
                        <span>#{group.consignor.number}</span>
                      </>
                    ) : (
                      <strong>Unknown consignor</strong>
                    )}
                  </span>
                  <span className="consignment-payouts-history-meta">
                    <strong>{group.payoutDate || '—'}</strong>
                    <span>{group.payoutMethod || 'Method not recorded'}{group.payoutReference ? ` · ${group.payoutReference}` : ''}</span>
                  </span>
                  <span className="consignment-payouts-history-amount">
                    <strong>{money(group.total)}</strong>
                    <span>{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                  </span>
                  <ChevronDown size={18} className={`consignment-payouts-history-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="consignment-payouts-history-items">
                    {group.items.map((item) => (
                      <div key={item.id} className="consignment-payouts-history-item">
                        <span className="consignment-payouts-history-item-main">
                          <strong>{item.description || item.itemNumber}</strong>
                          <span>{item.itemNumber}</span>
                        </span>
                        <span className="consignment-payouts-history-item-sale">{money(item.salePrice ?? item.price)}</span>
                        <span className="consignment-payouts-history-item-earned">{money(item.payoutAmount)}</span>
                      </div>
                    ))}
                    {Boolean(group.payoutAdjustment) && (
                      <div className="consignment-payouts-history-if-adjustment">
                        <span>Manual adjustment</span>
                        <span>{money(group.payoutAdjustment)}</span>
                      </div>
                    )}
                    {group.consignor && (
                      <div style={{ padding: '10px 0 12px' }}>
                        <button type="button" className="consignment-link-button" onClick={() => onOpenConsignor?.(group.consignor.id)}>
                          View consignor
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// "Owed" shows only what currently needs to be paid. "History" shows every
// payout that has already been recorded, grouped the same way the Reports
// payout-ledger export groups them (recordedPayoutGroups), so the two never
// disagree on what counts as a completed payout.
export default function PayoutsScreen({ items, consignors, onOpenItem, onOpenConsignor, onStartPayout }) {
  const [tab, setTab] = useState('owed');

  return (
    <>
      <Header eyebrow="Payments" title="Payouts" />
      <div className="consignment-body">
        <div className="consignment-payouts-tabs" role="tablist" aria-label="Payouts view">
          <button type="button" role="tab" aria-selected={tab === 'owed'} className={`consignment-payouts-tab ${tab === 'owed' ? 'active' : ''}`} onClick={() => setTab('owed')}>
            <Users size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Owed
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} className={`consignment-payouts-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <Clock size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} /> History
          </button>
        </div>

        {tab === 'owed' && (
          <OwedTab items={items} consignors={consignors} onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onStartPayout={onStartPayout} />
        )}
        {tab === 'history' && (
          <HistoryTab items={items} consignors={consignors} onOpenConsignor={onOpenConsignor} />
        )}
      </div>
    </>
  );
}
