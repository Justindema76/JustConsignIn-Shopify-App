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

replaceOnce(
`            <label className="jatb-product-choice">\n              <input\n                type="checkbox"\n                checked={form.createProduct}\n                onChange={(event) => setForm((current) => ({\n                  ...current,\n                  createProduct: event.target.checked,\n                  publishOnline: event.target.checked ? current.publishOnline : false,\n                }))}\n              />\n              <span>\n                <strong>Create Shopify product</strong>\n                <span>Creates an Active product with inventory of one and publishes it to Point of Sale.</span>\n              </span>\n            </label>\n            {form.createProduct && (\n              <label className="jatb-product-choice online">\n                <input\n                  type="checkbox"\n                  checked={form.publishOnline}\n                  onChange={(event) => setForm((current) => ({\n                    ...current,\n                    publishOnline: event.target.checked,\n                  }))}\n                />\n                <span>\n                  <strong>Also publish to Online Store</strong>\n                  <span>Publishes this product online using the Shopify information above.</span>\n                </span>\n              </label>\n            )}`,
`            <div className="jatb-publish-options">\n              <label className="jatb-publish-option active">\n                <input type="checkbox" checked readOnly />\n                <span className="jatb-toggle" aria-hidden="true"><span /></span>\n                <span className="jatb-publish-copy">\n                  <strong>Publish to Point of Sale</strong>\n                  <small>Creates the product with inventory of one and makes it available in Shopify POS.</small>\n                </span>\n              </label>\n              <label className={\`jatb-publish-option \${form.publishOnline ? 'active' : ''}\`}>\n                <input\n                  type="checkbox"\n                  checked={form.publishOnline}\n                  onChange={(event) => setForm((current) => ({\n                    ...current,\n                    publishOnline: event.target.checked,\n                  }))}\n                />\n                <span className="jatb-toggle" aria-hidden="true"><span /></span>\n                <span className="jatb-publish-copy">\n                  <strong>Also publish to Online Store</strong>\n                  <small>Optionally make the same product visible to online customers.</small>\n                </span>\n              </label>\n            </div>`,
'publishing option cards',
);

replaceOnce(
`          </div>\n        </details>\n\n        <button className="jatb-btn secondary jatb-add-another"`,
`            <button\n              type="button"\n              className="jatb-btn jatb-shopify-create-btn"\n              disabled={!canAdd}\n              onClick={() => onSaveBatch([...batch, { ...form, createProduct: true }])}\n            >\n              <ShoppingBag size={16} /> Save item and create Shopify product\n            </button>\n          </div>\n        </details>\n\n        <button className="jatb-btn secondary jatb-add-another"`,
'new-item Shopify action button',
);

replaceOnce(
`          onClick={() => onSaveBatch(canAdd ? [...batch, form] : batch)}\n        >\n          <Check size={18} /> Save {saveCount === 1 ? 'item' : \`\${saveCount} items\`}\n        </button>`,
`          onClick={() => onSaveBatch(\n            (canAdd ? [...batch, form] : batch).map((item) => ({\n              ...item,\n              photo: null,\n              createProduct: false,\n              publishOnline: false,\n            })),\n          )}\n        >\n          <Check size={18} /> Save manual {saveCount === 1 ? 'item' : \`\${saveCount} items\`}\n        </button>`,
'manual save button',
);

replaceOnce(
`          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>\n            <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n            <div style={{ flex: 1 }}>`,
`          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>\n            <div style={{ flex: 1 }}>`,
'edit-item photo picker',
);

replaceOnce(
`            <div className="jatb-shopify-content">\n              <ShopifyProductFields form={form} setForm={setForm} />`,
`            <div className="jatb-shopify-content">\n              <div className="jatb-shopify-photo">\n                <label className="jatb-label">Product image</label>\n                <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />\n              </div>\n              <ShopifyProductFields form={form} setForm={setForm} />`,
'edit-item Shopify photo area',
);

replaceOnce(
`      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }`,
`      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }\n      .jatb-shopify-photo { margin: 14px 0 16px; }\n      .jatb-shopify-create-btn { width: 100%; margin-top: 14px; }\n      .jatb-intake-primary.manual-only .jatb-intake-primary-fields { width: 100%; }\n      .jatb-publish-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }\n      .jatb-publish-option { position: relative; display: flex; align-items: flex-start; gap: 12px; min-height: 92px; padding: 14px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }\n      .jatb-publish-option:hover { border-color: #B8CBE2; }\n      .jatb-publish-option.active { border-color: var(--green); background: var(--green-soft); box-shadow: 0 0 0 1px rgba(29,95,168,.08); }\n      .jatb-publish-option > input { position: absolute; opacity: 0; pointer-events: none; }\n      .jatb-toggle { flex: 0 0 auto; width: 38px; height: 22px; padding: 2px; border-radius: 999px; background: #C9CDD2; transition: background .15s; }\n      .jatb-toggle span { display: block; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.22); transition: transform .15s; }\n      .jatb-publish-option.active .jatb-toggle { background: var(--green); }\n      .jatb-publish-option.active .jatb-toggle span { transform: translateX(16px); }\n      .jatb-publish-copy { display: block; min-width: 0; }\n      .jatb-publish-copy strong { display: block; margin-bottom: 4px; font-size: 14px; color: var(--ink); }\n      .jatb-publish-copy small { display: block; color: var(--muted); font-size: 12px; line-height: 1.4; }\n      @media (max-width: 700px) { .jatb-publish-options { grid-template-columns: 1fr; } }`,
'Tier 1 Shopify styles',
);

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  console.log('Applied Tier 1 manual/Shopify item layout.');
} else {
  console.log('Tier 1 item layout already applied.');
}
