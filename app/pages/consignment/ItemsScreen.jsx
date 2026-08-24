/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Grid3X3, List, Plus, Users } from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import ConsignmentFilterBar from '../../components/consignment/ConsignmentFilterBar';
import { productLabel } from '../../lib/consignmentHelpers';

// Status filter: Current, Available, Sold, Archived only. "Available"
// covers both the stored "Draft" status and true "Available"/"Active"
// statuses in one option — those used to be two separate list entries
// that both displayed as "Available", which looked like a duplicate.
// "Returned" and "Donated" aren't statuses items actually carry in this
// app's data model, so they're dropped rather than left as dead filters.
const STATUS_OPTIONS = ['Current', 'Available', 'Sold', 'Archived'];

function matchesStatusFilter(item, filter) {
  if (filter === 'Current') return !item.paidOut;
  if (filter === 'Archived') return item.paidOut;
  if (filter === 'Available') return item.status === 'Available' || item.status === 'Active' || item.status === 'Draft';
  return item.status === filter && !item.paidOut;
}

function statusCount(items, filter) {
  return items.filter((item) => matchesStatusFilter(item, filter)).length;
}

export default function ItemsScreen({ items, consignors, onOpenItem, onOpenConsignor, onMarkSold, onStartPayout, onNewItem }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Current');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sort, setSort] = useState('consignor');
  const [viewMode, setViewMode] = useState('list');
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
    return matchesQuery && matchesConsignor && matchesProduct && matchesStatusFilter(item, statusFilter);
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

  const groupedEntries = Array.from(grouped.entries()).sort(([aId, aItems], [bId, bItems]) => {
    if (sort !== 'consignor') return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
    const a = consignorById[aId];
    const b = consignorById[bId];
    return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(`${b?.lastName || ''} ${b?.firstName || ''}`);
  });

  return (
    <>
      <Header eyebrow="Inventory" title="Items" action={<button className="consignment-btn" type="button" onClick={onNewItem}><Plus size={17} /> Add new item</button>} />
      <div className="consignment-body">
        <ConsignmentFilterBar
          search={{
            value: query,
            onChange: setQuery,
            placeholder: 'Search name, SKU, brand, or consignor',
          }}
          filters={[
            {
              key: 'consignor',
              label: 'Consignor',
              value: consignorFilter,
              onChange: setConsignorFilter,
              ariaLabel: 'Filter by consignor',
              options: [
                { value: 'All', label: 'All consignors' },
                ...consignors.map((c) => ({ value: c.id, label: `#${c.number} · ${c.firstName} ${c.lastName}` })),
              ],
            },
            {
              key: 'sort',
              label: 'Sort',
              value: sort,
              onChange: setSort,
              ariaLabel: 'Sort items',
              options: [
                { value: 'consignor', label: 'Consignor name' },
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'ticket', label: 'SKU / item number' },
                { value: 'priceHigh', label: 'Price high to low' },
                { value: 'priceLow', label: 'Price low to high' },
              ],
            },
            {
              key: 'product',
              label: 'Product type',
              value: productFilter,
              onChange: setProductFilter,
              ariaLabel: 'Filter by product type',
              options: [
                { value: 'All', label: 'All product types' },
                { value: 'Manual', label: 'Manual' },
                { value: 'POS', label: 'POS' },
                { value: 'Online', label: 'Online' },
                { value: 'POS + Online', label: 'POS + Online' },
              ],
            },
            {
              key: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              ariaLabel: 'Filter by status',
              options: STATUS_OPTIONS.map((status) => ({
                value: status,
                label: `${status} (${statusCount(items, status)})`,
              })),
            },
          ]}
          views={{
            value: viewMode,
            onChange: setViewMode,
            ariaLabel: 'Choose item view',
            options: [
              { value: 'list', label: 'All items', icon: List },
              { value: 'grouped', label: 'By consignor', icon: Users },
              { value: 'grid', label: 'Grid', icon: Grid3X3 },
            ],
          }}
        />

        {filtered.length === 0 && <section className="consignment-card"><div className="consignment-empty-small">No items match these filters.</div></section>}

        {viewMode === 'list' && filtered.length > 0 && <AllListView items={filtered} consignors={consignors} onOpenItem={onOpenItem} onOpenConsignor={onOpenConsignor} onMarkSold={onMarkSold} onStartPayout={onStartPayout} />}

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
