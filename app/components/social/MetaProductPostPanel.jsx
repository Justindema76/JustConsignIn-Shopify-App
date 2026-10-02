/* eslint-disable react/prop-types */
import { Camera, Check, Tag } from 'lucide-react';

export default function MetaProductPostPanel({ item, disabled = false }) {
  const productReady = Boolean(item?.shopifyProductId);
  const title = String(item?.shopifyTitle || item?.description || '').trim();

  return (
    <details className="consignment-form-section meta-product-post-panel" open>
      <summary className="consignment-form-section-head">
        <span>
          <span className="consignment-form-section-marker" aria-hidden="true" />
          <Camera size={17} aria-hidden="true" />
          <h2>Meta product post</h2>
        </span>
        <span className="consignment-row-sub">Facebook & Instagram product tagging</span>
      </summary>

      <div className="consignment-form-section-body">
        <div className="consignment-card">
          <strong>{productReady ? (title || 'Shopify product ready') : 'Create the Shopify product first'}</strong>
          <p className="consignment-form-help">
            {productReady
              ? 'This Shopify product is ready to be used by the separate Meta product-tagging workflow.'
              : 'The Meta product post will use the Shopify product created above.'}
          </p>
        </div>

        <div className="social-post-actions social-post-actions-primary">
          <button
            type="button"
            className="consignment-btn"
            disabled={disabled || !productReady}
            title={productReady ? 'Meta publishing connection required' : 'Create the Shopify product first'}
          >
            {productReady ? <Tag size={16} /> : <Check size={16} />}
            Create tagged Meta post
          </button>
        </div>

        {productReady && (
          <p className="consignment-form-help">
            Separate from Buffer. The direct Meta publishing connection will power this action.
          </p>
        )}
      </div>
    </details>
  );
}
