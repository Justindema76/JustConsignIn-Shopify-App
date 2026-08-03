import { useEffect, useState } from 'react';
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

function categorySelectValue(select) {
  return select?.value && TIER_ONE_CATEGORIES.includes(select.value)
    ? select.value
    : 'Clothing';
}

export default function TierOneConsignmentApp() {
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
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      const method = String(init?.method || 'GET').toUpperCase();

      if (url.includes('/api/consignment') && ['POST', 'PATCH'].includes(method) && typeof init.body === 'string') {
        try {
          const payload = JSON.parse(init.body);
          const categorySelects = [...document.querySelectorAll('.tier1-category-select')];

          if (payload.operation === 'createItems' && Array.isArray(payload.items)) {
            payload.items = payload.items.map((item, index) => ({
              ...item,
              category: categorySelectValue(categorySelects[index] || categorySelects[0]),
              type: item.type || '',
            }));
            init = { ...init, body: JSON.stringify(payload) };
          }

          if (payload.operation === 'updateItem' && payload.item) {
            payload.item = {
              ...payload.item,
              category: categorySelectValue(categorySelects[0]),
              type: payload.item.type || '',
            };
            init = { ...init, body: JSON.stringify(payload) };
          }
        } catch {
          // Leave unrelated requests unchanged.
        }
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    function addTierOneCategory(field) {
      if (!field || field.querySelector('.tier1-category-select')) return;

      const originalSelect = field.querySelector('select');
      if (!originalSelect) return;

      const customSelect = document.createElement('select');
      customSelect.className = 'jatb-select tier1-category-select';
      customSelect.setAttribute('aria-label', 'Category');

      TIER_ONE_CATEGORIES.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        customSelect.appendChild(option);
      });

      const savedValue = TIER_ONE_CATEGORIES.includes(originalSelect.value)
        ? originalSelect.value
        : 'Clothing';
      customSelect.value = savedValue;
      originalSelect.classList.add('tier1-original-category');
      originalSelect.insertAdjacentElement('afterend', customSelect);
    }

    function movePhotoToShopify() {
      const intakePrimary = document.querySelector('.jatb-intake-primary');
      const shopifyContent = document.querySelector('.jatb-shopify-section .jatb-shopify-content');
      const photo = intakePrimary?.querySelector(':scope > .jatb-photo-wrap');

      if (intakePrimary) intakePrimary.classList.add('tier1-manual-primary');
      if (!shopifyContent || !photo || shopifyContent.contains(photo)) return;

      let photoArea = shopifyContent.querySelector('.tier1-shopify-photo-area');
      if (!photoArea) {
        photoArea = document.createElement('div');
        photoArea.className = 'tier1-shopify-photo-area';
        const label = document.createElement('div');
        label.className = 'jatb-label';
        label.textContent = 'Product image';
        photoArea.appendChild(label);
        shopifyContent.prepend(photoArea);
      }
      photoArea.appendChild(photo);
    }

    function moveEditPhotoToShopify() {
      const editCard = document.querySelector('.jatb-body > .jatb-card');
      const shopifyContent = document.querySelector('.jatb-product-card .jatb-shopify-content');
      const photo = editCard?.querySelector('.jatb-photo-wrap');
      if (!shopifyContent || !photo || shopifyContent.contains(photo)) return;

      let photoArea = shopifyContent.querySelector('.tier1-shopify-photo-area');
      if (!photoArea) {
        photoArea = document.createElement('div');
        photoArea.className = 'tier1-shopify-photo-area';
        const label = document.createElement('div');
        label.className = 'jatb-label';
        label.textContent = 'Product image';
        photoArea.appendChild(label);
        shopifyContent.prepend(photoArea);
      }
      photoArea.appendChild(photo);
    }

    function moveManualSaveButton() {
      const floatingWrap = document.querySelector('.jatb-fab-wrap');
      const saveButton = floatingWrap?.querySelector('.jatb-btn');
      if (!saveButton) return;

      saveButton.classList.add('tier1-manual-save-button');
      saveButton.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = ' Save manual item';
      });

      const cards = [...document.querySelectorAll('.jatb-body > .jatb-card')];
      let manualSection = cards.find((card) => /^manual sale/i.test(card.textContent.trim()));

      if (!manualSection) {
        const shopifySection = document.querySelector('.jatb-shopify-section');
        const detailCard = document.querySelector('.jatb-detail-card');
        if (!shopifySection || !detailCard) return;

        manualSection = document.createElement('section');
        manualSection.className = 'jatb-card tier1-manual-section';
        manualSection.innerHTML = `
          <div class="tier1-manual-heading">
            <strong>Manual item</strong>
            <span>Save only to the consignment records. No Shopify product will be created.</span>
          </div>
          <div class="tier1-manual-action"></div>
        `;
        shopifySection.parentElement.insertBefore(manualSection, shopifySection);
      }

      let actionArea = manualSection.querySelector('.tier1-manual-action');
      if (!actionArea) {
        actionArea = document.createElement('div');
        actionArea.className = 'tier1-manual-action';
        manualSection.appendChild(actionArea);
      }

      if (!actionArea.contains(saveButton)) actionArea.appendChild(saveButton);
      floatingWrap.classList.add('tier1-empty-save-wrap');
    }

    function configureCategories() {
      document.querySelectorAll('.jatb-detail-card .jatb-detail-grid').forEach((grid) => {
        const fields = [...grid.querySelectorAll(':scope > .jatb-field')];
        const categoryField = fields.find((field) => /^category$/i.test(field.querySelector('.jatb-label')?.textContent.trim()));
        const typeField = fields.find((field) => /^(clothing type|type|subcategory)$/i.test(field.querySelector('.jatb-label')?.textContent.trim()));
        addTierOneCategory(categoryField);
        if (typeField) typeField.classList.add('tier1-unused-subcategory');
      });
    }

    function configureConsignorSort() {
      const title = document.querySelector('.jatb-title');
      if (title?.textContent.trim() !== 'Choose consignor') return;

      const body = document.querySelector('.jatb-body');
      const search = body?.querySelector('.jatb-search');
      if (!body || !search || body.querySelector('.tier1-consignor-sort')) return;

      const sortWrap = document.createElement('div');
      sortWrap.className = 'tier1-consignor-sort';
      sortWrap.innerHTML = `
        <label for="tier1-consignor-sort-select">Sort consignors</label>
        <select id="tier1-consignor-sort-select" class="jatb-select">
          <option value="number">Consignor number</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
        </select>
      `;
      search.insertAdjacentElement('afterend', sortWrap);

      const applySort = () => {
        const rows = [...body.querySelectorAll('.jatb-row-btn')]
          .filter((row) => row.querySelector('.jatb-row-name'));
        const mode = sortWrap.querySelector('select').value;

        rows.sort((a, b) => {
          const aName = a.querySelector('.jatb-row-name')?.textContent.trim() || '';
          const bName = b.querySelector('.jatb-row-name')?.textContent.trim() || '';
          const aNumber = Number((a.querySelector('.jatb-row-sub')?.textContent.match(/#(\d+)/) || [])[1] || 0);
          const bNumber = Number((b.querySelector('.jatb-row-sub')?.textContent.match(/#(\d+)/) || [])[1] || 0);
          if (mode === 'name-asc') return aName.localeCompare(bName);
          if (mode === 'name-desc') return bName.localeCompare(aName);
          return aNumber - bNumber;
        });

        rows.forEach((row) => body.appendChild(row));
      };

      sortWrap.querySelector('select').addEventListener('change', applySort);
      applySort();
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
          row.insertBefore(badge, row.lastElementChild);
        }
        badge.className = `tier1-product-channel ${channel.className}`;
        badge.textContent = channel.label;
      });
    }

    function configure() {
      movePhotoToShopify();
      moveEditPhotoToShopify();
      configureCategories();
      moveManualSaveButton();
      configureConsignorSort();
      configureItemList();
    }

    configure();
    const observer = new MutationObserver(configure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [items]);

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
        .tier1-original-category,
        .tier1-unused-subcategory {
          display: none !important;
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
        .tier1-empty-save-wrap {
          display: none !important;
        }
        .tier1-manual-section,
        .tier1-manual-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .tier1-manual-heading strong,
        .tier1-manual-heading span {
          display: block;
        }
        .tier1-manual-heading span {
          margin-top: 4px;
          color: var(--muted);
          font-size: 12px;
        }
        .tier1-manual-save-button {
          position: static !important;
          min-width: 190px;
          box-shadow: none !important;
        }
        .tier1-consignor-sort {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin: 0 0 12px;
        }
        .tier1-consignor-sort label {
          color: var(--muted);
          font-size: 12px;
          font-weight: 600;
        }
        .tier1-consignor-sort select {
          width: auto;
          min-width: 190px;
          padding: 9px 34px 9px 12px;
          font-size: 13px;
        }
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
        .tier1-product-channel.manual { background: #F1F2F3; color: #5C5F62; }
        .tier1-product-channel.shopify-draft { background: var(--gold-soft); color: #8A5D14; }
        .tier1-product-channel.pos { background: var(--green-soft); color: var(--green-dark); }
        .tier1-product-channel.online { background: #DFF5E7; color: #17663A; }

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
          .tier1-shopify-photo-area,
          .tier1-manual-section {
            flex-direction: column;
            align-items: stretch;
          }
          .tier1-manual-save-button { width: 100%; }
          .tier1-consignor-sort {
            align-items: stretch;
            flex-direction: column;
          }
          .tier1-consignor-sort select { width: 100%; }
        }
        @media (max-width: 640px) {
          .cm-list-row {
            grid-template-columns: minmax(0, 1fr) auto !important;
          }
          .tier1-product-channel { justify-self: end; }
        }
      `}</style>
      <ConsignmentIntakeApp />
    </>
  );
}
