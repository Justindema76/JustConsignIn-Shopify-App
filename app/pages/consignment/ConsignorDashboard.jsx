/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Grid3X3, List, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import ConsignmentFilterBar from '../../components/consignment/ConsignmentFilterBar';
import { isSold, money, saleSourceMatches } from '../../lib/consignmentHelpers';

export default function ConsignorDashboard({ consignor, items, onBack, onStartIntake, onOpenItem, onDeleteConsignor, onEditConsignor, onStartPayout }) {
  const [viewMode, setViewMode] = useState('grid');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [payoutFilter, setPayoutFilter] = useState('Unpaid');
  const [confirmingDeleteConsignor, setConfirmingDeleteConsignor] = useState(false);

  const consignorItems = items.filter((item) => item.consignorId === consignor.id);
  const currentCount = consignorItems.filter((item) => !item.paidOut).length;
  const draftCount = consignorItems.filter((item) => item.status === 'Draft').length;
  const soldItems = consignorItems.filter((item) => isSold(item));
  const availableItems = consignorItems.filter((item) => !isSold(item));
  const unpaidItems = soldItems.filter((item) => !item.paidOut);
  const paidItems = soldItems.filter((item) => item.paidOut);
  const unpaidCount = unpaidItems.length;
  const paidCount = paidItems.length;
  const archivedCount = paidCount;
  const totalSales = soldItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const activeCount = consignorItems.filter((item) => ['Available', 'Active'].includes(item.status)).length;
  const amountDue = unpaidItems.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
    0,
  );

  const filteredItems = consignorItems.filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${item.description || ''} ${item.itemNumber || ''} ${item.type || ''} ${item.brand || ''}`
      .toLowerCase()
      .includes(q);
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Available' && !isSold(item))
      || (statusFilter === 'Sold' && isSold(item));
    const matchesSource = saleSourceMatches(item, sourceFilter);
    const sold = isSold(item);
    const matchesPayout = !sold
      ? payoutFilter !== 'Paid'
      : payoutFilter === 'All'
        || (payoutFilter === 'Paid' && item.paidOut)
        || (payoutFilter === 'Unpaid' && !item.paidOut);

    return matchesQuery && matchesStatus && matchesSource && matchesPayout;
  }).sort((a, b) => {
    const itemDate = (item) => String(
      item.dateSold
      || item.dateReceived
      || item.createdAt
      || item.created_at
      || '',
    );
    const aPrice = Number(a.salePrice ?? a.price ?? 0);
    const bPrice = Number(b.salePrice ?? b.price ?? 0);
    const aDue = (aPrice * Number(a.commissionPct ?? consignor.commissionPct ?? 0)) / 100;
    const bDue = (bPrice * Number(b.commissionPct ?? consignor.commissionPct ?? 0)) / 100;

    if (sort === 'oldest') return itemDate(a).localeCompare(itemDate(b));
    if (sort === 'price') return bPrice - aPrice;
    if (sort === 'due') return bDue - aDue;
    if (sort === 'sku') {
      return String(a.itemNumber || '').localeCompare(
        String(b.itemNumber || ''),
        undefined,
        { numeric: true },
      );
    }

    return itemDate(b).localeCompare(itemDate(a));
  });
  const fullAddress = [consignor.address, consignor.city, consignor.province, consignor.postalCode]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <Header
        eyebrow={`Consignor #${consignor.number}`}
        title={`${consignor.firstName} ${consignor.lastName}`}
        onBack={onBack}
        action={(
          <div className="consignment-header-actions">
            <button className="consignment-btn" onClick={onStartIntake}>
              <Plus size={17} /> Add items
            </button>
            <button className="consignment-btn secondary" onClick={onEditConsignor}>
              <Pencil size={17} /> Edit
            </button>
            <button
              className="consignment-btn secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
              onClick={() => setConfirmingDeleteConsignor(true)}
            >
              <Trash2 size={17} /> Delete
            </button>
          </div>
        )}
      />
      <div className="consignment-body">
        <section className="consignment-card consignment-consignor-profile" aria-label="Consignor profile information">
          <div className="consignment-profile-column">
            <div className="consignment-profile-title">Contact</div>
            <div className="consignment-profile-row">
              <span className="consignment-profile-icon"><Phone size={17} /></span>
              <span className="consignment-profile-copy">
                <span className="consignment-profile-label">Phone</span>
                {consignor.phone ? <a className="consignment-profile-value consignment-profile-link" href={`tel:${String(consignor.phone).replace(/[^\d+]/g, '')}`}>{consignor.phone}</a> : <span className="consignment-profile-value">—</span>}
              </span>
            </div>
            <div className="consignment-profile-row">
              <span className="consignment-profile-icon"><Mail size={17} /></span>
              <span className="consignment-profile-copy">
                <span className="consignment-profile-label">Email</span>
                {consignor.email ? <a className="consignment-profile-value consignment-profile-link" href={`mailto:${consignor.email}`}>{consignor.email}</a> : <span className="consignment-profile-value">—</span>}
              </span>
            </div>
            <div className="consignment-profile-row">
              <span className="consignment-profile-icon"><MapPin size={17} /></span>
              <span className="consignment-profile-copy">
                <span className="consignment-profile-label">Address</span>
                {fullAddress ? <a className="consignment-profile-value consignment-profile-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">{fullAddress}</a> : <span className="consignment-profile-value">—</span>}
              </span>
            </div>
          </div>
          <div className="consignment-profile-column">
            <div className="consignment-profile-title">Account details</div>
            <div className="consignment-profile-row detail"><span className="consignment-profile-copy"><span className="consignment-profile-label">Commission split</span><span className="consignment-profile-value">Consignor gets {consignor.commissionPct}%</span></span></div>
            <div className="consignment-profile-row detail"><span className="consignment-profile-copy"><span className="consignment-profile-label">Joined</span><span className="consignment-profile-value">{consignor.dateJoined || '—'}</span></span></div>
            <div className="consignment-profile-row detail"><span className="consignment-profile-copy"><span className="consignment-profile-label">Unsold items</span><span className="consignment-profile-value">{consignor.unsoldPreference || 'Please return'}</span></span></div>
          </div>
        </section>

        <div className="consignment-consignor-stats">
          <div className="consignment-consignor-stat"><span>Amount due</span><strong>{money(amountDue)}</strong></div>
          <div className="consignment-consignor-stat"><span>Total sales</span><strong>{money(totalSales)}</strong></div>
          <div className="consignment-consignor-stat"><span>Active items</span><strong>{activeCount}</strong></div>
          <div className="consignment-consignor-stat"><span>Store credit</span><strong aria-label="Not available yet">&nbsp;</strong></div>
        </div>

        <div className="consignment-consignor-items-head">
          <h3>Items on file</h3>
          <span className="consignment-consignor-items-count">
            {currentCount} current · {archivedCount} archived · {draftCount} draft
          </span>
        </div>

        <ConsignmentFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: 'Search item, SKU, or brand',
          }}
          filters={[
            {
              key: 'sort',
              label: 'Sort',
              value: sort,
              onChange: setSort,
              ariaLabel: 'Sort consignor items',
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'price', label: 'Highest sale price' },
                { value: 'due', label: 'Highest consignor due' },
                { value: 'sku', label: 'SKU / item number' },
              ],
            },
            {
              key: 'itemStatus',
              label: 'Item status',
              value: statusFilter,
              onChange: setStatusFilter,
              ariaLabel: 'Filter by item status',
              options: [
                { value: 'All', label: `All item statuses (${consignorItems.length})` },
                { value: 'Available', label: `Available (${availableItems.length})` },
                { value: 'Sold', label: `Sold (${soldItems.length})` },
              ],
            },
            {
              key: 'source',
              label: 'Sale source',
              value: sourceFilter,
              onChange: setSourceFilter,
              ariaLabel: 'Filter by sale source',
              options: [
                { value: 'All', label: 'All sale sources' },
                { value: 'Manual', label: 'Manual' },
                { value: 'POS', label: 'POS' },
                { value: 'Online', label: 'Online' },
              ],
            },
            {
              key: 'payoutStatus',
              label: 'Payout status',
              value: payoutFilter,
              onChange: setPayoutFilter,
              ariaLabel: 'Filter by payout status',
              options: [
                { value: 'All', label: `All sold payout statuses (${soldItems.length})` },
                { value: 'Unpaid', label: `Unpaid sold (${unpaidCount})` },
                { value: 'Paid', label: `Paid / archived (${paidCount})` },
              ],
            },
          ]}
          views={{
            value: viewMode,
            onChange: setViewMode,
            ariaLabel: 'Choose consignor item view',
            options: [
              { value: 'list', label: 'List', icon: List },
              { value: 'grid', label: 'Grid', icon: Grid3X3 },
            ],
          }}
        />

        {filteredItems.length === 0 && (
          <div className="consignment-empty">
            <h3>No items match these filters</h3>
            <p>Change the search or filter selections to see other items.</p>
          </div>
        )}

        {filteredItems.length > 0 && viewMode === 'list' && (
          <AllListView saleSourceMode items={filteredItems} consignors={[consignor]} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />
        )}

        {filteredItems.length > 0 && viewMode === 'grid' && (
          <div className="consignment-readable-grid">
            {filteredItems.map((item) => (
              <ItemGridCardContainer saleSourceMode key={item.id} item={item} consignor={consignor} showConsignor={false} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />
            ))}
          </div>
        )}

        {confirmingDeleteConsignor && (
          <div className="consignment-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>Delete {consignor.firstName} {consignor.lastName} for good?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="consignment-btn secondary" style={{ padding: '8px 14px' }} onClick={() => setConfirmingDeleteConsignor(false)}>Cancel</button>
              <button className="consignment-btn danger" style={{ padding: '8px 14px' }} onClick={() => onDeleteConsignor(consignor.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
