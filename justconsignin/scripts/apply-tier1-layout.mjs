import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('app/consignment_intake.jsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;

function replaceOnce(find, replacement, label) {
  if (!source.includes(find)) {
    if (source.includes(replacement)) return;
    throw new Error(`Tier 1 patch failed: could not find ${label}`);
  }
  source = source.replace(find, replacement);
}

// New item screen: keep the manual record fields clean and move the photo into Shopify.
replaceOnce(
`        <div className="jatb-card jatb-intake-primary">\n          <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n          <div className="jatb-intake-primary-fields">`,
`        <div className="jatb-card jatb-intake-primary manual-only">\n          <div className="jatb-intake-primary-fields">`,
'new-item photo picker',
);

replaceOnce(
`          <div className="jatb-shopify-content">\n            <p className="jatb-shopify-help">`,
`          <div className="jatb-shopify-content">\n            <div className="jatb-shopify-photo">\n              <label className="jatb-label">Product image</label>\n              <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n            </div>\n            <p className="jatb-shopify-help">`,
'new-item Shopify photo area',
);

// Replace the product checkbox with a clear paid-action button and keep online publishing optional.
replaceOnce(
`            <label className="jatb-product-choice">\n              <input\n                type="checkbox"\n                checked={form.createProduct}\n                onChange={(event) => setForm((current) => ({\n                  ...current,\n                  createProduct: event.target.checked,\n                  publishOnline: event.target.checked ? current.publishOnline : false,\n                }))}\n              />\n              <span>\n                <strong>Create Shopify product</strong>\n                <span>Creates an Active product with inventory of one and publishes it to Point of Sale.</span>\n              </span>\n            </label>\n            {form.createProduct && (\n              <label className="jatb-product-choice online">`,
`            <label className="jatb-product-choice online">`,
'new-item Shopify checkbox block',
);

replaceOnce(
`              </label>\n            )}\n          </div>\n        </details>`,
`              </label>\n            <button\n              type="button"\n              className="jatb-btn jatb-shopify-create-btn"\n              disabled={!canAdd}\n              onClick={() => onSaveBatch([...batch, { ...form, createProduct: true }])}\n            >\n              <ShoppingBag size={16} /> Save item and create Shopify product\n            </button>\n          </div>\n        </details>`,
'new-item Shopify action button',
);

// Manual button always saves metaobjects only and strips Shopify-only image/product flags.
replaceOnce(
`          onClick={() => onSaveBatch(canAdd ? [...batch, form] : batch)}\n        >\n          <Check size={18} /> Save {saveCount === 1 ? 'item' : \`${saveCount} items\`}\n        </button>`,
`          onClick={() => onSaveBatch(\n            (canAdd ? [...batch, form] : batch).map((item) => ({\n              ...item,\n              photo: null,\n              createProduct: false,\n              publishOnline: false,\n            })),\n          )}\n        >\n          <Check size={18} /> Save manual {saveCount === 1 ? 'item' : \`${saveCount} items\`}\n        </button>`,
'manual save button',
);

// Edit screen: remove photo from the manual item card.
replaceOnce(
`          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>\n            <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n            <div style={{ flex: 1 }}>`,
`          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>\n            <div style={{ flex: 1 }}>`,
'edit-item photo picker',
);

// Edit screen: put the photo with Shopify product information.
replaceOnce(
`            <div className="jatb-shopify-content">\n              <ShopifyProductFields form={form} setForm={setForm} />`,
`            <div className="jatb-shopify-content">\n              <div className="jatb-shopify-photo">\n                <label className="jatb-label">Product image</label>\n                <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n              </div>\n              <ShopifyProductFields form={form} setForm={setForm} />`,
'edit-item Shopify photo area',
);

// Add a little spacing without changing the established design system.
replaceOnce(
`      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }`,
`      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }\n      .jatb-shopify-photo { margin: 14px 0 16px; }\n      .jatb-shopify-create-btn { width: 100%; margin-top: 14px; }\n      .jatb-intake-primary.manual-only .jatb-intake-primary-fields { width: 100%; }`,
'Tier 1 Shopify spacing styles',
);

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('Applied Tier 1 manual/Shopify item layout.');
} else {
  console.log('Tier 1 item layout already applied.');
}
