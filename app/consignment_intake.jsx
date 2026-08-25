/* eslint-disable react/prop-types, jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import {
  Plus, Camera, Image, X, ChevronRight, Phone, Mail,
  Loader2, Tag, Check, Trash2, ShoppingBag, LayoutDashboard,
  Users, ReceiptText, WalletCards, PackageSearch, TrendingUp, CircleDollarSign,
  CalendarDays, FileUp, Download, MapPin, Pencil, List, Grid3X3, ArrowUp,
} from 'lucide-react';
import {
  createConsignor,
  createConsignmentItems,
  deleteConsignor,
  syncShopifyProduct,
  deleteConsignmentItem,
  getConsignmentData,
  recordConsignorPayout,
  searchShopifyCategories,
  updateConsignmentItem,
  updateConsignmentItemStatus,
  updateConsignor,
  importConsignmentData,
} from './consignmentApi';
import ReportsScreen from './pages/consignment/ReportsScreen';
import DashboardScreen from './pages/consignment/DashboardScreen';
import ItemsScreen from './pages/consignment/ItemsScreen';
import Header from './components/consignment/Header';
import ConsignorsScreen from './pages/consignment/ConsignorsScreen';
import SalesScreen from './pages/consignment/SalesScreen';
import PayoutsScreen from './pages/consignment/PayoutsScreen';
import ConsignorDashboard from './pages/consignment/ConsignorDashboard';
import CreateConsignorScreen from './pages/consignment/CreateConsignorScreen';
import ConsignmentFilterBar from './components/consignment/ConsignmentFilterBar';
import './styles/consignment-global.css';
/* ============================================================================
   STYLING
   All app CSS is external. This intake file contains no embedded GlobalStyle().
   Shared app styles: ./styles/consignment-global.css
   Shared filter/search/view styles: ./styles/consignment-filter-bar.css
   ============================================================================ */
import { csvValue, downloadCsv, money } from './lib/consignmentHelpers';

/* ---------- image helper ---------- */

function resizeImage(file, maxWidth = 320, quality = 0.55) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result !== 'string') {
        reject(new Error('Could not read this image'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CATEGORIES = [
  'Clothing', 'Shoes', 'Jewellery', 'Handbags', 'Home Décor', 'Furniture',
  'Electronics', 'Appliances', 'Books', 'Movies & Music', 'Video Games',
  'Collectibles', 'Sporting Goods', 'Tools', 'Toys', 'Baby Gear',
  'Pet Supplies', 'Outdoor & Garden', 'Art', 'Automotive', 'Other',
];
const CONDITIONS = ['New with tags', 'Like new', 'Good', 'Fair'];

function buildShopifyDefaults(item = {}, consignor = null) {
  const description = String(item.description || '').trim();
  const brand = String(item.brand || '').trim();
  const size = String(item.size || '').trim();
  const condition = String(item.condition || '').trim();
  const category = String(item.category || '').trim();
  const type = String(item.type || '').trim();
  const hasEnteredItem = Boolean(
    description
    || brand
    || size
    || type
    || (item.price !== '' && item.price !== null && item.price !== undefined),
  );

  if (!hasEnteredItem) {
    return {
      shopifyTitle: '',
      shopifyPrice: '',
      vendor: '',
      tags: '',
      productDescription: '',
      seoTitle: '',
      seoDescription: '',
    };
  }

  const tags = [...new Set([
    'Consignment',
    consignor?.number ? `Consignor ${consignor.number}` : '',
    category,
    type,
    brand,
    condition,
  ].filter(Boolean))].join(', ');

  const productDescription = [
    description,
    brand ? `Brand: ${brand}` : '',
    size ? `Size: ${size}` : '',
    condition ? `Condition: ${condition}` : '',
    category ? `Category: ${category}` : '',
  ].filter(Boolean).join('\n');

  const seoDescription = [
    description,
    brand ? `Brand: ${brand}` : '',
    size ? `Size: ${size}` : '',
    condition ? `Condition: ${condition}` : '',
  ].filter(Boolean).join(' · ').slice(0, 320);

  return {
    shopifyTitle: description,
    shopifyPrice: item.price ?? '',
    vendor: brand,
    tags,
    productDescription,
    seoTitle: description,
    seoDescription,
  };
}

function productLabel(item) {
  if (!item?.shopifyProductId) return { text: 'Manual', className: 'manual' };

  const productStatus = String(item.shopifyProductStatus || '').toUpperCase();
  if (productStatus && productStatus !== 'ACTIVE') {
    return { text: 'Shopify Draft', className: 'draft' };
  }

  return item.publishOnline
    ? { text: 'POS + Online', className: 'online' }
    : { text: 'POS', className: 'pos' };
}

/* ---------- small components ---------- */

// Shopify's App Bridge (loaded via AppProvider) exposes window.shopify.environment
// with a `mobile` boolean — true when running inside the Shopify Mobile app's
// WebView, false in a desktop/browser admin session.
// https://shopify.dev/docs/api/app-home/apis/authentication-and-data/environment-api
// App Bridge initializes asynchronously after its <script> tag loads, so we
// poll briefly rather than assume it's ready on first render. Defaults to
// "desktop unconfirmed = hide" so the button never briefly flashes on mobile
// while App Bridge is still starting up.
function useIsDesktopAdmin() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    function check() {
      if (cancelled) return;
      const environment = window.shopify?.environment;
      if (environment) {
        setIsDesktop(!environment.mobile);
        return;
      }
      attempts += 1;
      if (attempts < 20) setTimeout(check, 100);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return isDesktop;
}

async function handlePhotoFile(e, onChange) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await resizeImage(file);
  onChange(dataUrl);
}

async function searchShopifyFiles(search = '') {
  const params = new URLSearchParams();
  params.set('files', search.trim());
  const response = await fetch(`/api/consignment?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'Could not load Shopify Files.');
  }
  return Array.isArray(payload.files) ? payload.files : [];
}

function ShopifyFilePickerModal({ onClose, onSelect }) {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingFiles(true);
      setFileError('');
      try {
        const results = await searchShopifyFiles(search);
        if (!cancelled) setFiles(results);
      } catch (error) {
        if (!cancelled) {
          setFiles([]);
          setFileError(error instanceof Error ? error.message : 'Could not load Shopify Files.');
        }
      } finally {
        if (!cancelled) setLoadingFiles(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.48)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose from Shopify Files"
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 16,
          borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <strong style={{ display: 'block', fontSize: 16 }}>Choose from Shopify Files</strong>
            <span className="consignment-row-sub">Select an image already stored in Shopify Content → Files.</span>
          </div>
          <button
            type="button"
            className="consignment-batch-remove"
            onClick={onClose}
            aria-label="Close Shopify Files"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
          <input
            className="consignment-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Shopify Files"
            autoFocus
          />
        </div>

        <div style={{ padding: 16, overflowY: 'auto' }}>
          {loadingFiles && (
            <div className="consignment-empty-small">
              <Loader2 className="consignment-spin" size={18} /> Loading Shopify Files…
            </div>
          )}

          {!loadingFiles && fileError && (
            <div className="consignment-empty-small" style={{ color: 'var(--danger)' }}>
              {fileError}
            </div>
          )}

          {!loadingFiles && !fileError && files.length === 0 && (
            <div className="consignment-empty-small">No Shopify images found.</div>
          )}

          {!loadingFiles && !fileError && files.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 12,
            }}>
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelect(file)}
                  style={{
                    minWidth: 0,
                    padding: 8,
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    borderRadius: 8,
                    background: 'var(--green-soft)',
                  }}>
                    <img
                      src={file.url}
                      alt={file.alt || file.filename || ''}
                      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </span>
                  <span
                    title={file.filename || file.alt || 'Shopify image'}
                    style={{
                      display: 'block',
                      marginTop: 7,
                      overflow: 'hidden',
                      color: 'var(--ink)',
                      fontSize: 11,
                      fontWeight: 700,
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.filename || file.alt || 'Shopify image'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoPicker({ value, onChange, onChooseShopify }) {
  const [showShopifyFiles, setShowShopifyFiles] = useState(false);

  return (
    <>
      <div className="consignment-photo-wrap">
        <label className="consignment-photo-btn">
          {value ? (
            <img src={value} alt="Item" />
          ) : (
            <>
              <Camera size={20} />
              <span>Take Photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoFile(e, onChange)}
          />
        </label>

        <label className="consignment-photo-alt">
          {value ? 'Retake or choose' : 'Choose from library'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoFile(e, onChange)}
          />
        </label>

        <button
          type="button"
          className="consignment-photo-alt"
          onClick={() => setShowShopifyFiles(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            cursor: 'pointer',
          }}
        >
          <Image size={15} />
          Choose from Shopify Files
        </button>
      </div>

      {showShopifyFiles && (
        <ShopifyFilePickerModal
          onClose={() => setShowShopifyFiles(false)}
          onSelect={(file) => {
            onChooseShopify(file);
            setShowShopifyFiles(false);
          }}
        />
      )}
    </>
  );
}

function statusClass(status) {
  return String(status || 'Draft').toLowerCase();
}

// Display-only relabel: the stored status value stays "Draft" (so existing
// data and filters keep working) but manual items show "Available" instead.
function statusLabel(status) {
  const value = status || 'Draft';
  return value === 'Draft' ? 'Available' : value;
}

function AppNavigation({ view, onNavigate }) {
  const entries = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['home', 'Consignors', Users],
    ['items', 'Items', PackageSearch],
    ['sales', 'Sales', ReceiptText],
    ['payouts', 'Payouts', WalletCards],
    ['reports', 'Reports', TrendingUp],
  ];

  return (
    <nav className="consignment-main-nav" aria-label="Consignment manager">
      <div className="consignment-brand">
        <span className="consignment-brand-mark"><Tag size={18} /></span>
        JustConsignIn
      </div>
      {entries.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          className={`consignment-nav-button ${view === key ? 'active' : ''}`}
          onClick={() => onNavigate(key)}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function CreatePayoutScreen({ consignor, items, onBack, onRecordPayout }) {
  const eligible = items.filter(
    (item) => item.consignorId === consignor.id && (item.status === 'Sold' || item.dateSold) && !item.paidOut,
  );
  const [selectedIds, setSelectedIds] = useState(() => eligible.map((item) => item.id));
  const [adjustment, setAdjustment] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState('E-transfer');
  const [reference, setReference] = useState('');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const selected = eligible.filter((item) => selectedIds.includes(item.id));
  const itemTotal = selected.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
    0,
  );
  const payoutTotal = itemTotal + Number(adjustment || 0);

  function toggleItem(id) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    ));
  }

  return (
    <>
      <Header eyebrow={`Consignor #${consignor.number}`} title="Create payout" onBack={onBack} />
      <div className="consignment-body consignment-payout-create-body">
        <div className="consignment-section-grid">
          <section>
            <div className="consignment-card">
              <div className="consignment-section-title">
                <div>
                  <h2>{consignor.firstName} {consignor.lastName}</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                    Default commission: {consignor.commissionPct}%
                  </p>
                </div>
                <div className="consignment-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
              </div>
            </div>

            <div className="consignment-card">
              <div className="consignment-section-title">
                <div>
                  <h2>Items in this payout</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                    Select the eligible sales to include.
                  </p>
                </div>
                <button
                  type="button"
                  className="consignment-link-button"
                  onClick={() => setSelectedIds(selectedIds.length === eligible.length ? [] : eligible.map((item) => item.id))}
                >
                  {selectedIds.length === eligible.length ? 'Exclude all' : 'Select all'}
                </button>
              </div>

              {eligible.length === 0 && <div className="consignment-empty-small">This consignor has no eligible unpaid sales.</div>}
              {eligible.map((item) => {
                const salePrice = Number(item.salePrice ?? item.price ?? 0);
                const rate = Number(item.commissionPct ?? consignor.commissionPct ?? 0);
                const due = (salePrice * rate) / 100;
                return (
                  <label key={item.id} className="consignment-row-btn" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                    />
                    <span className="consignment-item-primary" style={{ flex: 1 }}>
                      <span className="consignment-batch-thumb">
                        {item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}
                      </span>
                      <span>
                        <strong>{item.description || item.itemNumber}</strong>
                        <span>{item.orderName || item.itemNumber} · {money(salePrice)} × {rate}%</span>
                      </span>
                    </span>
                    <strong>{money(due)}</strong>
                  </label>
                );
              })}
            </div>
          </section>

          <aside>
            <div className="consignment-card">
              <div className="consignment-section-title"><h2>Payout summary</h2></div>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Selected sales</span><strong>{selected.length}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consignor earnings</span><strong>{money(itemTotal)}</strong></div>
                <div className="consignment-field" style={{ margin: '4px 0 0' }}>
                  <label className="consignment-label">Manual adjustment</label>
                  <input className="consignment-input" type="number" inputMode="decimal" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="0.00" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 16 }}>
                  <strong>Amount due</strong><strong>{money(payoutTotal)}</strong>
                </div>
              </div>
            </div>
            <div className="consignment-card">
              <div className="consignment-field">
                <label className="consignment-label">Payment method</label>
                <select className="consignment-select" value={method} onChange={(event) => setMethod(event.target.value)}>
                  <option>E-transfer</option><option>Cash</option><option>Cheque</option><option>Store credit</option><option>Other</option>
                </select>
              </div>
              {method === 'Store credit' && (
                <div className="consignment-store-credit-note">
                  <CircleDollarSign size={17} />
                  <span>This records the amount as store credit in the payout ledger and on each linked Shopify product.</span>
                </div>
              )}
              <div className="consignment-payout-fields">
                <div className="consignment-field">
                  <label className="consignment-label">Payout date</label>
                  <input className="consignment-input" type="date" value={payoutDate} onChange={(event) => setPayoutDate(event.target.value)} />
                </div>
                <div className="consignment-field">
                  <label className="consignment-label">Reference</label>
                  <input
                    className="consignment-input"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder={method === 'Store credit' ? 'Credit memo or note' : 'Optional confirmation #'}
                  />
                </div>
              </div>
              <label className="consignment-label">Payout note</label>
              <textarea className="consignment-textarea" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional payment reference or note" />
            </div>
            <button
              type="button"
              className="consignment-btn"
              disabled={!selected.length || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onRecordPayout({
                    consignorId: consignor.id,
                    itemIds: selectedIds,
                    adjustment: Number(adjustment || 0),
                    payoutDate,
                    method,
                    reference,
                    note,
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <WalletCards size={17} /> Record payout
            </button>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ---------- screens ---------- */

function ChooseConsignorScreen({ consignors, onBack, onChoose, onCreate }) {
  const [search, setSearch] = useState('');
  const filtered = consignors.filter((consignor) => {
    const query = search.trim().toLowerCase();
    return !query || `${consignor.firstName} ${consignor.lastName} ${consignor.number}`
      .toLowerCase()
      .includes(query);
  });

  return (
    <>
      <Header eyebrow="New item" title="Choose consignor" onBack={onBack} />
      <div className="consignment-body">
        <button type="button" className="consignment-quick-action primary" onClick={onCreate} style={{ width: '100%', marginBottom: 14 }}>
          <span className="consignment-quick-action-icon"><Plus size={19} /></span>
          <span className="consignment-quick-action-copy">
            <strong>Create new consignor</strong>
            <span>Add their details, then continue directly to the item</span>
          </span>
        </button>

        <ConsignmentFilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Search name or consignor number',
          }}
        />

        {filtered.map((consignor) => (
          <button
            key={consignor.id}
            type="button"
            className="consignment-row-btn"
            onClick={() => onChoose(consignor.id)}
          >
            <div className="consignment-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
            <div className="consignment-row-main">
              <div className="consignment-row-name">{consignor.firstName} {consignor.lastName}</div>
              <div className="consignment-row-sub">Consignor #{consignor.number}</div>
            </div>
            <ChevronRight size={18} className="consignment-chev" />
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="consignment-empty">
            <h3>No matching consignor</h3>
            <p>Create a new consignor to continue.</p>
          </div>
        )}
      </div>
    </>
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field.trim()); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.');
  const headers = rows[0].map((value) => value.toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function exportConsignors(consignors) {
  const headers = ['number', 'first_name', 'last_name', 'phone', 'email', 'address', 'city', 'province', 'postal_code', 'date_joined', 'commission_pct', 'unsold_preference', 'notes'];
  const rows = consignors.map((c) => [
    c.number, c.firstName, c.lastName, c.phone, c.email, c.address, c.city,
    c.province, c.postalCode, c.dateJoined, c.commissionPct, c.unsoldPreference, c.notes,
  ]);
  downloadCsv(`consignors-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function exportItems(items, consignors) {
  const consignorById = Object.fromEntries(consignors.map((c) => [c.id, c]));
  const headers = [
    'item_number', 'consignor_number', 'description', 'price', 'category', 'type',
    'size', 'condition', 'status', 'date_received', 'commission_pct', 'notes',
    'tags', 'brand', 'vendor', 'product_description', 'sale_price', 'date_sold',
    'order_name', 'order_id', 'paid_out', 'payout_id', 'payout_date',
    'payout_method', 'payout_reference', 'payout_note', 'payout_amount',
    'payout_total', 'payout_adjustment', 'shopify_product_id',
  ];
  const rows = items.map((item) => [
    item.itemNumber, consignorById[item.consignorId]?.number || '', item.description,
    item.price, item.category, item.type, item.size, item.condition, item.status,
    item.dateReceived, item.commissionPct, item.notes,
    Array.isArray(item.tags) ? item.tags.join('|') : item.tags || '',
    item.brand, item.vendor, item.productDescription, item.salePrice, item.dateSold,
    item.orderName, item.orderId, item.paidOut ? 'true' : 'false', item.payoutId,
    item.payoutDate, item.payoutMethod, item.payoutReference, item.payoutNote,
    item.payoutAmount, item.payoutTotal, item.payoutAdjustment, item.shopifyProductId,
  ]);
  downloadCsv(`items-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

function ImportScreen({ kind, onBack, onImport, fixedConsignor = null }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [localError, setLocalError] = useState('');
  const [saving, setSaving] = useState(false);
  const isConsignors = kind === 'consignors';
  const required = isConsignors
    ? 'consignor_import_key, first_name, last_name; item_description and price when the row contains an item'
    : fixedConsignor ? 'item_description, price' : 'consignor_import_key (or email/phone), item_description, price';
  const templateConsignorNumber = fixedConsignor?.number || 1;
  const itemColumns = 'item_import_key,item_description,price,category,item_type,brand,size,condition,item_notes,status,date_received,consignment_term,expiry_action,create_shopify_product,shopify_title,shopify_price,shopify_description,shopify_vendor,shopify_tags,publish_to_pos,publish_online,seo_title,seo_description,sale_price,sale_date,payout_status';
  const template = isConsignors
    ? `consignor_import_key,first_name,last_name,phone,email,address,city,province,postal_code,date_joined,commission_pct,unsold_preference,consignor_notes,${itemColumns}\njane-smith-9055550100,Jane,Smith,905-555-0100,jane@example.com,123 Main Street,Hamilton,Ontario,L8E 1A1,2026-07-30,50,Please return,,jane-001,Blue winter coat,45.00,Clothing,Jacket,Gap,Medium,Like new,,Available,2026-07-30,90,Please return,true,Blue winter coat,45.00,Warm blue winter coat,Gap,winter|coat,true,true,Blue winter coat,Warm blue winter coat for sale,,,`
    : fixedConsignor
      ? `${itemColumns},consignor_number\nitem-001,Blue baby sweater,18.00,Clothing,Sweater,Gap,12M,Good,,Available,2026-07-30,60,Please return,true,Blue baby sweater,18.00,Soft blue baby sweater,Gap,baby|sweater,true,false,Blue baby sweater,Soft blue baby sweater,,,${templateConsignorNumber}`
      : `consignor_import_key,email,phone,${itemColumns}\njane-smith-9055550100,jane@example.com,905-555-0100,jane-001,Blue winter coat,45.00,Clothing,Jacket,Gap,Medium,Like new,,Available,2026-07-30,90,Please return,true,Blue winter coat,45.00,Warm blue winter coat,Gap,winter|coat,true,true,Blue winter coat,Warm blue winter coat for sale,,,`;

  function downloadTemplate() {
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${kind}-import-template.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let parsed = parseCsv(await file.text());
      if (!isConsignors && fixedConsignor) {
        parsed = parsed.map((row, index) => {
          return { ...row, consignor_number: fixedConsignor.number };
        });
      }
      setRows(parsed); setFileName(file.name); setLocalError('');
    } catch (error) { setRows([]); setFileName(file.name); setLocalError(error.message); }
  }

  return (
    <>
      <Header eyebrow="Data import" title={isConsignors ? 'Import consignors and items' : fixedConsignor ? `Import items for ${fixedConsignor.firstName} ${fixedConsignor.lastName}` : 'Import items'} onBack={onBack} />
      <div className="consignment-body">
        <div className="consignment-card">
          <strong style={{ fontSize: 14 }}>Start with the template</strong>
          <p className="consignment-import-help">Required columns: {required}. The app assigns consignor and item numbers automatically. Keep the headings unchanged, fill in your rows, then save as CSV.{fixedConsignor && !isConsignors ? ` Every row will be assigned to consignor #${fixedConsignor.number}.` : ''}</p>
          <button className="consignment-btn secondary" onClick={downloadTemplate}><Download size={16} /> Download template</button>
        </div>
        <div className="consignment-import-drop">
          <label>
            <FileUp size={24} />
            <span>{fileName || 'Choose CSV file'}</span>
            <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
          </label>
          <div className="consignment-import-help">Nothing is imported until you review the count and press Import.</div>
        </div>
        {localError && <div className="consignment-card" style={{ color: 'var(--danger)' }}>{localError}</div>}
        {rows.length > 0 && (
          <>
            <div className="consignment-import-preview">
              <div><span>File</span><strong style={{ fontSize: 12 }}>{fileName}</strong></div>
              <div><span>Rows ready</span><strong>{rows.length}</strong></div>
              <div><span>Importing</span><strong style={{ fontSize: 13 }}>{isConsignors ? 'Consignors + items · Shopify supported' : 'Items · Shopify supported'}</strong></div>
            </div>
            <div className="consignment-import-actions">
              <button className="consignment-btn" disabled={saving} onClick={async () => {
                setSaving(true);
                try { await onImport(kind, rows); } finally { setSaving(false); }
              }}>{saving ? <Loader2 className="consignment-spin" size={16} /> : <FileUp size={16} />} Import {rows.length} row{rows.length === 1 ? '' : 's'}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function EditConsignorScreen({ consignor, onBack, onSave }) {
  const [form, setForm] = useState({
    number: consignor.number,
    firstName: consignor.firstName || '',
    lastName: consignor.lastName || '',
    phone: consignor.phone || '',
    email: consignor.email || '',
    address: consignor.address || '',
    city: consignor.city || '',
    province: consignor.province || 'Ontario',
    postalCode: consignor.postalCode || '',
    commissionPct: consignor.commissionPct ?? 50,
    unsoldPreference: consignor.unsoldPreference || 'Please return',
    notes: consignor.notes || '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.firstName.trim() && form.lastName.trim();

  return (
    <>
      <Header eyebrow={`Consignor #${consignor.number}`} title="Edit consignor" onBack={onBack} />
      <div className="consignment-body">
        <div className="consignment-field">
          <label className="consignment-label">Consignor number</label>
          <input className="consignment-input" type="number" inputMode="numeric" min="1" step="1" value={form.number} onChange={set('number')} />
        </div>
        <div className="consignment-row2">
          <div className="consignment-field">
            <label className="consignment-label">First name</label>
            <input className="consignment-input" value={form.firstName} onChange={set('firstName')} placeholder="Sarah" />
          </div>
          <div className="consignment-field">
            <label className="consignment-label">Last name</label>
            <input className="consignment-input" value={form.lastName} onChange={set('lastName')} placeholder="Lee" />
          </div>
        </div>
        <div className="consignment-row2">
          <div className="consignment-field">
            <label className="consignment-label">Phone</label>
            <input className="consignment-input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="(416) 555-0134" />
          </div>
          <div className="consignment-field">
            <label className="consignment-label">Email</label>
            <input className="consignment-input" type="email" value={form.email} onChange={set('email')} placeholder="sarah@email.com" />
          </div>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Street address</label>
          <input className="consignment-input" value={form.address} onChange={set('address')} placeholder="123 Main Street" autoComplete="street-address" />
        </div>
        <div className="consignment-row2">
          <div className="consignment-field">
            <label className="consignment-label">City</label>
            <input className="consignment-input" value={form.city} onChange={set('city')} placeholder="Hamilton" autoComplete="address-level2" />
          </div>
          <div className="consignment-field">
            <label className="consignment-label">Province</label>
            <input className="consignment-input" value={form.province} onChange={set('province')} placeholder="Ontario" autoComplete="address-level1" />
          </div>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Postal code</label>
          <input className="consignment-input" value={form.postalCode} onChange={set('postalCode')} placeholder="L8E 1A1" autoCapitalize="characters" autoComplete="postal-code" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Commission split &mdash; consignor gets</label>
          <input className="consignment-input" type="number" inputMode="decimal" value={form.commissionPct} onChange={set('commissionPct')} placeholder="50" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Unsold items</label>
          <select className="consignment-select" value={form.unsoldPreference} onChange={set('unsoldPreference')}>
            <option value="Please return">Please return</option>
            <option value="Donation okay">Donation okay</option>
            <option value="Ask me first">Ask me first</option>
          </select>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Notes (optional)</label>
          <textarea className="consignment-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" />
        </div>
      </div>
      <div className="consignment-fab-wrap">
        <button className="consignment-btn" disabled={!valid} onClick={() => onSave(consignor.id, form)}>
          <Check size={18} /> Save changes
        </button>
      </div>
    </>
  );
}

function ConsignmentItemFields({ form, setForm }) {
  const set = (key) => (event) => {
    onFieldEdit?.(key);
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  function setCategory(category) {
    setForm((current) => ({
      ...current,
      category,
      type: '',
    }));
  }

  return (
    <div className="consignment-card consignment-detail-card">
      <div className="consignment-section-heading">
        <label className="consignment-label">Consignment item information</label>
        <span className="consignment-row-sub">Manual metaobject record</span>
      </div>
      <div className="consignment-detail-grid">
        <div className="consignment-field">
          <label className="consignment-label">Category</label>
          <select className="consignment-select" value={form.category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Brand</label>
          <input className="consignment-input" value={form.brand} onChange={set('brand')} placeholder="e.g. Gap" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Size</label>
          <input className="consignment-input" value={form.size} onChange={set('size')} placeholder="Optional" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Condition</label>
          <select className="consignment-select" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
          </select>
        </div>
        <div className="consignment-field wide">
          <label className="consignment-label">Internal notes</label>
          <textarea className="consignment-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Notes about this consigned item" />
        </div>
      </div>
    </div>
  );
}

function ShopifyProductFields({ form, setForm, onFieldEdit }) {
  const [categorySearch, setCategorySearch] = useState(form.shopifyCategoryName || '');
  const [categoryResults, setCategoryResults] = useState([]);
  const [searchingCategories, setSearchingCategories] = useState(false);

  useEffect(() => {
    const query = categorySearch.trim();
    if (query.length < 2 || query === form.shopifyCategoryName) {
      setCategoryResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setSearchingCategories(true);
      searchShopifyCategories(query)
        .then(setCategoryResults)
        .catch(() => setCategoryResults([]))
        .finally(() => setSearchingCategories(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [categorySearch, form.shopifyCategoryName]);

  const set = (key) => (event) => setForm((current) => ({
    ...current,
    [key]: event.target.value,
  }));

  return (
    <div className="consignment-shopify-fields">
      <div className="consignment-detail-grid">
        <div className="consignment-field wide">
          <label className="consignment-label">Shopify title</label>
          <input className="consignment-input" value={form.shopifyTitle || ''} onChange={set('shopifyTitle')} placeholder="Auto-filled from item details" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Shopify price</label>
          <input className="consignment-input" type="number" inputMode="decimal" min="0" step="0.01" value={form.shopifyPrice ?? ''} onChange={set('shopifyPrice')} placeholder="Defaults to the manual item price" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Vendor</label>
          <input className="consignment-input" value={form.vendor} onChange={set('vendor')} placeholder="Auto-filled from brand" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Tags</label>
          <input className="consignment-input" value={form.tags} onChange={set('tags')} placeholder="Auto-filled from item details" />
        </div>
        <div className="consignment-field wide">
          <label className="consignment-label">Shopify product category</label>
          <input
            className="consignment-input"
            value={categorySearch}
            onChange={(event) => {
              onFieldEdit?.('shopifyCategory');
              setCategorySearch(event.target.value);
              if (event.target.value !== form.shopifyCategoryName) {
                setForm((current) => ({ ...current, shopifyCategoryId: '', shopifyCategoryName: '' }));
              }
            }}
            placeholder="Search Shopify categories"
          />
          {searchingCategories && <div className="consignment-row-sub" style={{ marginTop: 6 }}>Searching Shopify…</div>}
          {categoryResults.length > 0 && (
            <div className="consignment-category-results">
              {categoryResults.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="consignment-category-result"
                  onClick={() => {
                    onFieldEdit?.('shopifyCategory');
                    setForm((current) => ({
                      ...current,
                      shopifyCategoryId: category.id,
                      shopifyCategoryName: category.name,
                    }));
                    setCategorySearch(category.name);
                    setCategoryResults([]);
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {form.shopifyCategoryId && (
            <div className="consignment-selected-category">
              <span>{form.shopifyCategoryName}</span>
              <button
                type="button"
                className="consignment-batch-remove"
                aria-label="Remove Shopify category"
                onClick={() => {
                  onFieldEdit?.('shopifyCategory');
                  setForm((current) => ({ ...current, shopifyCategoryId: '', shopifyCategoryName: '' }));
                  setCategorySearch('');
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="consignment-field wide">
          <label className="consignment-label">Product description</label>
          <textarea className="consignment-textarea" rows={3} value={form.productDescription} onChange={set('productDescription')} placeholder="Auto-filled from item details" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">SEO title</label>
          <input className="consignment-input" value={form.seoTitle} onChange={set('seoTitle')} placeholder="Auto-filled from item title" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">SEO description</label>
          <textarea className="consignment-textarea" rows={2} value={form.seoDescription} onChange={set('seoDescription')} placeholder="Auto-filled from item details" />
        </div>
      </div>
    </div>
  );
}

function ManualItemCore({
  form,
  setForm,
  onSave,
  saveLabel = 'Save manual item',
  saveDisabled = false,
  helperText = 'Saves only the consignment metaobject record. No Shopify product is created.',
}) {
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setCategory = (category) => setForm((current) => ({ ...current, category, type: '' }));

  return (
    <div className="consignment-card">
      <div className="consignment-intake-primary-fields">
        <div className="consignment-field">
          <label className="consignment-label">Item description *</label>
          <input className="consignment-input" value={form.description} onChange={set('description')} placeholder="What is it?" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Price *</label>
          <input className="consignment-input" type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />

      <div className="consignment-section-heading">
        <label className="consignment-label">Consignment item information</label>
        <span className="consignment-row-sub">Manual metaobject record</span>
      </div>
      <div className="consignment-detail-grid">
        <div className="consignment-field">
          <label className="consignment-label">Category</label>
          <select className="consignment-select" value={form.category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Brand</label>
          <input className="consignment-input" value={form.brand} onChange={set('brand')} placeholder="e.g. Gap" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Size</label>
          <input className="consignment-input" value={form.size} onChange={set('size')} placeholder="Optional" />
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Condition</label>
          <select className="consignment-select" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
          </select>
        </div>
        <div className="consignment-field">
          <label className="consignment-label">Consignment term</label>
          <select className="consignment-select" value={form.consignmentTerm || ''} onChange={set('consignmentTerm')}>
            <option value="">No term</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
        <div className="consignment-field wide">
          <label className="consignment-label">Internal notes</label>
          <textarea className="consignment-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Notes about this consigned item" />
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14 }}>Manual consignment record</strong>
          <span className="consignment-row-sub" style={{ display: 'block', marginTop: 3 }}>{helperText}</span>
        </div>
        <button className="consignment-btn" disabled={saveDisabled} onClick={onSave}>
          <Check size={18} /> {saveLabel}
        </button>
      </div>
    </div>
  );
}

function productAdminUrl(productId) {
  const numericId = String(productId || '').split('/').pop();
  return `shopify://admin/products/${numericId}`;
}

function ShopifyProductSection({
  shopifyForm,
  setShopifyForm,
  onShopifyFieldEdit,
  linkedProductId = '',
  linkedStatus = '',
  disabled = false,
  onSync = null,
  syncing = false,
  tier2Enabled = true,
}) {
  const canSync = Boolean(onSync) && tier2Enabled;
  return (
    <details className="consignment-card consignment-shopify-section" open={Boolean(linkedProductId)}>
      <summary className="consignment-shopify-summary">
        <span>
          <ShoppingBag size={17} />
          <strong>Shopify product</strong>
        </span>
        <span className="consignment-row-sub">
          {!tier2Enabled ? 'Requires Manual + Shopify Sync plan' : linkedProductId ? 'Connected' : 'Separate optional workflow'}
        </span>
      </summary>
      <div className="consignment-shopify-content">
        {!tier2Enabled && (
          <div className="consignment-shopify-upsell" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            marginBottom: 14, padding: '10px 12px', borderRadius: 8,
            background: 'var(--surface-muted, #f5f5f5)', border: '1px solid var(--border, #e2e2e2)',
          }}>
            <span style={{ fontSize: 13 }}>
              Creating and syncing Shopify products is part of the <strong>Manual + Shopify Sync</strong> plan.
            </span>
            <a className="consignment-btn" style={{ flexShrink: 0 }} href="/app/plans" target="_top">
              Upgrade plan
            </a>
          </div>
        )}
        <p className="consignment-shopify-help">
          This section only controls the linked Shopify product. Manual item saving never creates or updates a Shopify product.
        </p>
        <div className="consignment-shopify-photo-row">
          <PhotoPicker
            value={shopifyForm.photo}
            onChange={(value) => setShopifyForm((current) => ({
              ...current,
              photo: value,
              photoId: null,
            }))}
            onChooseShopify={(file) => setShopifyForm((current) => ({
              ...current,
              photo: file.url,
              photoId: file.id,
            }))}
          />
          <ShopifyProductFields form={shopifyForm} setForm={setShopifyForm} onFieldEdit={onShopifyFieldEdit} />
        </div>
        <label className="consignment-product-choice">
          <input type="checkbox" checked={shopifyForm.publishToPos !== false} onChange={(event) => setShopifyForm((current) => ({ ...current, publishToPos: event.target.checked }))} />
          <span>
            <strong>Create Shopify product</strong>
            <span>Creates or updates an Active product with inventory of one and publishes it to Point of Sale.</span>
          </span>
        </label>
        <label className="consignment-product-choice online">
          <input type="checkbox" checked={shopifyForm.publishOnline === true} onChange={(event) => setShopifyForm((current) => ({ ...current, publishOnline: event.target.checked }))} />
          <span>
            <strong>Also publish to Online Store</strong>
            <span>Publishes the same synced product to the Online Store.</span>
          </span>
        </label>
        {linkedProductId && (
          <p style={{ margin: '12px 0 0', color: 'var(--green-dark)', fontSize: 12 }}>
            <Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
            Linked Shopify product · {linkedStatus || 'Connected'}
          </p>
        )}
        {!linkedProductId ? (
          <button className="consignment-btn" style={{ marginTop: 14 }} disabled={!canSync || disabled || syncing || shopifyForm.publishToPos === false} onClick={onSync}>
            {syncing ? <Loader2 className="consignment-spin" size={16} /> : <ShoppingBag size={16} />}
            Create Shopify product
          </button>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <button className="consignment-btn" disabled={!canSync || disabled || syncing || shopifyForm.publishToPos === false} onClick={onSync}>
              {syncing ? <Loader2 className="consignment-spin" size={16} /> : <Check size={16} />}
              Update Shopify product
            </button>
            <a className="consignment-btn secondary" href={productAdminUrl(linkedProductId)} target="_top">
              <span aria-hidden="true">↗</span> Edit in Shopify
            </a>
          </div>
        )}
        {linkedProductId && (
          <div className="consignment-row-sub" style={{ marginTop: 8 }}>
            Changes made in Shopify are loaded back into this section whenever the app refreshes. Changes made here are sent to Shopify with “Update Shopify product”.
          </div>
        )}
        {tier2Enabled && !canSync && <div className="consignment-row-sub" style={{ marginTop: 8 }}>Fill in the item description and price above — the manual record saves automatically when you create the Shopify product here.</div>}
      </div>
    </details>
  );
}

function IntakeScreen({ consignor, items, onBack, onSaveBatch, onSaveAndSync, tier2Enabled = false }) {
  const emptyForm = {
    category: 'Clothing', type: '', description: '', size: '', condition: 'Good',
    price: '', brand: '', notes: '', consignmentTerm: '',
  };
  const emptyShopifyForm = {
    photo: null, photoId: null, shopifyTitle: '', shopifyPrice: '', tags: '', vendor: '', productDescription: '', shopifyCategoryId: '',
    shopifyCategoryName: '', seoTitle: '', seoDescription: '', publishToPos: true,
    publishOnline: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [shopifyForm, setShopifyForm] = useState(emptyShopifyForm);
  const [shopifyTouchedFields, setShopifyTouchedFields] = useState({});
  const [batch, setBatch] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const canAdd = form.description.trim() && form.price !== '';
  const saveCount = batch.length + (canAdd ? 1 : 0);
  const savedSequence = items
    .filter((item) => item.consignorId === consignor.id && item.itemNumber.startsWith(`${consignor.number}-`))
    .reduce((max, item) => Math.max(max, Number(item.itemNumber.split('-').pop()) || 0), 0);
  const nextItemNumber = `${consignor.number}-${String(savedSequence + batch.length + 1).padStart(3, '0')}`;

  useEffect(() => {
    const nextDefaults = buildShopifyDefaults(form, consignor);
    setShopifyForm((current) => {
      const next = { ...current };
      Object.entries(nextDefaults).forEach(([key, value]) => {
        if (!shopifyTouchedFields[key]) next[key] = value;
      });
      return next;
    });
  }, [
    form.description,
    form.price,
    form.brand,
    form.size,
    form.condition,
    form.category,
    form.type,
    consignor.number,
    shopifyTouchedFields,
  ]);

  function addToBatch() {
    if (!canAdd) return;
    setBatch((current) => [...current, form]);

    const nextForm = { ...emptyForm, category: form.category, brand: form.brand };

    setForm(nextForm);
    setShopifyTouchedFields({});
    setShopifyForm((current) => ({
      ...emptyShopifyForm,
      publishToPos: current.publishToPos !== false,
      publishOnline: current.publishOnline === true,
    }));
  }

  return (
    <>
      <Header eyebrow={`For ${consignor.firstName} ${consignor.lastName} · #${consignor.number}`} title="Add items" onBack={onBack} />
      <div className="consignment-body">
        {batch.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label className="consignment-label">Manual items ready to save ({batch.length})</label>
            {batch.map((entry, index) => (
              <div key={`${entry.description}-${index}`} className="consignment-batch-item">
                <div className="consignment-batch-thumb"><Tag size={16} color="var(--green-dark)" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.category} · {money(entry.price)}</div>
                </div>
                <button className="consignment-batch-remove" onClick={() => setBatch((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="consignment-section-heading">
          <label className="consignment-label">{batch.length > 0 ? 'Next manual item' : 'Manual consignment item'}</label>
          <span className="consignment-item-number">{nextItemNumber}</span>
        </div>
        <ManualItemCore
          form={form}
          setForm={setForm}
          onSave={() => onSaveBatch(canAdd ? [...batch, form] : batch)}
          saveDisabled={saveCount === 0}
          saveLabel={saveCount === 1 ? 'Save manual item' : `Save ${saveCount} manual items`}
        />
        <button className="consignment-btn secondary consignment-add-another" disabled={!canAdd} onClick={addToBatch}>
          <Plus size={16} /> Add another manual item
        </button>
        <ShopifyProductSection
          shopifyForm={shopifyForm}
          setShopifyForm={setShopifyForm}
          onShopifyFieldEdit={(key) => setShopifyTouchedFields((current) => ({ ...current, [key]: true }))}
          tier2Enabled={tier2Enabled}
          syncing={syncing}
          onSync={canAdd ? async () => {
            setSyncing(true);
            try {
              // Creates the Shopify product independently of the manual
              // "Save manual item" button — clicking this saves the manual
              // consignment record (this item, plus anything already
              // queued in the batch) AND creates the Shopify product in
              // one action. You do not need to save manually first.
              await onSaveAndSync(form, batch, shopifyForm);
            } finally {
              setSyncing(false);
            }
          } : null}
        />
      </div>
    </>
  );
}


function EditItemScreen({
  item,
  onBack,
  onSave,
  onDelete,
  onSyncProduct,
  onUpdateStatus,
  tier2Enabled = false,
}) {
  const [form, setForm] = useState({
    category: item.category || 'Other', type: '', description: item.description || '',
    size: item.size || '', condition: item.condition || 'Good', price: item.price ?? '',
    brand: item.brand || '', notes: item.notes || '', consignmentTerm: item.consignmentTerm || '',
  });
  const [shopifyForm, setShopifyForm] = useState({
    photo: item.shopifyPhoto || item.photo || null,
    photoId: item.photoId || null,
    shopifyTitle: item.shopifyTitle || '',
    shopifyPrice: item.shopifyPrice ?? item.price ?? '',
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
    vendor: item.vendor || '',
    productDescription: item.productDescription || '',
    shopifyCategoryId: item.shopifyCategoryId || '',
    shopifyCategoryName: item.shopifyCategoryName || '',
    seoTitle: item.seoTitle || '',
    seoDescription: item.seoDescription || '',
    publishToPos: true,
    publishOnline: item.publishOnline === true,
  });
  const [shopifyTouchedFields, setShopifyTouchedFields] = useState(() => (
    item.shopifyProductId
      ? {
        shopifyTitle: true,
        shopifyPrice: true,
        vendor: true,
        tags: true,
        productDescription: true,
        seoTitle: true,
        seoDescription: true,
        shopifyCategory: true,
      }
      : {}
  ));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [salePrice, setSalePrice] = useState(item.salePrice ?? item.price ?? '');
  const [dateSold] = useState(item.dateSold || new Date().toISOString().slice(0, 10));
  const isSold = item.status === 'Sold' || Boolean(item.dateSold);
  const isPaid = item.paidOut === true;
  const canSave = form.description.trim() && form.price !== '';

  useEffect(() => {
    const nextDefaults = buildShopifyDefaults(form);
    setShopifyForm((current) => {
      const next = { ...current };
      Object.entries(nextDefaults).forEach(([key, value]) => {
        if (!shopifyTouchedFields[key]) next[key] = value;
      });
      return next;
    });
  }, [
    form.description,
    form.price,
    form.brand,
    form.size,
    form.condition,
    form.category,
    form.type,
    shopifyTouchedFields,
  ]);

  return (
    <>
      <Header eyebrow={`Item ${item.itemNumber}`} title="Edit item" onBack={onBack} />
      <div className="consignment-body">
        <div className="consignment-section-heading">
          <label className="consignment-label">Manual consignment item</label>
          <span className="consignment-item-number">{item.itemNumber}</span>
        </div>
        <ManualItemCore
          form={form}
          setForm={setForm}
          onSave={() => onSave(item.id, form)}
          saveDisabled={!canSave || isSold}
          saveLabel="Save manual changes"
          helperText="Updates only the consignment item metaobject. Shopify product data and media are handled separately below."
        />

        <div className="consignment-status-card">
          {!isSold && (
            <div className="consignment-manual-sale">
              <div className="consignment-manual-sale-copy"><strong>Manual sale</strong><span>Only use for a sale outside Shopify.</span></div>
              <div className="consignment-manual-sale-controls">
                <div className="consignment-field"><label className="consignment-label">Sale price</label><input className="consignment-input" type="number" inputMode="decimal" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></div>
                <button className="consignment-btn consignment-sold-btn" disabled={statusSaving || salePrice === ''} onClick={async () => { setStatusSaving(true); try { await onUpdateStatus(item.id, 'Sold', { salePrice, dateSold }); } finally { setStatusSaving(false); } }}>Sold</button>
              </div>
            </div>
          )}
          {isSold && !isPaid && <div className="consignment-sold-status"><span className="consignment-badge unpaid">Sold · unpaid</span><span className="consignment-row-sub">Waiting in Payouts for payment.</span></div>}
          {isPaid && <div className="consignment-status-actions"><span className="consignment-badge paid">Paid</span><span className="consignment-paid-detail">{item.payoutDate || ''} · {item.payoutMethod || 'Payment recorded'} · {money(item.payoutAmount)}</span></div>}
        </div>

        <ShopifyProductSection
          shopifyForm={shopifyForm}
          setShopifyForm={setShopifyForm}
          onShopifyFieldEdit={(key) => setShopifyTouchedFields((current) => ({ ...current, [key]: true }))}
          linkedProductId={item.shopifyProductId}
          linkedStatus={item.shopifyProductStatus}
          disabled={isSold}
          syncing={syncing}
          tier2Enabled={tier2Enabled}
          onSync={async () => {
            setSyncing(true);
            try { await onSyncProduct(item.id, shopifyForm); } finally { setSyncing(false); }
          }}
        />

        {!confirmingDelete ? (
          <button className="consignment-btn secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => setConfirmingDelete(true)}><Trash2 size={16} /> Delete item</button>
        ) : (
          <div className="consignment-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>Delete {item.itemNumber} and its linked Shopify product?</span>
            <div style={{ display: 'flex', gap: 8 }}><button className="consignment-btn secondary" style={{ padding: '8px 14px' }} onClick={() => setConfirmingDelete(false)}>Cancel</button><button className="consignment-btn danger" style={{ padding: '8px 14px' }} onClick={() => onDelete(item.id)}>Delete</button></div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- app ---------- */

export default function ConsignmentIntakeApp({ activePlan = null }) {
  const tier2Enabled = activePlan === 'TIER2';
  const [ready, setReady] = useState(false);
  const [consignors, setConsignors] = useState([]);
  const [items, setItems] = useState([]);
  const [view, setView] = useState('dashboard');
  const [activeId, setActiveId] = useState(null);
  const [activeItemId, setActiveItemId] = useState(null);
  const [query, setQuery] = useState('');
  const [newConsignorNext, setNewConsignorNext] = useState('consignor');
  const [newConsignorBack, setNewConsignorBack] = useState('home');
  const [importKind, setImportKind] = useState('consignors');
  const [importBack, setImportBack] = useState('home');
  const [importConsignorId, setImportConsignorId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastTone, setToastTone] = useState('');
  const [error, setError] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  function errorMessage(value, fallback) {
    return value instanceof Error ? value.message : fallback;
  }

  async function refreshData() {
    const data = await getConsignmentData();
    setConsignors(data.consignors);
    setItems(data.items);
    return data;
  }

  useEffect(() => {
    refreshData()
      .catch((e) => setError(errorMessage(e, 'Could not load Shopify data')))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.querySelector('.consignment-body')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setShowBackToTop(false);
  }, [view]);

  useEffect(() => {
    if (!ready) return undefined;
    const body = document.querySelector('.consignment-body');
    const updateBackToTop = () => {
      setShowBackToTop(window.scrollY > 280 || (body?.scrollTop || 0) > 280);
    };
    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    body?.addEventListener('scroll', updateBackToTop, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateBackToTop);
      body?.removeEventListener('scroll', updateBackToTop);
    };
  }, [ready, view]);

  function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.querySelector('.consignment-body')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  function flash(msg, tone = '') {
    setToast(msg);
    setToastTone(tone);
    setTimeout(() => {
      setToast('');
      setToastTone('');
    }, 2000);
  }

  async function handleNewConsignor(form) {
    try {
      setError('');
      const consignor = await createConsignor(form);
      await refreshData();
      flash(`Consignor #${consignor.number} added`);
      setActiveId(consignor.id);
      setView(newConsignorNext);
    } catch (e) {
      setError(errorMessage(e, 'Could not save consignor'));
    }
  }

  async function handleImport(kind, rows) {
    try {
      setError('');
      const result = await importConsignmentData(kind, rows);
      await refreshData();
      if (kind === 'consignors') {
        flash(`${result.consignorsCreated || 0} created, ${result.consignorsUpdated || 0} matched/updated, ${result.itemsImported || 0} items imported, ${result.shopifyProductsCreated || 0} Shopify products created`);
      } else {
        const importedCount = result.itemsImported ?? result.imported;
        flash(`${importedCount} item${importedCount === 1 ? '' : 's'} imported, ${result.shopifyProductsCreated || 0} Shopify products created`);
      }
      setView(importBack);
    } catch (e) {
      setError(errorMessage(e, 'Could not import this CSV'));
      throw e;
    }
  }

  function startImport(kind, backView, consignorId = null) {
    setImportKind(kind);
    setImportBack(backView);
    setImportConsignorId(consignorId);
    setView('import');
  }

  async function handleSaveBatch(batch) {
    try {
      setError('');
      const saved = await createConsignmentItems(activeId, batch);
      await refreshData();
      flash(`${saved.length} item${saved.length === 1 ? '' : 's'} saved`);
      setView('consignor');
    } catch (e) {
      setError(errorMessage(e, 'Could not save items'));
    }
  }

  // Lets "Create Shopify product" work standalone on the Add Items screen,
  // without requiring "Save manual item" to have been clicked first. Saves
  // the manual consignment record(s) — the current form entry plus anything
  // already queued in the batch, so nothing queued gets silently lost — and
  // creates the Shopify product for the current item, in one action.
  async function handleSaveAndSync(currentEntry, queuedBatch, shopifyForm) {
    try {
      setError('');
      const saved = await createConsignmentItems(activeId, [...queuedBatch, currentEntry]);
      const newItem = saved[saved.length - 1];
      await syncShopifyProduct(newItem.id, shopifyForm);
      await refreshData();
      flash(`${saved.length} item${saved.length === 1 ? '' : 's'} saved · Shopify product created`);
      setView('consignor');
    } catch (e) {
      setError(errorMessage(e, 'Could not save the item and create the Shopify product'));
      throw e;
    }
  }

  async function handleUpdateConsignor(consignorId, form) {
    try {
      setError('');
      await updateConsignor(consignorId, form);
      await refreshData();
      flash('Consignor updated');
      setView('consignor');
    } catch (e) {
      setError(errorMessage(e, 'Could not update consignor'));
    }
  }

  async function handleDeleteConsignor(consignorId) {
    try {
      setError('');
      await deleteConsignor(consignorId);
      await refreshData();
      setActiveId(null);
      setView('home');
      flash('Consignor deleted');
    } catch (e) {
      setError(errorMessage(e, 'Could not delete consignor'));
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      setError('');
      await deleteConsignmentItem(itemId);
      await refreshData();
      flash('Item deleted');
    } catch (e) {
      setError(errorMessage(e, 'Could not delete item'));
    }
  }

  async function handleUpdateItem(itemId, form) {
    try {
      setError('');
      await updateConsignmentItem(itemId, form);
      await refreshData();
      flash('Item updated');
      setView('consignor');
    } catch (e) {
      setError(errorMessage(e, 'Could not update item'));
    }
  }

  async function handleUpdateItemStatus(itemId, status, details = {}) {
    try {
      setError('');
      await updateConsignmentItemStatus(itemId, status, details);
      await refreshData();
      flash(status === 'Paid' ? 'Item marked paid' : status === 'Sold' ? 'Item marked sold · unpaid' : 'Item returned to available');
    } catch (e) {
      setError(errorMessage(e, 'Could not update item status'));
      throw e;
    }
  }

  async function handleSyncProduct(itemId, shopifyForm) {
    try {
      setError('');
      const wasAlreadyLinked = Boolean(items.find((entry) => entry.id === itemId)?.shopifyProductId);
      await syncShopifyProduct(itemId, shopifyForm);
      await refreshData();
      flash(wasAlreadyLinked ? 'Your product has been updated' : 'Shopify product created', 'success');
    } catch (e) {
      setError(errorMessage(e, 'Could not sync the Shopify product'));
      throw e;
    }
  }

  async function handleRecordPayout(payout) {
    try {
      setError('');
      const result = await recordConsignorPayout(payout);
      await refreshData();
      flash(`Payout of ${money(result.payout.total)} recorded`);
      setView('payouts');
    } catch (e) {
      setError(errorMessage(e, 'Could not record payout'));
      throw e;
    }
  }

  async function handleDeleteItemFromEdit(itemId) {
    await handleDeleteItem(itemId);
    setView('consignor');
  }

  const activeConsignor = consignors.find((c) => c.id === activeId);
  const activeItem = items.find((i) => i.id === activeItemId);
  const nextConsignorNumber = Math.max(0, ...consignors.map((consignor) => Number(consignor.number) || 0)) + 1;
  const navigationView = ['newConsignor', 'chooseConsignor', 'consignor', 'intake', 'editConsignor'].includes(view)
    ? 'home'
    : view === 'editItem'
      ? 'items'
      : view === 'createPayout'
        ? 'payouts'
        : view;

  function navigate(viewName) {
    setError('');
    setView(viewName);
  }

  function openConsignor(id) {
    setActiveId(id);
    setView('consignor');
  }

  function openItem(id) {
    const item = items.find((entry) => entry.id === id);
    setActiveItemId(id);
    if (item?.consignorId) setActiveId(item.consignorId);
    setView('editItem');
  }

  function startNewConsignor(nextView = 'consignor', backView = 'home') {
    setNewConsignorNext(nextView);
    setNewConsignorBack(backView);
    setView('newConsignor');
  }

  function startNewItem() {
    if (!consignors.length) {
      startNewConsignor('intake', 'dashboard');
      return;
    }
    setView('chooseConsignor');
  }

  return (
    <div className="consignment">
      {ready && <AppNavigation view={navigationView} onNavigate={navigate} />}
      {toast && (
        <div
          className="consignment-toast"
          style={toastTone === 'success' ? { background: '#1C7A3E' } : undefined}
        >
          <Check size={14} /> {toast}
        </div>
      )}
      {error && (
        <div className="consignment-toast" style={{ background: 'var(--danger)', top: 12 }}>
          <X size={14} /> {error}
        </div>
      )}

      {!ready && (
        <div className="consignment-loading">
          <Loader2 className="consignment-spin" size={22} />
        </div>
      )}

      {/* PAGE: DASHBOARD */}
      {ready && view === 'dashboard' && (
        <DashboardScreen
          consignors={consignors}
          items={items}
          onOpenConsignor={openConsignor}
          onNavigate={navigate}
          onNewConsignor={() => startNewConsignor('consignor', 'dashboard')}
          onNewItem={startNewItem}
          onImport={() => startImport('consignors', 'dashboard')}
          onExport={() => exportConsignors(consignors)}
        />
      )}

      {/* PAGE: CONSIGNORS */}
      {ready && view === 'home' && (
        <ConsignorsScreen
          consignors={consignors}
          items={items}
          query={query}
          setQuery={setQuery}
          onOpenConsignor={openConsignor}
          onOpenItem={openItem}
          onMarkSold={(itemId, details) => handleUpdateItemStatus(itemId, 'Sold', details)}
          onStartPayout={(consignorId) => { setActiveId(consignorId); setView('createPayout'); }}
          onNewConsignor={() => startNewConsignor('consignor', 'home')}
          onNewItem={startNewItem}
          onImport={() => startImport('consignors', 'home')}
          onExport={() => exportConsignors(consignors)}
        />
      )}

      {/* PAGE: ITEMS */}
      {ready && view === 'items' && (
        <ItemsScreen
          items={items}
          consignors={consignors}
          onOpenItem={openItem}
          onOpenConsignor={openConsignor}
          onMarkSold={(itemId, details) => handleUpdateItemStatus(itemId, 'Sold', details)}
          onStartPayout={(consignorId) => { setActiveId(consignorId); setView('createPayout'); }}
          onNewItem={startNewItem}
        />
      )}

      {/* PAGE: SALES */}
      {ready && view === 'sales' && (
        <SalesScreen
          items={items}
          consignors={consignors}
          onOpenItem={openItem}
          onOpenConsignor={openConsignor}
          onStartPayout={(consignorId) => {
            setActiveId(consignorId);
            setView('createPayout');
          }}
        />
      )}

      {/* PAGE: PAYOUTS */}
      {ready && view === 'payouts' && (
        <PayoutsScreen
          items={items}
          consignors={consignors}
          onOpenItem={openItem}
          onOpenConsignor={openConsignor}
          onStartPayout={(consignorId) => {
            setActiveId(consignorId);
            setView('createPayout');
          }}
        />
      )}

      {/* PAGE: REPORTS */}
      {ready && view === 'reports' && (
        <ReportsScreen
          items={items}
          consignors={consignors}
          onOpenConsignor={openConsignor}
          onStartPayout={(consignorId) => {
            setActiveId(consignorId);
            setView('createPayout');
          }}
        />
      )}

      {ready && view === 'createPayout' && activeConsignor && (
        <CreatePayoutScreen
          consignor={activeConsignor}
          items={items}
          onBack={() => setView('payouts')}
          onRecordPayout={handleRecordPayout}
        />
      )}

      {ready && view === 'import' && (
        <ImportScreen
          kind={importKind}
          fixedConsignor={consignors.find((entry) => entry.id === importConsignorId) || null}
          onBack={() => setView(importBack)}
          onImport={handleImport}
        />
      )}

      {ready && view === 'newConsignor' && (
        <CreateConsignorScreen onBack={() => setView(newConsignorBack)} onSave={handleNewConsignor} nextNumber={nextConsignorNumber} />
      )}

      {ready && view === 'chooseConsignor' && (
        <ChooseConsignorScreen
          consignors={consignors}
          onBack={() => setView('dashboard')}
          onChoose={(consignorId) => {
            setActiveId(consignorId);
            setView('intake');
          }}
          onCreate={() => startNewConsignor('intake', 'chooseConsignor')}
        />
      )}

      {ready && view === 'consignor' && activeConsignor && (
        <ConsignorDashboard
          consignor={activeConsignor}
          items={items}
          onBack={() => setView('home')}
          onStartIntake={() => setView('intake')}
          onOpenItem={openItem}
          onDeleteConsignor={handleDeleteConsignor}
          onEditConsignor={() => setView('editConsignor')}
          onStartPayout={(consignorId) => {
            setActiveId(consignorId);
            setView('createPayout');
          }}
        />
      )}

      {ready && view === 'editConsignor' && activeConsignor && (
        <EditConsignorScreen
          consignor={activeConsignor}
          onBack={() => setView('consignor')}
          onSave={handleUpdateConsignor}
        />
      )}

      {ready && view === 'intake' && activeConsignor && (
        <IntakeScreen
          consignor={activeConsignor}
          items={items}
          onBack={() => setView('consignor')}
          onSaveBatch={handleSaveBatch}
          onSaveAndSync={handleSaveAndSync}
          tier2Enabled={tier2Enabled}
        />
      )}

      {ready && view === 'editItem' && activeItem && (
        <EditItemScreen
          item={activeItem}
          onBack={() => setView('consignor')}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItemFromEdit}
          onSyncProduct={handleSyncProduct}
          onUpdateStatus={handleUpdateItemStatus}
          tier2Enabled={tier2Enabled}
        />
      )}

      {ready && showBackToTop && (
        <button className="consignment-back-to-top" type="button" onClick={scrollToTop} aria-label="Back to top" title="Back to top">
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
