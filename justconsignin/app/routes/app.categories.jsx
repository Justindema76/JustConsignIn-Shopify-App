import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';

const STORAGE_KEY = 'justconsignin-category-prototype-v1';
const DEFAULT_CATEGORIES = [
  {
    id: 'clothing',
    name: 'Clothing',
    active: true,
    types: ['Onesie / Bodysuit', 'Sleeper / Pajamas', 'Top', 'Dress', 'Pants / Leggings', 'Other'],
  },
  {
    id: 'shoes',
    name: 'Shoes',
    active: true,
    types: ['Sneakers', 'Sandals', 'Boots', 'Booties', 'Slippers', 'Other'],
  },
  {
    id: 'accessories',
    name: 'Accessories',
    active: true,
    types: ['Hat', 'Mittens', 'Bib', 'Blanket', 'Diaper Bag', 'Other'],
  },
];

function makeId(value) {
  return `${value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category'}-${Date.now()}`;
}

export default function CategoriesPrototype() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [newTypes, setNewTypes] = useState({});
  const [expanded, setExpanded] = useState(() => Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category.id, true])));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          setCategories(parsed);
          setExpanded(Object.fromEntries(parsed.map((category) => [category.id, true])));
        }
      }
    } catch {
      // Keep defaults when local prototype data is unavailable.
    }
  }, []);

  const activeCount = useMemo(() => categories.filter((category) => category.active).length, [categories]);

  function updateCategory(id, changes) {
    setCategories((current) => current.map((category) => (
      category.id === id ? { ...category, ...changes } : category
    )));
    setSaved(false);
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const id = makeId(name);
    setCategories((current) => [...current, { id, name, active: true, types: [] }]);
    setExpanded((current) => ({ ...current, [id]: true }));
    setNewCategory('');
    setSaved(false);
  }

  function removeCategory(id) {
    setCategories((current) => current.filter((category) => category.id !== id));
    setSaved(false);
  }

  function addType(categoryId) {
    const value = String(newTypes[categoryId] || '').trim();
    if (!value) return;
    setCategories((current) => current.map((category) => (
      category.id === categoryId && !category.types.some((type) => type.toLowerCase() === value.toLowerCase())
        ? { ...category, types: [...category.types, value] }
        : category
    )));
    setNewTypes((current) => ({ ...current, [categoryId]: '' }));
    setSaved(false);
  }

  function removeType(categoryId, typeIndex) {
    setCategories((current) => current.map((category) => (
      category.id === categoryId
        ? { ...category, types: category.types.filter((_, index) => index !== typeIndex) }
        : category
    )));
    setSaved(false);
  }

  function moveCategory(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    setCategories((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function savePrototype() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetPrototype() {
    setCategories(DEFAULT_CATEGORIES);
    setExpanded(Object.fromEntries(DEFAULT_CATEGORIES.map((category) => [category.id, true])));
    window.localStorage.removeItem(STORAGE_KEY);
    setSaved(false);
  }

  return (
    <main className="category-prototype">
      <style>{`
        .category-prototype {
          min-height: 100vh;
          background: #f6f6f7;
          color: #202223;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 28px;
        }
        .category-shell { max-width: 980px; margin: 0 auto; }
        .category-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 20px; margin-bottom: 20px;
        }
        .category-eyebrow {
          display: block; margin-bottom: 5px; color: #1d5fa8;
          font-size: 12px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase;
        }
        .category-header h1 { margin: 0; font-size: 28px; line-height: 1.2; }
        .category-header p { max-width: 650px; margin: 8px 0 0; color: #6d7175; font-size: 14px; line-height: 1.5; }
        .category-summary {
          flex: 0 0 auto; padding: 11px 14px; border: 1px solid #e1e3e5;
          border-radius: 11px; background: #fff; color: #6d7175; font-size: 13px;
        }
        .category-summary strong { color: #202223; }
        .category-add-card, .category-card {
          border: 1px solid #e1e3e5; border-radius: 13px;
          background: #fff; box-shadow: 0 1px 0 rgba(0,0,0,.03);
        }
        .category-add-card { display: flex; gap: 10px; padding: 15px; margin-bottom: 14px; }
        .category-input {
          width: 100%; min-width: 0; padding: 11px 13px; border: 1px solid #d9dcdf;
          border-radius: 9px; background: #fff; color: #202223; font: inherit;
        }
        .category-input:focus { outline: 3px solid #e4eef9; border-color: #1d5fa8; }
        .category-button {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 42px; padding: 10px 15px; border: 0; border-radius: 9px;
          background: #1d5fa8; color: #fff; font: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
        }
        .category-button.secondary { background: #fff; color: #143f73; border: 1px solid #d9dcdf; }
        .category-button.danger { background: #fff; color: #b42318; border: 1px solid #f4c7c3; }
        .category-list { display: grid; gap: 12px; }
        .category-card.disabled { background: #fafafa; }
        .category-card-header {
          display: grid; grid-template-columns: auto minmax(0,1fr) auto auto auto;
          align-items: center; gap: 10px; padding: 14px;
        }
        .category-order { display: flex; gap: 4px; }
        .category-icon-button {
          display: inline-grid; place-items: center; width: 32px; height: 32px;
          border: 1px solid #e1e3e5; border-radius: 8px; background: #fff; color: #5c5f62; cursor: pointer;
        }
        .category-icon-button:disabled { opacity: .35; cursor: default; }
        .category-name-input {
          width: 100%; min-width: 0; border: 0; border-bottom: 1px solid transparent;
          padding: 7px 3px; background: transparent; color: #202223; font: inherit;
          font-size: 16px; font-weight: 700;
        }
        .category-name-input:focus { outline: 0; border-bottom-color: #1d5fa8; }
        .category-status {
          display: flex; align-items: center; gap: 8px; color: #6d7175; font-size: 12px;
        }
        .category-switch { position: relative; width: 38px; height: 22px; }
        .category-switch input { position: absolute; opacity: 0; }
        .category-switch span {
          position: absolute; inset: 0; border-radius: 999px; background: #c9cdd2; cursor: pointer;
        }
        .category-switch span::after {
          content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
          border-radius: 50%; background: white; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .15s;
        }
        .category-switch input:checked + span { background: #1d5fa8; }
        .category-switch input:checked + span::after { transform: translateX(16px); }
        .category-body { border-top: 1px solid #e1e3e5; padding: 14px; }
        .category-type-label {
          margin-bottom: 9px; color: #6d7175; font-size: 11px; font-weight: 750;
          letter-spacing: .05em; text-transform: uppercase;
        }
        .category-types { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .category-type {
          display: inline-flex; align-items: center; gap: 7px; padding: 8px 10px;
          border: 1px solid #dce0e3; border-radius: 999px; background: #f8f9fa; font-size: 12px;
        }
        .category-type button { border: 0; padding: 0; background: transparent; color: #6d7175; cursor: pointer; }
        .category-type-add { display: flex; gap: 8px; }
        .category-empty { margin-bottom: 12px; color: #8c9196; font-size: 13px; }
        .category-actions {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-top: 18px; padding-top: 18px; border-top: 1px solid #e1e3e5;
        }
        .category-actions-right { display: flex; gap: 9px; }
        .category-note {
          margin-top: 14px; padding: 12px 14px; border: 1px solid #efd7a8;
          border-radius: 10px; background: #fff4d6; color: #66521a; font-size: 12px; line-height: 1.5;
        }
        @media (max-width: 720px) {
          .category-prototype { padding: 18px 14px; }
          .category-header { flex-direction: column; }
          .category-add-card, .category-type-add { flex-direction: column; }
          .category-card-header { grid-template-columns: auto minmax(0,1fr) auto; }
          .category-status { grid-column: 2 / 3; }
          .category-delete { grid-column: 3; grid-row: 1 / 3; }
          .category-actions { align-items: stretch; flex-direction: column; }
          .category-actions-right { flex-direction: column-reverse; }
          .category-button { width: 100%; }
        }
      `}</style>

      <div className="category-shell">
        <header className="category-header">
          <div>
            <span className="category-eyebrow">Prototype</span>
            <h1>Categories and item types</h1>
            <p>Create the categories your store actually uses. These are internal consignment categories and remain separate from Shopify product categories.</p>
          </div>
          <div className="category-summary"><strong>{activeCount}</strong> active · {categories.length} total</div>
        </header>

        <section className="category-add-card">
          <input
            className="category-input"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') addCategory(); }}
            placeholder="New category name, e.g. Toys"
          />
          <button type="button" className="category-button" onClick={addCategory} disabled={!newCategory.trim()}>
            <Plus size={16} /> Add category
          </button>
        </section>

        <section className="category-list">
          {categories.map((category, index) => (
            <article key={category.id} className={`category-card ${category.active ? '' : 'disabled'}`}>
              <div className="category-card-header">
                <div className="category-order">
                  <button type="button" className="category-icon-button" onClick={() => moveCategory(index, -1)} disabled={index === 0} aria-label="Move category up"><ChevronUp size={15} /></button>
                  <button type="button" className="category-icon-button" onClick={() => moveCategory(index, 1)} disabled={index === categories.length - 1} aria-label="Move category down"><ChevronDown size={15} /></button>
                </div>
                <input
                  className="category-name-input"
                  value={category.name}
                  onChange={(event) => updateCategory(category.id, { name: event.target.value })}
                  aria-label="Category name"
                />
                <label className="category-status">
                  <span>{category.active ? 'Active' : 'Disabled'}</span>
                  <span className="category-switch">
                    <input type="checkbox" checked={category.active} onChange={(event) => updateCategory(category.id, { active: event.target.checked })} />
                    <span />
                  </span>
                </label>
                <button type="button" className="category-icon-button" onClick={() => setExpanded((current) => ({ ...current, [category.id]: !current[category.id] }))} aria-label="Expand category">
                  {expanded[category.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button type="button" className="category-icon-button category-delete" onClick={() => removeCategory(category.id)} aria-label="Delete category"><Trash2 size={15} /></button>
              </div>

              {expanded[category.id] && (
                <div className="category-body">
                  <div className="category-type-label">Item types</div>
                  {category.types.length ? (
                    <div className="category-types">
                      {category.types.map((type, typeIndex) => (
                        <span key={`${category.id}-${type}-${typeIndex}`} className="category-type">
                          {type}
                          <button type="button" onClick={() => removeType(category.id, typeIndex)} aria-label={`Remove ${type}`}><X size={13} /></button>
                        </span>
                      ))}
                    </div>
                  ) : <div className="category-empty">No item types yet.</div>}

                  <div className="category-type-add">
                    <input
                      className="category-input"
                      value={newTypes[category.id] || ''}
                      onChange={(event) => setNewTypes((current) => ({ ...current, [category.id]: event.target.value }))}
                      onKeyDown={(event) => { if (event.key === 'Enter') addType(category.id); }}
                      placeholder={`Add an item type to ${category.name || 'this category'}`}
                    />
                    <button type="button" className="category-button secondary" onClick={() => addType(category.id)} disabled={!String(newTypes[category.id] || '').trim()}>
                      <Plus size={15} /> Add type
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>

        <div className="category-actions">
          <div className="category-note">Prototype data is saved only in this browser. Existing item records will not be changed when a category is renamed, disabled, or deleted.</div>
          <div className="category-actions-right">
            <button type="button" className="category-button danger" onClick={resetPrototype}>Reset prototype</button>
            <button type="button" className="category-button" onClick={savePrototype}>
              <Check size={16} /> {saved ? 'Saved' : 'Save prototype'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
