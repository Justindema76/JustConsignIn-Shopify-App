import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('app/consignment_intake.jsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;

function replaceOnce(find, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(find)) throw new Error(`Tier 1 patch failed: could not find ${label}`);
  source = source.replace(find, replacement);
}

function replaceBetween(startMarker, endMarker, replacement, label, fromIndex = 0) {
  if (source.includes(replacement)) return;
  const start = source.indexOf(startMarker, fromIndex);
  if (start < 0) throw new Error(`Tier 1 patch failed: could not find start of ${label}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Tier 1 patch failed: could not find end of ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

const upgradePanel = [
  '        <details className="jatb-card jatb-shopify-section">',
  '          <summary className="jatb-shopify-summary">',
  '            <span>',
  '              <ShoppingBag size={17} />',
  '              <strong>Shopify product</strong>',
  '            </span>',
  '            <span className="jatb-row-sub">Upgrade to Shopify Connected</span>',
  '          </summary>',
  '          <div className="jatb-shopify-content">',
  '            <div className="jatb-upgrade-card">',
  '              <div className="jatb-upgrade-heading">',
  '                <div>',
  '                  <span className="jatb-upgrade-kicker">Shopify Connected</span>',
  '                  <h3>Connect your consignment items directly to Shopify</h3>',
  '                  <p>Keep using the complete manual workflow now. Upgrade when you want products, images, inventory, and sales connected automatically.</p>',
  '                </div>',
  '                <span className="jatb-upgrade-badge">Paid feature</span>',
  '              </div>',
  '              <div className="jatb-upgrade-features">',
  '                <span><Check size={16} /> Product images</span>',
  '                <span><Check size={16} /> Shopify products</span>',
  '                <span><Check size={16} /> Shopify POS</span>',
  '                <span><Check size={16} /> Inventory tracking</span>',
  '                <span><Check size={16} /> Automatic sales detection</span>',
  '              </div>',
  '              <button type="button" className="jatb-btn jatb-upgrade-btn">',
  '                Upgrade to Shopify Connected',
  '              </button>',
  '            </div>',
  '          </div>',
  '        </details>',
  '',
].join('\n');

replaceOnce(
  '        <div className="jatb-card jatb-intake-primary">\n          <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n          <div className="jatb-intake-primary-fields">',
  '        <div className="jatb-card jatb-intake-primary manual-only">\n          <div className="jatb-intake-primary-fields">',
  'new-item photo picker',
);

const intakeStart = source.indexOf('function IntakeScreen(');
replaceBetween(
  '        <details className="jatb-card jatb-shopify-section">',
  '        <button className="jatb-btn secondary jatb-add-another"',
  upgradePanel,
  'Tier 1 upgrade panel',
  intakeStart,
);

replaceOnce(
  '          onClick={() => onSaveBatch(canAdd ? [...batch, form] : batch)}\n        >\n          <Check size={18} /> Save {saveCount === 1 ? \'item\' : `${saveCount} items`}\n        </button>',
  '          onClick={() => onSaveBatch(\n            (canAdd ? [...batch, form] : batch).map((item) => ({\n              ...item,\n              photo: null,\n              createProduct: false,\n              publishOnline: false,\n            })),\n          )}\n        >\n          <Check size={18} /> Save manual {saveCount === 1 ? \'item\' : `${saveCount} items`}\n        </button>',
  'manual save button',
);

replaceOnce(
  '          <div style={{ display: \'flex\', gap: 12, marginBottom: 12 }}>\n            <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n            <div style={{ flex: 1 }}>',
  '          <div style={{ display: \'flex\', gap: 12, marginBottom: 12 }}>\n            <div style={{ flex: 1 }}>',
  'edit-item photo picker',
);

const editStart = source.indexOf('function EditItemScreen(');
const editUpgradePanel = [
  '        <div className="jatb-product-card">',
  '          <div className="jatb-upgrade-card">',
  '            <div className="jatb-upgrade-heading">',
  '              <div>',
  '                <span className="jatb-upgrade-kicker">Shopify Connected</span>',
  '                <h3>Upgrade this store to connect products and sales</h3>',
  '                <p>This item remains fully available in the manual consignment workflow. Connected features are available on the paid plan.</p>',
  '              </div>',
  '              <span className="jatb-upgrade-badge">Paid feature</span>',
  '            </div>',
  '            <div className="jatb-upgrade-features">',
  '              <span><Check size={16} /> Product image storage</span>',
  '              <span><Check size={16} /> Product and POS publishing</span>',
  '              <span><Check size={16} /> Inventory and automatic sales</span>',
  '            </div>',
  '            <button type="button" className="jatb-btn jatb-upgrade-btn">Upgrade to Shopify Connected</button>',
  '          </div>',
  '        </div>',
  '',
].join('\n');

replaceBetween(
  '        <div className={`jatb-product-card ${isSold ? \'disabled\' : \'\'}`}>',
  '        {!confirmingDelete ? (',
  editUpgradePanel,
  'edit-item upgrade panel',
  editStart,
);

replaceOnce(
  '      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }',
  '      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }\n      .jatb-intake-primary.manual-only .jatb-intake-primary-fields { width: 100%; }\n      .jatb-upgrade-card { padding: 18px 2px 2px; }\n      .jatb-upgrade-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; }\n      .jatb-upgrade-heading h3 { font-family: inherit; font-size: 18px; margin: 4px 0 7px; }\n      .jatb-upgrade-heading p { margin: 0; max-width: 720px; color: var(--muted); font-size: 13px; line-height: 1.55; }\n      .jatb-upgrade-kicker { color: var(--green); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }\n      .jatb-upgrade-badge { flex: 0 0 auto; padding: 6px 10px; border-radius: 999px; background: var(--gold-soft); border: 1px solid #EFD7A8; color: #765600; font-size: 11px; font-weight: 700; }\n      .jatb-upgrade-features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 18px 0; }\n      .jatb-upgrade-features span { display: flex; align-items: center; gap: 8px; color: var(--ink); font-size: 13px; font-weight: 600; }\n      .jatb-upgrade-features svg { color: var(--green); }\n      .jatb-upgrade-btn { width: 100%; }\n      @media (max-width: 700px) { .jatb-upgrade-heading { flex-direction: column; } .jatb-upgrade-features { grid-template-columns: 1fr; } }',
  'Tier 1 upgrade styles',
);

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('Applied Tier 1 manual upgrade experience.');
} else {
  console.log('Tier 1 manual upgrade experience already applied.');
}
