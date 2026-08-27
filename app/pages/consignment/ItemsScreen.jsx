/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  ChevronDown,
  Grid3X3,
  List,
  Plus,
  Search,
  Users,
} from 'lucide-react';

import Header from '../../components/consignment/Header';
import AllConsignorView from '../../components/consignment/AllConsignorView';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import {
  isSold,
  productLabel,
  statusLabel,
} from '../../lib/consignmentHelpers';

export default function ItemsScreen({
  items,
  consignors,
  onOpenItem,
  onOpenConsignor,
  onMarkSold,
  onStartPayout,
  onNewItem,
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Available');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sort, setSort] = useState('consignor');
  const [viewMode, setViewMode] = useState('list');

  const statuses = [
    'Available',
    'Sold',
    'Archived',
    'Returned',
    'Donated',
  ];

  const consignorById = Object.fromEntries(
    consignors.map((entry) => [entry.id, entry]),
  );

  const filtered = items
    .filter((item) => {
      const q = query.trim().toLowerCase();
      const consignor = consignorById[item.consignorId];

      const matchesQuery =
        !q ||
        `${item.description} ${item.itemNumber} ${item.type} ${item.brand || ''} ${consignor?.firstName || ''} ${consignor?.lastName || ''} ${consignor?.number || ''}`
          .toLowerCase()
          .includes(q);

      const matchesConsignor =
        consignorFilter === 'All' || item.consignorId === consignorFilter;

      const product = productLabel(item);
      const matchesProduct =
        productFilter === 'All' ||
        (productFilter === 'Manual' && product.className === 'manual') ||
        (productFilter === 'POS' && product.text === 'POS') ||
        (productFilter === 'Online' && product.text === 'Online') ||
        (productFilter === 'POS + Online' && product.text === 'POS + Online');

      const matchesStatus =
        filter === 'Archived'
          ? item.paidOut
          : filter === 'Available'
            ? !item.paidOut
              && !isSold(item)
              && ['Draft', 'Available', 'Active'].includes(item.status)
            : filter === 'Sold'
              ? !item.paidOut && isSold(item)
              : item.status === filter && !item.paidOut;

      return (
        matchesQuery &&
        matchesConsignor &&
        matchesProduct &&
        matchesStatus
      );
    })
    .sort((a, b) => {
      if (sort === 'oldest') {
        return String(a.dateReceived || '').localeCompare(
          String(b.dateReceived || ''),
        );
      }

      if (sort === 'consignor') {
        const aName =
          `${consignorById[a.consignorId]?.lastName || ''} ${consignorById[a.consignorId]?.firstName || ''}`;
        const bName =
          `${consignorById[b.consignorId]?.lastName || ''} ${consignorById[b.consignorId]?.firstName || ''}`;

        return (
          aName.localeCompare(bName) ||
          String(a.itemNumber || '').localeCompare(
            String(b.itemNumber || ''),
            undefined,
            { numeric: true },
          )
        );
      }

      if (sort === 'ticket') {
        return String(a.itemNumber || '').localeCompare(
          String(b.itemNumber || ''),
          undefined,
          { numeric: true },
        );
      }

      if (sort === 'priceHigh') {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      if (sort === 'priceLow') {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      return (
        String(b.dateReceived || '').localeCompare(
          String(a.dateReceived || ''),
        ) ||
        String(b.itemNumber || '').localeCompare(
          String(a.itemNumber || ''),
          undefined,
          { numeric: true },
        )
      );
    });

  const grouped = filtered.reduce((groups, item) => {
    const key = item.consignorId || 'unassigned';

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
    return groups;
  }, new Map());

  const groupedEntries = Array.from(grouped.entries()).sort(
    ([aId, aItems], [bId, bItems]) => {
      if (sort !== 'consignor') {
        return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
      }

      const a = consignorById[aId];
      const b = consignorById[bId];

      return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(
        `${b?.lastName || ''} ${b?.firstName || ''}`,
      );
    },
  );

  return (
    <>
      <Header
        eyebrow="Inventory"
        title="Items"
        action={(
          <button
            className="consignment-btn"
            type="button"
            onClick={onNewItem}
          >
            <Plus size={17} /> Add new item
          </button>
        )}
      />

      <div className="consignment-body">
        <div className="consignment-items-toolbar">
          <details className="consignment-items-filter-details">
            <summary className="consignment-items-filter-summary">
              <span>Filters &amp; sorting</span>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>

            <div className="consignment-items-toolbar-top">
              <label className="consignment-tool-field">
                <span>Consignor</span>
                <select
                  className="consignment-select consignment-filter-select"
                  value={consignorFilter}
                  onChange={(event) =>
                    setConsignorFilter(event.target.value)
                  }
                  aria-label="Filter by consignor"
                >
                  <option value="All">All consignors</option>
                  {consignors.map((consignor) => (
                    <option key={consignor.id} value={consignor.id}>
                      #{consignor.number} · {consignor.firstName}{' '}
                      {consignor.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="consignment-tool-field">
                <span>Sort</span>
                <select
                  className="consignment-select consignment-filter-select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort items"
                >
                  <option value="consignor">Consignor name</option>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="ticket">SKU / item number</option>
                  <option value="priceHigh">Price high to low</option>
                  <option value="priceLow">Price low to high</option>
                </select>
              </label>

              <label className="consignment-tool-field">
                <span>Product type</span>
                <select
                  className="consignment-select consignment-filter-select"
                  value={productFilter}
                  onChange={(event) =>
                    setProductFilter(event.target.value)
                  }
                  aria-label="Filter by product type"
                >
                  <option value="All">All product types</option>
                  <option value="Manual">Manual</option>
                  <option value="POS">POS</option>
                  <option value="Online">Online</option>
                  <option value="POS + Online">POS + Online</option>
                </select>
              </label>

              <label className="consignment-tool-field">
                <span>Status</span>
                <select
                  id="item-status-filter"
                  className="consignment-select consignment-filter-select"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  {statuses.map((status) => {
                    const count =
                      status === 'Archived'
                        ? items.filter((item) => item.paidOut).length
                        : status === 'Available'
                          ? items.filter(
                              (item) =>
                                !item.paidOut
                                && !isSold(item)
                                && ['Draft', 'Available', 'Active'].includes(item.status),
                            ).length
                          : status === 'Sold'
                            ? items.filter((item) => !item.paidOut && isSold(item)).length
                            : items.filter(
                                (item) =>
                                  item.status === status && !item.paidOut,
                              ).length;

                    return (
                      <option key={status} value={status}>
                        {statusLabel(status)} ({count})
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
          </details>

          <div className="consignment-items-toolbar-bottom">
            <div className="consignment-search">
              <Search size={19} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, SKU, brand, or consignor"
              />
            </div>

            <div className="consignment-tool-view">
              <span>View</span>
              <div
                className="consignment-view-toggle consignment-finder-toggle"
                aria-label="Choose item view"
              >
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={16} /> All items
                </button>

                <button
                  type="button"
                  className={viewMode === 'grouped' ? 'active' : ''}
                  onClick={() => setViewMode('grouped')}
                  aria-pressed={viewMode === 'grouped'}
                >
                  <Users size={16} /> By consignor
                </button>

                <button
                  type="button"
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3X3 size={16} /> Grid
                </button>
              </div>
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <section className="consignment-card">
            <div className="consignment-empty-small">
              No items match these filters.
            </div>
          </section>
        )}

        {viewMode === 'list' && filtered.length > 0 && (
          <AllListView
            items={filtered}
            consignors={consignors}
            onOpenItem={onOpenItem}
            onOpenConsignor={onOpenConsignor}
            onMarkSold={onMarkSold}
            onStartPayout={onStartPayout}
          />
        )}

        {viewMode === 'grouped' && (
          <div className="consignment-item-groups">
            {groupedEntries.map(([consignorId, consignorItems]) => (
              <AllConsignorView
                key={consignorId}
                consignor={consignorById[consignorId]}
                items={consignorItems}
                onOpenConsignor={onOpenConsignor}
                onOpenItem={onOpenItem}
                onMarkSold={onMarkSold}
                onStartPayout={onStartPayout}
              />
            ))}
          </div>
        )}

        {viewMode === 'grid' && (
          <div className="consignment-readable-grid">
            {filtered.map((item) => (
              <ItemGridCardContainer
                key={item.id}
                item={item}
                consignor={consignorById[item.consignorId]}
                onOpenItem={onOpenItem}
                onOpenConsignor={onOpenConsignor}
                onMarkSold={onMarkSold}
                onStartPayout={onStartPayout}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
