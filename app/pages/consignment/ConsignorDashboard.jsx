/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Grid3X3, List, Mail, MapPin, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import Header from '../../components/consignment/Header';
import AllListView from '../../components/consignment/AllListView';
import ItemGridCardContainer from '../../components/consignment/ItemGridCardContainer';
import { money } from '../../lib/consignmentHelpers';

export default function ConsignorDashboard({ consignor, items, onBack, onStartIntake, onOpenItem, onDeleteConsignor, onEditConsignor, onStartPayout }) {
  const [viewMode, setViewMode] = useState('grid');
  const [confirmingDeleteConsignor, setConfirmingDeleteConsignor] = useState(false);
  const consignorItems = items.filter((item) => item.consignorId === consignor.id);
  const visibleItems = consignorItems.filter((item) => !item.paidOut);
  const archivedCount = consignorItems.length - visibleItems.length;
  const draftCount = consignorItems.filter((item) => item.status === 'Draft').length;
  const soldItems = consignorItems.filter((item) => item.status === 'Sold' || item.dateSold);
  const unpaidItems = soldItems.filter((item) => !item.paidOut);
  const totalSales = soldItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const activeCount = consignorItems.filter((item) => ['Available', 'Active'].includes(item.status)).length;
  const amountDue = unpaidItems.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
    0,
  );
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
          <div className="consignment-consignor-items-tools">
            <span className="consignment-consignor-items-count">{visibleItems.length} current · {archivedCount} archived · {draftCount} draft</span>
            <div className="consignment-consignor-view-toggle" aria-label="Choose item view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={14} /> List</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={14} /> Grid</button>
            </div>
          </div>
        </div>

        {visibleItems.length === 0 && (
          <div className="consignment-empty">
            <h3>No items yet</h3>
            <p>Add what they brought in today.</p>
          </div>
        )}

        {visibleItems.length > 0 && viewMode === 'list' && (
          <AllListView items={visibleItems} consignors={[consignor]} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />
        )}

        {visibleItems.length > 0 && viewMode === 'grid' && (
          <div className="consignment-readable-grid">
            {visibleItems.map((item) => (
              <ItemGridCardContainer key={item.id} item={item} consignor={consignor} showConsignor={false} onOpenItem={onOpenItem} onStartPayout={onStartPayout} />
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
