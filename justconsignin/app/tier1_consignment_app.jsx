import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingBag } from 'lucide-react';
import ConsignmentIntakeApp from './consignment_intake';
import { getConsignmentData } from './consignmentApi';

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

function productChannel(item) {
  if (!item?.shopifyProductId) {
    return { label: 'Manual', className: 'manual' };
  }

  if (String(item.shopifyProductStatus || '').toUpperCase() !== 'ACTIVE') {
    return { label: 'Shopify Draft', className: 'shopify-draft' };
  }

  if (item.publishOnline || item.salesChannel === 'pos_online' || item.onlineStorePublished) {
    return { label: 'POS + Online', className: 'online' };
  }

  return { label: 'POS', className: 'pos' };
}

export default function TierOneConsignmentApp() {
  const [shopifyTarget, setShopifyTarget] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadItems() {
      try {
        const data = await getConsignmentData();
        if (active) setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (active) setItems([]);
      }
    }

    loadItems();
    const refreshTimer = window.setInterval(loadItems, 5000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

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

    function configureItemList() {
      const header = document.querySelector('.cm-list-row.cm-list-head');
      if (header && !header.querySelector('.tier1-product-column-heading')) {
        const heading = document.createElement('span');
        heading.className = 'tier1-product-column-heading';
        heading.textContent = 'Product';
        header.insertBefore(heading, header.lastElementChild);
      }

      document.querySelectorAll('button.cm-list-row:not(.cm-list-head)').forEach((row) => {
        const itemDetails = row.querySelector('.cm-item-primary > span:last-child > span');
        const itemNumber = String(itemDetails?.textContent || '').split('·')[0].trim();
        const item = items.find((entry) => String(entry.itemNumber || '').trim() === itemNumber);
        if (!item) return;

        const channel = productChannel(item);
        let badge = row.querySelector('.tier1-product-channel');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tier1-product-channel';
          row.insertBefore(badge, row.lastElementChild);
        }
        badge.className = `tier1-product-channel ${channel.className}`;
        badge.textContent = channel.label;
      });
    }

    function configure() {
      configureIntake();
      configureEdit();
      configureItemList();
    }

    configure();
    const observer = new MutationObserver(configure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [items]);

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

        .cm-list-row {
          grid-template-columns: minmax(220px, 2fr) minmax(130px, 1fr) 110px 110px 125px 105px !important;
        }
        .tier1-product-channel {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-width: 74px;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 750;
          line-height: 1;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .tier1-product-channel.manual {
          background: #F1F2F3;
          color: #5C5F62;
        }
        .tier1-product-channel.shopify-draft {
          background: var(--gold-soft);
          color: #8A5D14;
        }
        .tier1-product-channel.pos {
          background: var(--green-soft);
          color: var(--green-dark);
        }
        .tier1-product-channel.online {
          background: #DFF5E7;
          color: #17663A;
        }

        @media (max-width: 900px) {
          .cm-list-row {
            grid-template-columns: minmax(180px, 2fr) minmax(110px, 1fr) 90px 110px 92px !important;
          }
          .cm-list-row > :nth-child(4) { display: none; }
        }
        @media (max-width: 700px) {
          .tier1-manual-primary .jatb-intake-primary-fields {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .tier1-shopify-photo-area { flex-direction: column; }
        }
        @media (max-width: 640px) {
          .cm-list-row {
            grid-template-columns: minmax(0, 1fr) auto !important;
          }
          .cm-list-row > :not(.cm-item-primary):not(.tier1-product-channel):last-child {
            display: none;
          }
          .tier1-product-channel {
            justify-self: end;
          }
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
