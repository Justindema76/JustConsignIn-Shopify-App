import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ShoppingBag } from 'lucide-react';
import ConsignmentIntakeApp from './consignment_intake';

const TIER_ONE_CATEGORIES = [
  'Clothing',
  'Shoes',
  'Jewellery',
  'Handbags',
  'Home Décor',
  'Furniture',
  'Electronics',
  'Appliances',
  'Books',
  'Movies & Music',
  'Video Games',
  'Collectibles',
  'Sporting Goods',
  'Tools',
  'Toys',
  'Baby Gear',
  'Pet Supplies',
  'Outdoor & Garden',
  'Art',
  'Automotive',
  'Other',
];

function ShopifySaveButton({ target }) {
  function saveToShopify() {
    const createCheckbox = target.querySelector('.jatb-product-choice:not(.online) input[type="checkbox"]');
    if (createCheckbox && !createCheckbox.checked) createCheckbox.click();

    window.setTimeout(() => {
      const saveButton = document.querySelector('.jatb-fab-wrap .jatb-btn');
      saveButton?.click();
    }, 0);
  }

  return (
    <button type="button" className="tier1-shopify-save" onClick={saveToShopify}>
      <ShoppingBag size={17} /> Save item and create Shopify product
    </button>
  );
}

export default function TierOneConsignmentApp() {
  const [shopifyTarget, setShopifyTarget] = useState(null);

  useEffect(() => {
    function replaceCategoryOptions(select) {
      if (!select || select.dataset.tierOneCategories === 'true') return;

      const currentValue = TIER_ONE_CATEGORIES.includes(select.value) ? select.value : 'Other';
      select.replaceChildren(...TIER_ONE_CATEGORIES.map((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        return option;
      }));
      select.value = currentValue;
      select.dataset.tierOneCategories = 'true';

      if (currentValue !== select.value) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function configureIntake() {
      const intakePrimary = document.querySelector('.jatb-intake-primary');
      const shopifyContent = document.querySelector('.jatb-shopify-section .jatb-shopify-content');
      const photo = intakePrimary?.querySelector(':scope > .jatb-photo-wrap');

      if (intakePrimary) intakePrimary.classList.add('tier1-manual-primary');
      if (shopifyContent) {
        shopifyContent.classList.add('tier1-shopify-content');
        if (photo && !shopifyContent.contains(photo)) {
          const photoArea = document.createElement('div');
          photoArea.className = 'tier1-shopify-photo-area';
          const label = document.createElement('div');
          label.className = 'jatb-label';
          label.textContent = 'Product image';
          photoArea.append(label, photo);
          shopifyContent.prepend(photoArea);
        }
        setShopifyTarget(shopifyContent);
      } else {
        setShopifyTarget(null);
      }

      const detailGrid = document.querySelector('.jatb-detail-card .jatb-detail-grid');
      const categoryField = detailGrid?.querySelector(':scope > .jatb-field:first-child');
      const typeField = detailGrid?.querySelector(':scope > .jatb-field:nth-child(2)');
      replaceCategoryOptions(categoryField?.querySelector('select'));
      if (typeField) typeField.classList.add('tier1-unused-subcategory');

      const createChoice = shopifyContent?.querySelector('.jatb-product-choice:not(.online)');
      if (createChoice) createChoice.classList.add('tier1-hidden-create-choice');
    }

    function configureEdit() {
      const editCard = document.querySelector('.jatb-body > .jatb-card');
      const editShopifyContent = document.querySelector('.jatb-product-card .jatb-shopify-content');
      const photo = editCard?.querySelector('.jatb-photo-wrap');
      if (editShopifyContent && photo && !editShopifyContent.contains(photo)) {
        const photoArea = document.createElement('div');
        photoArea.className = 'tier1-shopify-photo-area';
        const label = document.createElement('div');
        label.className = 'jatb-label';
        label.textContent = 'Product image';
        photoArea.append(label, photo);
        editShopifyContent.prepend(photoArea);
      }

      const detailGrid = editCard?.querySelector('.jatb-detail-card .jatb-detail-grid');
      const categoryField = detailGrid?.querySelector(':scope > .jatb-field:first-child');
      const typeField = detailGrid?.querySelector(':scope > .jatb-field:nth-child(2)');
      replaceCategoryOptions(categoryField?.querySelector('select'));
      if (typeField) typeField.classList.add('tier1-unused-subcategory');
    }

    function configure() {
      configureIntake();
      configureEdit();
    }

    configure();
    const observer = new MutationObserver(configure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function saveManualItem() {
    const createCheckbox = document.querySelector('.jatb-shopify-section .jatb-product-choice:not(.online) input[type="checkbox"]');
    if (createCheckbox?.checked) createCheckbox.click();
  }

  return (
    <>
      <style>{`
        .tier1-manual-primary {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .tier1-manual-primary .jatb-intake-primary-fields {
          width: 100% !important;
          grid-template-columns: minmax(0, 1fr) minmax(150px, 240px) !important;
        }
        .tier1-shopify-photo-area {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin: 14px 0 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--line);
        }
        .tier1-shopify-photo-area > .jatb-label {
          min-width: 110px;
          padding-top: 6px;
        }
        .tier1-unused-subcategory { display: none !important; }
        .tier1-hidden-create-choice { display: none !important; }
        .tier1-shopify-save {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 14px;
          border: 0;
          border-radius: 10px;
          padding: 13px 18px;
          background: var(--green);
          color: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .jatb-fab-wrap .jatb-btn { font-size: 0 !important; }
        .jatb-fab-wrap .jatb-btn::after {
          content: 'Save manual item';
          font-size: 14px;
          font-weight: 600;
        }
        .jatb-fab-wrap .jatb-btn svg { width: 18px; height: 18px; }
        @media (max-width: 700px) {
          .tier1-manual-primary .jatb-intake-primary-fields {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .tier1-shopify-photo-area { flex-direction: column; }
        }
      `}</style>

      <div onClickCapture={(event) => {
        if (event.target.closest('.jatb-fab-wrap .jatb-btn')) saveManualItem();
      }}>
        <ConsignmentIntakeApp />
      </div>

      {shopifyTarget && createPortal(<ShopifySaveButton target={shopifyTarget} />, shopifyTarget)}
    </>
  );
}
