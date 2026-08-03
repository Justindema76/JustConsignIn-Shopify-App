
/* eslint-disable react/prop-types, jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import {
  Search, Plus, ArrowLeft, Camera, X, ChevronRight, Phone, Mail,
  Loader2, Tag, Check, Trash2, ShoppingBag, ExternalLink, LayoutDashboard,
  Users, ReceiptText, WalletCards, PackageSearch, TrendingUp, CircleDollarSign,
  CalendarDays, FileUp, Download, MapPin, Pencil,
} from 'lucide-react';
import {
  createConsignor,
  createConsignmentItems,
  deleteConsignor,
  createShopifyProduct,
  activateShopifyProduct,
  deleteConsignmentItem,
  getConsignmentData,
  recordConsignorPayout,
  searchShopifyCategories,
  updateConsignmentItem,
  updateConsignmentItemStatus,
  updateConsignor,
  importConsignmentData,
} from './consignmentApi';

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

const CATEGORIES = ['Clothing', 'Shoes', 'Accessories'];
const TYPE_OPTIONS = {
  Clothing: [
    'Onesie / Bodysuit',
    'Sleeper / Pajamas',
    'Top',
    'Dress',
    'Pants / Leggings',
    'Shorts',
    'Romper / Overalls',
    'Outfit Set',
    'Outerwear / Jacket',
    'Swimwear',
    'Other',
  ],
  Shoes: ['Sneakers', 'Sandals', 'Boots', 'Booties', 'Slippers', 'Other'],
  Accessories: ['Hat', 'Mittens', 'Bib', 'Blanket', 'Diaper Bag', 'Feeding', 'Bath', 'Other'],
};
const CONDITIONS = ['New with tags', 'Like new', 'Good', 'Fair'];
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

/* ---------- shared styles ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

      .jatb {
        --bg: #F6F6F7;
        --surface: #FFFFFF;
        --ink: #202223;
        --muted: #6D7175;
        --green: #1D5FA8;
        --green-dark: #143F73;
        --green-soft: #E4EEF9;
        --gold: #B98900;
        --gold-soft: #FFF4D6;
        --line: #E1E3E5;
        --danger: #B42318;
        --danger-soft: #FEE4E2;
        font-family: 'Inter', system-ui, sans-serif;
        background: var(--bg);
        color: var(--ink);
        min-height: 100vh;
        width: 100%;
        max-width: 1240px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      .jatb * { box-sizing: border-box; }
      .jatb h1, .jatb h2, .jatb h3 {
        font-family: 'Fraunces', serif;
        margin: 0;
        color: var(--ink);
      }
      .jatb button { font-family: inherit; cursor: pointer; }
      .jatb input, .jatb select, .jatb textarea {
        font-family: inherit;
        font-size: 16px;
      }
      .jatb ::placeholder { color: #A6AC9B; }

      .jatb-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--bg);
        padding: 22px 24px 14px;
        border-bottom: 1px solid var(--line);
      }
      .jatb-header-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .jatb-header-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .jatb-header-action { flex-shrink: 0; }
      .jatb-header-action .jatb-btn {
        min-width: 0; padding: 10px 14px; border-radius: 9px; box-shadow: none;
      }
      .jatb-back {
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 999px;
        border: 1px solid var(--line); background: var(--surface);
        color: var(--ink); flex-shrink: 0;
      }
      .jatb-back:active { background: var(--green-soft); }
      .jatb-eyebrow {
        font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
        color: var(--green); font-weight: 600; margin: 0 0 2px;
      }
      .jatb-title { font-family: 'Inter', system-ui, sans-serif !important; font-size: 24px; font-weight: 700; line-height: 1.15; }

      .jatb-body { flex: 1; overflow-y: auto; padding: 20px 24px 110px; }

      .jatb-search {
        display: flex; align-items: center; gap: 8px;
        background: var(--surface); border: 1px solid var(--line);
        border-radius: 14px; padding: 11px 14px; margin-bottom: 14px;
      }
      .jatb-search input { border: none; outline: none; flex: 1; background: transparent; color: var(--ink); }
      .jatb-search svg { color: var(--muted); flex-shrink: 0; }

      .jatb-card {
        background: var(--surface); border: 1px solid var(--line);
        border-radius: 12px; padding: 16px; margin-bottom: 12px;
        box-shadow: 0 1px 0 rgba(0,0,0,.03);
      }
      .jatb-row-btn {
        width: 100%; text-align: left; display: flex; align-items: center;
        gap: 12px; background: var(--surface); border: 1px solid var(--line);
        border-radius: 12px; padding: 14px 14px; margin-bottom: 10px;
        transition: background .15s;
      }
      .jatb-row-btn:active { background: var(--green-soft); }

      .jatb-avatar {
        width: 42px; height: 42px; border-radius: 12px; background: var(--green-soft);
        color: var(--green-dark); display: flex; align-items: center; justify-content: center;
        font-family: 'Fraunces', serif; font-weight: 600; font-size: 16px; flex-shrink: 0;
      }
      .jatb-row-main { flex: 1; min-width: 0; }
      .jatb-row-name { font-weight: 600; font-size: 15px; }
      .jatb-row-sub { font-size: 13px; color: var(--muted); margin-top: 1px; }
      .jatb-chev { color: var(--muted); flex-shrink: 0; }

      .jatb-empty {
        text-align: center; padding: 60px 20px; color: var(--muted);
      }
      .jatb-empty h3 { font-size: 17px; margin-bottom: 6px; color: var(--ink); }
      .jatb-empty p { font-size: 14px; margin: 0; }

      .jatb-fab-wrap {
        position: sticky; bottom: 0; left: 0; right: 0; z-index: 15;
        padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
        background: linear-gradient(to top, var(--bg) 60%, transparent);
      }
      .jatb-btn {
        width: auto; min-width: 180px; display: flex; align-items: center; justify-content: center;
        gap: 8px; background: var(--green); color: #fff; border: none;
        border-radius: 10px; padding: 13px 18px; font-weight: 600; font-size: 14px;
        box-shadow: 0 6px 16px rgba(47,107,79,0.25); text-decoration: none;
      }
      .jatb-btn:active { background: var(--green-dark); }
      .jatb-btn.secondary {
        background: var(--surface); color: var(--green-dark); border: 1px solid var(--line);
        box-shadow: none;
      }
      .jatb-btn.secondary:active { background: var(--green-soft); }
      .jatb-btn.danger { background: var(--danger); box-shadow: 0 6px 16px rgba(179,73,47,0.25); }
      .jatb-btn:disabled { opacity: .5; }

      .jatb-field { margin-bottom: 14px; }
      .jatb-label {
        display: block; font-size: 12px; font-weight: 600; color: var(--muted);
        text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px;
      }
      .jatb-input, .jatb-select, .jatb-textarea {
        width: 100%; border: 1px solid var(--line); border-radius: 12px;
        padding: 12px 14px; background: var(--surface); color: var(--ink); outline: none;
      }
      .jatb-input:focus, .jatb-select:focus, .jatb-textarea:focus {
        border-color: var(--green); box-shadow: 0 0 0 3px var(--green-soft);
      }
      .jatb-row2 { display: flex; gap: 10px; }
      .jatb-row2 > * { flex: 1; }
      .jatb-section-heading {
        display: flex; align-items: center; justify-content: space-between;
        gap: 14px; margin: 0 0 8px;
      }
      .jatb-section-heading .jatb-label { margin: 0; }
      .jatb-item-number {
        flex: 0 0 auto; color: var(--green-dark); font-size: 22px;
        font-weight: 800; letter-spacing: .02em;
      }
      .jatb-detail-card { margin-top: 14px; }
      .jatb-detail-grid {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .jatb-detail-grid .jatb-field { min-width: 0; margin: 0; }
      .jatb-detail-grid .jatb-field.wide { grid-column: 1 / -1; }
      .jatb-shopify-section { margin-top: 14px; padding: 0; overflow: hidden; }
      .jatb-shopify-summary {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        padding: 15px 16px; cursor: pointer; list-style: none;
      }
      .jatb-shopify-summary::-webkit-details-marker { display: none; }
      .jatb-shopify-summary > span:first-child { display: flex; align-items: center; gap: 8px; }
      .jatb-shopify-summary::after { content: '⌄'; color: var(--muted); font-size: 18px; line-height: 1; }
      details[open] > .jatb-shopify-summary::after { transform: rotate(180deg); }
      .jatb-shopify-content { padding: 0 16px 16px; border-top: 1px solid var(--line); }
      .jatb-shopify-help { margin: 12px 0; color: var(--muted); font-size: 12px; line-height: 1.45; }
      .jatb-shopify-fields { margin-top: 12px; }
      .jatb-shopify-edit-details { margin: -2px 0 14px; border-bottom: 1px solid var(--line); }
      .jatb-shopify-edit-details .jatb-shopify-summary { padding: 10px 0 14px; }
      .jatb-shopify-edit-details .jatb-shopify-content { padding: 0 0 14px; }
      .jatb-add-another { width: 100%; margin-top: 14px; }

      .jatb-consignor-number-card {
        display: grid; grid-template-columns: minmax(0, 1fr) 112px;
        gap: 14px; align-items: end; margin-bottom: 14px;
      }
      .jatb-consignor-number-preview {
        display: grid; place-items: center; min-height: 64px;
        border: 1px solid #C9DDCE; border-radius: 12px;
        background: var(--green-soft); color: var(--green-dark);
        font-size: 26px; font-weight: 800;
      }

      .jatb-chiprow { display: flex; flex-wrap: wrap; gap: 8px; }
      .jatb-chip {
        border: 1px solid var(--line); background: var(--surface); color: var(--ink);
        border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 500;
      }
      .jatb-chip.active { background: var(--green); border-color: var(--green); color: #fff; }
      .cm-tab-count {
        display: inline-grid; place-items: center; min-width: 20px; height: 20px;
        margin-left: 4px; padding: 0 6px; border-radius: 999px;
        background: #E4E7EC; color: #344054; font-size: 11px; font-weight: 700;
      }
      .jatb-chip.active .cm-tab-count { background: rgba(255,255,255,.2); color: #fff; }
      .jatb-product-choice {
        display: flex; align-items: flex-start; gap: 10px;
        margin-top: 14px; padding: 13px; border-radius: 12px;
        background: var(--gold-soft); border: 1px solid #EFD7A8;
        cursor: pointer;
      }
      .jatb-product-choice input {
        width: 19px; height: 19px; margin: 1px 0 0; accent-color: var(--green);
      }
      .jatb-product-choice strong { display: block; font-size: 13px; margin-bottom: 2px; }
      .jatb-product-choice span { display: block; color: var(--muted); font-size: 11px; line-height: 1.4; }
      .jatb-product-choice.online {
        margin-top: 8px; margin-left: 28px; background: var(--green-soft);
        border-color: #C9DDCE;
      }
      .jatb-product-card {
        margin-bottom: 14px; padding: 13px; border-radius: 14px;
        background: var(--green-soft); border: 1px solid #C9DDCE;
      }
      .jatb-product-card.disabled {
        background: #F1F2F3; border-color: var(--line); color: var(--muted);
        opacity: .72; pointer-events: none;
      }
      .jatb-status-card {
        border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px;
        background: var(--surface); margin: 0 0 14px;
      }
      .jatb-manual-sale {
        display: block;
      }
      .jatb-manual-sale-copy { margin-bottom: 10px; }
      .jatb-manual-sale-copy strong { display: block; font-size: 13px; }
      .jatb-manual-sale-copy span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
      .jatb-manual-sale-controls {
        display: grid; grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px; align-items: end;
      }
      .jatb-manual-sale .jatb-field { margin: 0; }
      .jatb-sold-btn {
        min-width: 0; width: auto; padding: 11px 16px; border-radius: 9px;
        box-shadow: none; white-space: nowrap;
      }
      .jatb-status-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .jatb-status-actions .jatb-btn { min-width: 0; box-shadow: none; padding: 9px 13px; }
      .jatb-sold-status {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; min-height: 42px;
      }
      .jatb-sold-status .jatb-row-sub { text-align: right; }

      .jatb-badge {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
        padding: 4px 9px; border-radius: 999px;
      }
      .jatb-badge.draft { background: var(--gold-soft); color: #8A5D14; }
      .jatb-badge.available, .jatb-badge.active { background: #DFF5E7; color: #17663A; }
      .jatb-badge.sold { background: #E4E7EC; color: #344054; }
      .jatb-badge.paid { background: #DFF5E7; color: #17663A; }
      .jatb-badge.unpaid { background: var(--gold-soft); color: #8A5D14; }
      .jatb-badge.returned, .jatb-badge.donated { background: #F2F4F7; color: #667085; }

      .cm-main-nav {
        display: flex; align-items: center; gap: 4px; padding: 10px 24px;
        background: var(--surface); border-bottom: 1px solid var(--line);
        position: sticky; top: 0; z-index: 20;
      }
      .cm-brand {
        display: flex; align-items: center; gap: 10px; margin-right: 24px;
        font-size: 15px; font-weight: 700; white-space: nowrap;
      }
      .cm-brand-mark {
        display: grid; place-items: center; width: 34px; height: 34px;
        border-radius: 9px; background: var(--green); color: white;
      }
      .cm-nav-button {
        display: flex; align-items: center; gap: 7px; padding: 9px 11px;
        border: 0; border-radius: 8px; background: transparent; color: var(--muted);
        font-size: 13px; font-weight: 600;
      }
      .cm-nav-button:hover { background: #F1F2F3; color: var(--ink); }
      .cm-nav-button.active { background: var(--green-soft); color: var(--green-dark); }
      .cm-dashboard-grid {
        display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;
        margin-bottom: 20px;
      }
      .cm-metric {
        width: 100%; text-align: left; color: inherit; font: inherit;
        background: var(--surface); border: 1px solid var(--line); border-radius: 12px;
        padding: 16px; min-height: 118px;
        transition: border-color .15s, box-shadow .15s, transform .15s;
      }
      .cm-metric:hover { border-color: #AEB4B8; box-shadow: 0 4px 14px rgba(0,0,0,.06); transform: translateY(-1px); }
      .cm-metric:focus-visible { outline: 3px solid var(--green-soft); border-color: var(--green); }
      .cm-metric-icon {
        width: 34px; height: 34px; border-radius: 9px; background: var(--green-soft);
        color: var(--green-dark); display: grid; place-items: center; margin-bottom: 14px;
      }
      .cm-metric-label { color: var(--muted); font-size: 12px; font-weight: 600; }
      .cm-metric-value { font-size: 25px; font-weight: 700; margin-top: 4px; letter-spacing: -.02em; }
      .cm-metric-note { color: var(--muted); font-size: 11px; margin-top: 4px; }
      .cm-section-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, .8fr); gap: 14px; }
      .cm-section-title {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; margin: 4px 0 12px;
      }
      .cm-section-title h2 { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 700; }
      .cm-link-button { border: 0; background: transparent; color: var(--green); font-size: 12px; font-weight: 600; }
      .cm-toolbar {
        display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;
      }
      .cm-toolbar .jatb-search { margin: 0; flex: 1; min-width: 220px; }
      .cm-filter-select { width: auto; min-width: 170px; padding: 10px 34px 10px 12px; font-size: 13px !important; }
      .cm-quick-actions {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px; margin-bottom: 16px;
      }
      .cm-quick-action {
        display: flex; align-items: center; gap: 11px; min-height: 64px;
        padding: 13px 14px; border: 1px solid var(--line); border-radius: 12px;
        background: var(--surface); color: var(--ink); text-align: left;
      }
      .cm-quick-action.primary { background: var(--green); color: #fff; border-color: var(--green); }
      .cm-quick-action-icon {
        width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
        background: var(--green-soft); color: var(--green-dark); flex-shrink: 0;
      }
      .cm-quick-action.primary .cm-quick-action-icon { background: rgba(255,255,255,.18); color: #fff; }
      .cm-quick-action strong { display: block; font-size: 14px; }
      .cm-quick-action-copy span { display: block; font-size: 11px; opacity: .75; margin-top: 2px; }
      .jatb-optional {
        border: 1px solid var(--line); border-radius: 12px; margin-top: 14px;
        background: #FAFBFB; overflow: hidden;
      }
      .jatb-optional summary {
        cursor: pointer; padding: 13px 14px; font-size: 13px; font-weight: 700;
        color: var(--green-dark); list-style-position: inside;
      }
      .jatb-optional-body { padding: 2px 14px 14px; }
      .jatb-category-results {
        border: 1px solid var(--line); border-radius: 10px; background: var(--surface);
        margin-top: 6px; overflow: hidden;
      }
      .jatb-category-result {
        width: 100%; border: 0; border-bottom: 1px solid var(--line);
        background: transparent; padding: 10px 12px; text-align: left; font-size: 12px;
      }
      .jatb-category-result:last-child { border-bottom: 0; }
      .jatb-selected-category {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        margin-top: 7px; padding: 9px 11px; background: var(--green-soft);
        border-radius: 9px; color: var(--green-dark); font-size: 12px;
      }
      .cm-header-actions { display: flex; gap: 8px; align-items: center; }
      .cm-header-actions .jatb-btn { min-width: 0; }
      .cm-data-menu { position: relative; }
      .cm-data-menu > summary {
        list-style: none; display: flex; align-items: center; gap: 7px;
        min-height: 40px; padding: 9px 12px; border: 1px solid var(--line);
        border-radius: 9px; background: var(--surface); color: var(--green-dark);
        font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .cm-data-menu > summary::-webkit-details-marker { display: none; }
      .cm-data-menu-popover {
        position: absolute; top: calc(100% + 6px); right: 0; z-index: 30;
        width: 150px; padding: 5px; border: 1px solid var(--line);
        border-radius: 10px; background: var(--surface);
        box-shadow: 0 10px 28px rgba(0,0,0,.14);
      }
      .cm-data-menu-popover button {
        width: 100%; display: flex; align-items: center; gap: 8px;
        border: 0; border-radius: 7px; padding: 10px;
        background: transparent; color: var(--ink); font-size: 13px; text-align: left;
      }
      .cm-data-menu-popover button:hover { background: var(--green-soft); }
      .cm-import-drop {
        border: 1px dashed #AEB4B8; border-radius: 12px; padding: 24px 18px;
        background: var(--surface); text-align: center; margin-bottom: 14px;
      }
      .cm-import-drop input { display: none; }
      .cm-import-drop label { cursor: pointer; display: grid; justify-items: center; gap: 8px; color: var(--green-dark); font-weight: 700; }
      .cm-import-help { color: var(--muted); font-size: 12px; line-height: 1.5; margin-top: 7px; }
      .cm-import-preview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
      .cm-import-preview div { background: #F9FAFB; border-radius: 9px; padding: 12px; }
      .cm-import-preview span { display: block; color: var(--muted); font-size: 11px; }
      .cm-import-preview strong { display: block; margin-top: 3px; font-size: 16px; }
      .cm-import-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .cm-import-actions .jatb-btn { min-width: 0; box-shadow: none; }
      .cm-status-filter { margin-bottom: 14px; max-width: 240px; }
      .cm-status-filter .jatb-label { margin-bottom: 6px; }
      .cm-list-row {
        display: grid; grid-template-columns: minmax(220px, 2fr) minmax(130px, 1fr) 110px 110px 92px;
        gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .cm-list-row:last-child { border-bottom: 0; }
      .cm-list-head { color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .cm-item-primary { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .cm-item-primary strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cm-item-primary span { color: var(--muted); font-size: 11px; }
      .cm-empty-small { text-align: center; color: var(--muted); padding: 28px 16px; font-size: 13px; }
      .cm-date-tabs { display: flex; gap: 4px; }
      .cm-date-tabs button {
        border: 0; background: transparent; color: var(--muted); border-radius: 7px;
        padding: 7px 10px; font-size: 12px; font-weight: 600;
      }
      .cm-date-tabs button.active { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
      .cm-payout-summary {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px;
      }
      .cm-payout-row {
        display: grid; grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px 16px; align-items: center;
        border: 1px solid var(--line); border-radius: 12px;
        padding: 14px; margin-bottom: 10px; background: var(--surface);
      }
      .cm-payout-person {
        display: flex; align-items: center; gap: 12px; min-width: 0;
        border: 0; background: transparent; text-align: left; padding: 0;
      }
      .cm-payout-action {
        display: flex; align-items: center; gap: 12px; justify-content: flex-end;
      }
      .cm-payout-amount { font-size: 17px; white-space: nowrap; }
      .cm-payout-action .jatb-btn {
        width: auto; min-width: 132px; padding: 10px 14px; box-shadow: none;
      }
      .cm-summary-box { background: #F9FAFB; border-radius: 9px; padding: 12px; }
      .cm-summary-box span { display: block; color: var(--muted); font-size: 11px; }
      .cm-summary-box strong { display: block; margin-top: 4px; font-size: 18px; }
      .cm-payout-fields {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
      }
      .cm-payout-fields > .jatb-field { min-width: 0; }
      .cm-store-credit-note {
        display: flex; gap: 9px; align-items: flex-start; padding: 11px 12px;
        margin: -2px 0 14px; border-radius: 10px; background: var(--gold-soft);
        color: #714B0E; font-size: 12px; line-height: 1.45;
      }
      .cm-history-list { display: grid; gap: 10px; }
      .cm-history-card {
        width: 100%; border: 1px solid var(--line); border-radius: 13px;
        background: var(--surface); color: var(--ink); overflow: hidden; text-align: left;
      }
      .cm-history-card-summary {
        width: 100%; min-width: 0; margin: 0; border: 0;
        display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto auto;
        align-items: center; gap: 11px; padding: 14px;
        background: transparent; color: inherit; text-align: left;
        appearance: none; -webkit-appearance: none;
      }
      .cm-history-card-summary:hover { background: #FAFBFB; }
      .cm-history-card-summary:active { background: var(--green-soft); }
      .cm-history-card-copy { min-width: 0; }
      .cm-history-card-copy strong {
        display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .cm-history-card-copy span { display: block; color: var(--muted); font-size: 11px; margin-top: 3px; }
      .cm-history-card-amount { text-align: right; }
      .cm-history-card-amount strong { display: block; font-size: 16px; }
      .cm-history-card-amount span { display: block; color: var(--muted); font-size: 11px; margin-top: 3px; }
      .cm-history-card-details {
        border-top: 1px solid var(--line); padding: 13px 14px; background: #FAFBFB;
      }
      .cm-history-meta {
        display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
        margin-bottom: 12px;
      }
      .cm-history-meta div { background: var(--surface); border-radius: 9px; padding: 9px; }
      .cm-history-meta span { display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
      .cm-history-meta strong { display: block; font-size: 12px; margin-top: 3px; overflow-wrap: anywhere; }
      .cm-history-item {
        display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px;
        align-items: center; padding: 10px 0; border-top: 1px solid var(--line);
      }
      .cm-history-item:first-of-type { border-top: 0; }
      .cm-history-item-copy strong { display: block; font-size: 13px; }
      .cm-history-item-copy span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
      .cm-history-note { color: var(--muted); font-size: 11px; margin-top: 10px; line-height: 1.45; }
      .cm-paid-detail { display: block; color: var(--green-dark); font-size: 11px; margin-top: 4px; }

      .jatb-tag {
        display: inline-flex; align-items: center; gap: 5px;
        background: var(--ink); color: #fff; font-family: 'Fraunces', serif;
        font-weight: 600; font-size: 12px; padding: 3px 10px 3px 8px; border-radius: 4px 10px 10px 4px;
        position: relative;
      }
      .jatb-tag::before {
        content: ''; width: 5px; height: 5px; border-radius: 999px; background: #fff;
      }

      .jatb-photo-btn {
        width: 84px; height: 84px; border-radius: 14px; border: 1.5px dashed var(--line);
        background: var(--surface); display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 4px; color: var(--muted); font-size: 11px; flex-shrink: 0;
        overflow: hidden; text-align: center; line-height: 1.2;
      }
      .jatb-photo-btn img { width: 100%; height: 100%; object-fit: cover; }
      .jatb-photo-wrap { display: flex; flex-direction: column; align-items: center; gap: 5px; flex-shrink: 0; }
      .jatb-photo-alt {
        font-size: 10.5px; color: var(--muted); text-decoration: underline;
        text-align: center; max-width: 84px;
      }

      .jatb-intake-primary {
        display: grid; grid-template-columns: 128px minmax(0, 1fr);
        gap: 16px; align-items: start; padding: 16px;
        margin-bottom: 0; border-radius: 12px 12px 0 0;
      }
      .jatb-intake-primary .jatb-photo-wrap {
        width: 128px; gap: 6px;
      }
      .jatb-intake-primary .jatb-photo-btn {
        width: 128px; height: 128px; border-radius: 10px;
        background: #FAFBFB; font-size: 11px; gap: 5px;
      }
      .jatb-intake-primary .jatb-photo-btn svg { width: 22px; height: 22px; }
      .jatb-intake-primary .jatb-photo-alt {
        max-width: 128px; font-size: 10px;
      }
      .jatb-intake-primary-fields {
        display: grid; grid-template-columns: minmax(0, 1fr) minmax(150px, 240px);
        gap: 12px; align-content: start; padding-top: 1px;
      }
      .jatb-intake-primary + .jatb-detail-card {
        margin-top: 0; border-top: 0; border-radius: 0 0 12px 12px;
      }
      .jatb-intake-primary-fields .jatb-field { margin: 0; min-width: 0; }
      .jatb-intake-primary-fields .jatb-input {
        min-height: 46px; border-radius: 10px;
      }

      .jatb-batch-item {
        display: flex; align-items: center; gap: 10px; background: var(--surface);
        border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; margin-bottom: 8px;
      }
      .jatb-batch-thumb {
        width: 44px; height: 44px; border-radius: 8px; background: var(--green-soft);
        flex-shrink: 0; overflow: hidden; display: flex; align-items: center; justify-content: center;
      }
      .jatb-batch-thumb img { width: 100%; height: 100%; object-fit: cover; }
      .jatb-batch-remove {
        width: 30px; height: 30px; border-radius: 999px; border: none; background: var(--danger-soft);
        color: var(--danger); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }

      .jatb-toast {
        position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
        background: var(--ink); color: #fff; padding: 10px 18px; border-radius: 999px;
        font-size: 13px; font-weight: 500; z-index: 50; display: flex; align-items: center; gap: 6px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      }

      .jatb-loading { display: flex; align-items: center; justify-content: center; height: 100%; padding: 80px 0; color: var(--muted); }
      .jatb-spin { animation: jatb-spin 1s linear infinite; }
      @keyframes jatb-spin { to { transform: rotate(360deg); } }

      .jatb-footnote {
        text-align: center; font-size: 12px; color: var(--muted); padding: 18px 0 6px;
      }
      .jatb-footnote button { background: none; border: none; color: var(--muted); text-decoration: underline; font-size: 12px; }

      @media (prefers-reduced-motion: reduce) {
        .jatb-row-btn, .jatb-btn, .jatb-back { transition: none; }
        .jatb-spin { animation: none; }
      }
      .jatb button:focus-visible, .jatb input:focus-visible, .jatb select:focus-visible {
        outline: 2px solid var(--green); outline-offset: 2px;
      }
      @media (max-width: 900px) {
        .cm-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .cm-section-grid { grid-template-columns: 1fr; }
        .cm-list-row { grid-template-columns: minmax(180px, 2fr) minmax(110px, 1fr) 90px 80px; }
        .cm-list-row > :nth-child(4) { display: none; }
      }
      @media (max-width: 640px) {
        .jatb { padding-bottom: 74px; }
        .jatb-header { padding: 18px 16px 12px; position: static; }
        .jatb-body { padding: 14px 16px 96px; }
        .jatb-fab-wrap { padding-left: 16px; padding-right: 16px; bottom: 68px; }
        .jatb-btn { width: 100%; min-width: 0; }
        .cm-main-nav {
          position: fixed; top: auto; bottom: 0; left: 0; right: 0;
          justify-content: space-around; padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
          border-top: 1px solid var(--line); border-bottom: 0; box-shadow: 0 -5px 18px rgba(0,0,0,.08);
        }
        .cm-brand { display: none; }
        .cm-nav-button { flex: 1; flex-direction: column; gap: 3px; font-size: 10px; padding: 6px 2px; }
        .cm-dashboard-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .cm-metric { padding: 13px; min-height: 108px; }
        .cm-metric-value { font-size: 21px; }
        .cm-section-grid { grid-template-columns: 1fr; }
        .cm-list-head { display: none; }
        .cm-list-row {
          grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 12px;
        }
        .cm-list-row > :nth-child(2), .cm-list-row > :nth-child(3), .cm-list-row > :nth-child(4) { display: none; }
        .cm-payout-summary { grid-template-columns: 1fr; }
        .cm-quick-actions { grid-template-columns: 1fr 1fr; gap: 8px; }
        .cm-quick-action { min-height: 72px; padding: 11px; align-items: flex-start; }
        .cm-filter-select { width: 100%; }
        .jatb-row2, .cm-payout-fields { display: grid; grid-template-columns: minmax(0, 1fr); }
        .jatb-intake-primary {
          grid-template-columns: 96px minmax(0, 1fr); gap: 12px; padding: 12px;
        }
        .jatb-intake-primary .jatb-photo-wrap { width: 96px; }
        .jatb-intake-primary .jatb-photo-btn {
          width: 96px; height: 96px; aspect-ratio: auto;
        }
        .jatb-intake-primary .jatb-photo-alt { max-width: 96px; }
        .jatb-intake-primary-fields {
          grid-template-columns: minmax(0, 1fr); gap: 9px;
        }
        .jatb-manual-sale-controls { grid-template-columns: minmax(0, 1fr) 76px; gap: 8px; }
        .jatb-manual-sale .jatb-sold-btn { width: auto; min-width: 76px; }
        .jatb-sold-status { align-items: flex-start; flex-direction: column; gap: 6px; }
        .jatb-sold-status .jatb-row-sub { text-align: left; }
        .cm-payout-row { grid-template-columns: 1fr; gap: 12px; }
        .cm-payout-action { justify-content: space-between; }
        .cm-payout-action .jatb-btn { width: auto; min-width: 132px; }
        .cm-payout-create-body { padding-bottom: 180px; }
        .cm-history-card-summary {
          grid-template-columns: auto minmax(0, 1fr) auto;
          grid-template-areas:
            "avatar copy arrow"
            "avatar amount arrow"
            "avatar paid arrow";
          padding: 13px 12px; gap: 5px 10px;
        }
        .cm-history-card-summary > .jatb-avatar { grid-area: avatar; }
        .cm-history-card-copy { grid-area: copy; }
        .cm-history-card-amount {
          grid-area: amount; text-align: left;
          display: flex; align-items: baseline; gap: 8px;
        }
        .cm-history-card-amount strong { font-size: 17px; }
        .cm-history-card-amount span { margin-top: 0; }
        .cm-history-card-summary > .jatb-badge { grid-area: paid; justify-self: start; }
        .cm-history-card-summary > svg { grid-area: arrow; }
        .cm-history-meta { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}

/* ---------- small components ---------- */

function Header({ eyebrow, title, onBack = null, action = null }) {
  return (
    <div className="jatb-header">
      <div className="jatb-header-row">
        <div className="jatb-header-main">
          {onBack && (
            <button className="jatb-back" onClick={onBack} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            {eyebrow && <p className="jatb-eyebrow">{eyebrow}</p>}
            <h1 className="jatb-title">{title}</h1>
          </div>
        </div>
        {action && <div className="jatb-header-action">{action}</div>}
      </div>
    </div>
  );
}

async function handlePhotoFile(e, onChange) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await resizeImage(file);
  onChange(dataUrl);
}

function PhotoPicker({ value, onChange }) {
  return (
    <div className="jatb-photo-wrap">
      <label className="jatb-photo-btn">
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
      <label className="jatb-photo-alt">
        {value ? 'Retake or choose' : 'Choose from library'}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handlePhotoFile(e, onChange)}
        />
      </label>
    </div>
  );
}

function statusClass(status) {
  return String(status || 'Draft').toLowerCase();
}

function AppNavigation({ view, onNavigate }) {
  const entries = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['home', 'Consignors', Users],
    ['items', 'Items', PackageSearch],
    ['sales', 'Sales', ReceiptText],
    ['payouts', 'Payouts', WalletCards],
  ];

  return (
    <nav className="cm-main-nav" aria-label="Consignment manager">
      <div className="cm-brand">
        <span className="cm-brand-mark"><Tag size={18} /></span>
        Consignment Manager
      </div>
      {entries.map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          className={`cm-nav-button ${view === key ? 'active' : ''}`}
          onClick={() => onNavigate(key)}
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  );
}

function MetricCard({ icon: Icon, label, value, note, onClick }) {
  return (
    <button type="button" className="cm-metric" onClick={onClick} aria-label={`Open ${label}`}>
      <div className="cm-metric-icon"><Icon size={18} /></div>
      <div className="cm-metric-label">{label}</div>
      <div className="cm-metric-value">{value}</div>
      {note && <div className="cm-metric-note">{note}</div>}
    </button>
  );
}

function DashboardScreen({
  consignors,
  items,
  onOpenConsignor,
  onNavigate,
  onNewConsignor,
  onNewItem,
}) {
  const soldItems = items.filter((item) => item.status === 'Sold' || item.dateSold);
  const activeItems = items.filter((item) => ['Available', 'Active'].includes(item.status));
  const totalSales = soldItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const unpaidSales = soldItems.filter((item) => !item.paidOut);
  const amountDue = unpaidSales.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? 0)) / 100,
    0,
  );

  const consignorBalances = consignors
    .map((consignor) => {
      const sales = unpaidSales.filter((item) => item.consignorId === consignor.id);
      const due = sales.reduce(
        (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
        0,
      );
      return { consignor, sales, due };
    })
    .filter((entry) => entry.due > 0)
    .sort((a, b) => b.due - a.due);

  const recentSales = [...soldItems]
    .sort((a, b) => String(b.dateSold || '').localeCompare(String(a.dateSold || '')))
    .slice(0, 5);

  return (
    <>
      <Header eyebrow="Overview" title="Consignment dashboard" />
      <div className="jatb-body">
        <div className="cm-toolbar" style={{ justifyContent: 'space-between' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Live sales, inventory, and consignor balances from Shopify.
          </p>
          <div className="cm-date-tabs" aria-label="Dashboard period">
            <button type="button">Week</button>
            <button type="button" className="active">Month</button>
            <button type="button">Year</button>
            <button type="button">All time</button>
          </div>
        </div>

        <div className="cm-quick-actions" aria-label="Quick actions">
          <button type="button" className="cm-quick-action" onClick={onNewConsignor}>
            <span className="cm-quick-action-icon"><Users size={19} /></span>
            <span className="cm-quick-action-copy">
              <strong>Add consignor</strong>
              <span>Create a new account</span>
            </span>
          </button>
          <button type="button" className="cm-quick-action primary" onClick={onNewItem}>
            <span className="cm-quick-action-icon"><Plus size={19} /></span>
            <span className="cm-quick-action-copy">
              <strong>Add new item</strong>
              <span>Choose or create a consignor</span>
            </span>
          </button>
        </div>

        <div className="cm-dashboard-grid">
          <MetricCard icon={PackageSearch} label="Active items" value={activeItems.length} note={`${items.length} items total`} onClick={() => onNavigate('items')} />
          <MetricCard icon={Users} label="Consignors" value={consignors.length} note={`${consignorBalances.length} with payouts due`} onClick={() => onNavigate('home')} />
          <MetricCard icon={TrendingUp} label="Consignment sales" value={money(totalSales)} note={`${soldItems.length} sold items`} onClick={() => onNavigate('sales')} />
          <MetricCard icon={CircleDollarSign} label="Payouts due" value={money(amountDue)} note={`${unpaidSales.length} unpaid sales`} onClick={() => onNavigate('payouts')} />
        </div>

        <div className="cm-section-grid">
          <section className="jatb-card">
            <div className="cm-section-title">
              <h2>Consignors with payouts due</h2>
              <button type="button" className="cm-link-button" onClick={() => onNavigate('payouts')}>View payouts</button>
            </div>
            {consignorBalances.length === 0 ? (
              <div className="cm-empty-small">No unpaid consignment sales yet.</div>
            ) : consignorBalances.slice(0, 6).map(({ consignor, sales, due }) => (
              <button
                key={consignor.id}
                type="button"
                className="jatb-row-btn"
                onClick={() => onOpenConsignor(consignor.id)}
              >
                <div className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
                <div className="jatb-row-main">
                  <div className="jatb-row-name">{consignor.firstName} {consignor.lastName}</div>
                  <div className="jatb-row-sub">#{consignor.number} · {sales.length} unpaid sale{sales.length === 1 ? '' : 's'}</div>
                </div>
                <strong>{money(due)}</strong>
                <ChevronRight size={18} className="jatb-chev" />
              </button>
            ))}
          </section>

          <section className="jatb-card">
            <div className="cm-section-title">
              <h2>Recent sales</h2>
              <button type="button" className="cm-link-button" onClick={() => onNavigate('sales')}>View all</button>
            </div>
            {recentSales.length === 0 ? (
              <div className="cm-empty-small">Paid Shopify orders will appear here automatically.</div>
            ) : recentSales.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13 }}>{item.description || item.itemNumber}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{item.itemNumber} · {item.dateSold || 'Sold'}</span>
                </div>
                <strong style={{ fontSize: 13 }}>{money(item.salePrice ?? item.price)}</strong>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

function ItemsScreen({ items, consignors, onOpenItem, onImport, onExport }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Current');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const statuses = ['Current', 'Draft', 'Available', 'Sold', 'Archived', 'Returned', 'Donated'];
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));
  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    const consignor = consignorById[item.consignorId];
    const matchesQuery = !q || `${item.description} ${item.itemNumber} ${item.type} ${consignor?.firstName || ''} ${consignor?.lastName || ''} ${consignor?.number || ''}`.toLowerCase().includes(q);
    const matchesConsignor = consignorFilter === 'All' || item.consignorId === consignorFilter;
    const matchesStatus = filter === 'Current'
      ? !item.paidOut
      : filter === 'Archived'
        ? item.paidOut
        : filter === 'Available'
          ? item.status === 'Available' || item.status === 'Active'
          : item.status === filter && !item.paidOut;
    return matchesQuery && matchesConsignor && matchesStatus;
  }).sort((a, b) => {
    if (sort === 'oldest') return String(a.dateReceived || '').localeCompare(String(b.dateReceived || ''));
    if (sort === 'consignor') {
      const aName = `${consignorById[a.consignorId]?.lastName || ''} ${consignorById[a.consignorId]?.firstName || ''}`;
      const bName = `${consignorById[b.consignorId]?.lastName || ''} ${consignorById[b.consignorId]?.firstName || ''}`;
      return aName.localeCompare(bName) || a.itemNumber.localeCompare(b.itemNumber);
    }
    if (sort === 'ticket') return a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true });
    if (sort === 'priceHigh') return Number(b.price || 0) - Number(a.price || 0);
    return String(b.dateReceived || '').localeCompare(String(a.dateReceived || '')) || b.itemNumber.localeCompare(a.itemNumber, undefined, { numeric: true });
  });

  return (
    <>
      <Header
        eyebrow="Inventory"
        title="Items"
        action={(
          <details className="cm-data-menu">
            <summary><FileUp size={16} /> Data</summary>
            <div className="cm-data-menu-popover">
              <button type="button" onClick={onImport}><FileUp size={15} /> Import CSV</button>
              <button type="button" onClick={onExport}><Download size={15} /> Export CSV</button>
            </div>
          </details>
        )}
      />
      <div className="jatb-body">
        <div className="cm-toolbar">
          <div className="jatb-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, SKU, or type" />
          </div>
          <select className="jatb-select cm-filter-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)} aria-label="Filter by consignor">
            <option value="All">All consignors</option>
            {consignors.map((consignor) => (
              <option key={consignor.id} value={consignor.id}>#{consignor.number} · {consignor.firstName} {consignor.lastName}</option>
            ))}
          </select>
          <select className="jatb-select cm-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort items">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="consignor">Consignor name</option>
            <option value="ticket">Ticket number</option>
            <option value="priceHigh">Highest price</option>
          </select>
        </div>
        <div className="cm-status-filter">
          <label className="jatb-label" htmlFor="item-status-filter">Status</label>
          <select
            id="item-status-filter"
            className="jatb-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by item status"
          >
            {statuses.map((status) => {
              const count = status === 'Current'
                ? items.filter((item) => !item.paidOut).length
                : status === 'Archived'
                  ? items.filter((item) => item.paidOut).length
                  : items.filter((item) => item.status === status && !item.paidOut).length;
              return <option key={status} value={status}>{status} ({count})</option>;
            })}
          </select>
        </div>

        <section className="jatb-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cm-list-row cm-list-head">
            <span>Item</span><span>Consignor</span><span>Price</span><span>Commission</span><span>Status</span>
          </div>
          {filtered.length === 0 && <div className="cm-empty-small">No items match these filters.</div>}
          {filtered.map((item) => {
            const consignor = consignorById[item.consignorId];
            return (
              <button
                type="button"
                key={item.id}
                className="cm-list-row"
                onClick={() => onOpenItem(item.id)}
                style={{ width: '100%', background: 'white', border: 0, textAlign: 'left' }}
              >
                <span className="cm-item-primary">
                  <span className="jatb-batch-thumb">
                    {item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}
                  </span>
                  <span>
                    <strong>{item.description || item.type || 'Consignment item'}</strong>
                    <span>{item.itemNumber}{item.size ? ` · ${item.size}` : ''}</span>
                  </span>
                </span>
                <span>{consignor ? `${consignor.firstName} ${consignor.lastName}` : '—'}</span>
                <strong>{money(item.price)}</strong>
                <span>{item.commissionPct}%</span>
                <span className={`jatb-badge ${item.paidOut ? 'sold' : statusClass(item.status)}`}>{item.paidOut ? 'Paid · archived' : item.status}</span>
              </button>
            );
          })}
        </section>
      </div>
    </>
  );
}

function SalesScreen({ items, consignors }) {
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));
  const sales = items
    .filter((item) => item.status === 'Sold' || item.dateSold || item.orderId)
    .sort((a, b) => String(b.dateSold || '').localeCompare(String(a.dateSold || '')));

  return (
    <>
      <Header eyebrow="Shopify orders" title="Sales" />
      <div className="jatb-body">
        <div className="cm-section-title">
          <div>
            <h2>Consignment sales ledger</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>Paid online and POS sales are recorded here automatically.</p>
          </div>
        </div>
        <section className="jatb-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cm-list-row cm-list-head">
            <span>Sale</span><span>Consignor</span><span>Sale price</span><span>Consignor due</span><span>Payout</span>
          </div>
          {sales.length === 0 && <div className="cm-empty-small">No paid consignment orders have been recorded yet.</div>}
          {sales.map((item) => {
            const consignor = consignorById[item.consignorId];
            const salePrice = Number(item.salePrice ?? item.price ?? 0);
            const due = (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
            return (
              <div className="cm-list-row" key={item.id}>
                <span className="cm-item-primary">
                  <span className="jatb-batch-thumb">
                    {item.photo ? <img src={item.photo} alt="" /> : <ReceiptText size={16} color="var(--green-dark)" />}
                  </span>
                  <span>
                    <strong>{item.description || item.itemNumber}</strong>
                    <span>{item.orderName || 'Shopify order'} · {item.dateSold || 'Paid'}</span>
                  </span>
                </span>
                <span>{consignor ? `${consignor.firstName} ${consignor.lastName}` : '—'}</span>
                <strong>{money(salePrice)}</strong>
                <strong>{money(due)}</strong>
                <span className={`jatb-badge ${item.paidOut ? 'available' : 'draft'}`}>{item.paidOut ? 'Paid' : 'Unpaid'}</span>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}

function PayoutsScreen({ items, consignors, onOpenConsignor, onStartPayout }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('amount');
  const [tab, setTab] = useState('outstanding');
  const [expandedPayoutId, setExpandedPayoutId] = useState('');
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));
  const unpaidSales = items.filter((item) => (item.status === 'Sold' || item.dateSold) && !item.paidOut);
  const rows = consignors
    .map((consignor) => {
      const sales = unpaidSales.filter((item) => item.consignorId === consignor.id);
      const due = sales.reduce(
        (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
        0,
      );
      return { consignor, sales, due };
    })
    .filter((entry) => entry.sales.length > 0)
    .filter(({ consignor }) => {
      const q = query.trim().toLowerCase();
      return !q || `${consignor.firstName} ${consignor.lastName} ${consignor.number}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'name') return `${a.consignor.lastName} ${a.consignor.firstName}`.localeCompare(`${b.consignor.lastName} ${b.consignor.firstName}`);
      if (sort === 'oldest') return String(a.sales[0]?.dateSold || '').localeCompare(String(b.sales[0]?.dateSold || ''));
      return b.due - a.due;
    });
  const totalDue = rows.reduce((sum, entry) => sum + entry.due, 0);
  const payoutHistory = Object.values(items.filter((item) => item.paidOut && item.payoutId).reduce((groups, item) => {
    if (!groups[item.payoutId]) groups[item.payoutId] = { ...item, items: [], amount: item.payoutTotal || 0 };
    groups[item.payoutId].items.push(item);
    return groups;
  }, {})).sort((a, b) => String(b.payoutDate || '').localeCompare(String(a.payoutDate || '')));

  return (
    <>
      <Header eyebrow="Payments" title="Payouts" />
      <div className="jatb-body">
        <div className="cm-status-row">
          <button type="button" className={`jatb-chip ${tab === 'outstanding' ? 'active' : ''}`} onClick={() => setTab('outstanding')}>Outstanding</button>
          <button type="button" className={`jatb-chip ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            Payout history <span className="cm-tab-count">{payoutHistory.length}</span>
          </button>
        </div>
        {tab === 'outstanding' && (
          <>
        <div className="cm-payout-summary">
          <div className="cm-summary-box"><span>Total due</span><strong>{money(totalDue)}</strong></div>
          <div className="cm-summary-box"><span>Consignors to pay</span><strong>{rows.length}</strong></div>
        </div>

        <div className="cm-toolbar">
          <div className="jatb-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search consignor or number" />
          </div>
          <select className="jatb-select cm-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort payouts">
            <option value="amount">Highest amount due</option>
            <option value="name">Consignor name</option>
            <option value="oldest">Oldest unpaid sale</option>
          </select>
        </div>
        <section className="jatb-card">
          <div className="cm-section-title">
            <h2>Consignors with payouts due</h2>
            <CalendarDays size={18} color="var(--muted)" />
          </div>
          {rows.length === 0 && <div className="cm-empty-small">There are no eligible unpaid sales.</div>}
          {rows.map(({ consignor, sales, due }) => (
            <div key={consignor.id} className="cm-payout-row">
              <button
                type="button"
                className="cm-payout-person"
                onClick={() => onOpenConsignor(consignor.id)}
              >
                <div className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
                <div className="jatb-row-main">
                  <div className="jatb-row-name">{consignor.firstName} {consignor.lastName}</div>
                  <div className="jatb-row-sub">#{consignor.number} · {sales.length} eligible item{sales.length === 1 ? '' : 's'}</div>
                </div>
              </button>
              <div className="cm-payout-action">
                <strong className="cm-payout-amount">{money(due)}</strong>
                <button type="button" className="jatb-btn" onClick={() => onStartPayout(consignor.id)}>Review & pay</button>
              </div>
            </div>
          ))}
        </section>
          </>
        )}
        {tab === 'history' && (
          <section className="cm-history-list">
            {payoutHistory.length === 0 && <div className="cm-empty-small">Recorded payouts will appear here.</div>}
            {payoutHistory.map((payout) => {
              const consignor = consignorById[payout.consignorId];
              const consignorName = consignor
                ? `${consignor.firstName} ${consignor.lastName}`
                : 'Unknown consignor';
              const expanded = expandedPayoutId === payout.payoutId;
              return (
                <article className="cm-history-card" key={payout.payoutId}>
                  <button
                    type="button"
                    className="cm-history-card-summary"
                    onClick={() => setExpandedPayoutId(expanded ? '' : payout.payoutId)}
                    aria-expanded={expanded}
                  >
                    <span className="jatb-avatar">
                      {consignor?.firstName?.[0] || '?'}{consignor?.lastName?.[0] || ''}
                    </span>
                    <span className="cm-history-card-copy">
                      <strong>{consignorName}{consignor ? ` · #${consignor.number}` : ''}</strong>
                      <span>{payout.payoutDate || 'Date not recorded'} · {payout.items.length} item{payout.items.length === 1 ? '' : 's'}</span>
                    </span>
                    <span className="cm-history-card-amount">
                      <strong>{money(payout.amount)}</strong>
                      <span>{payout.payoutMethod || 'Method not recorded'}</span>
                    </span>
                    <span className="jatb-badge paid">Paid</span>
                    <ChevronRight
                      size={17}
                      color="var(--muted)"
                      style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
                    />
                  </button>
                  {expanded && (
                    <div className="cm-history-card-details">
                      <div className="cm-history-meta">
                        <div><span>Paid to</span><strong>{consignorName}</strong></div>
                        <div><span>Payment method</span><strong>{payout.payoutMethod || 'Not recorded'}</strong></div>
                        <div><span>Reference</span><strong>{payout.payoutReference || payout.payoutId}</strong></div>
                      </div>
                      {payout.items.map((item) => {
                        const salePrice = Number(item.salePrice ?? item.price ?? 0);
                        const rate = Number(item.commissionPct ?? consignor?.commissionPct ?? 0);
                        return (
                          <div className="cm-history-item" key={item.id}>
                            <span className="jatb-batch-thumb">
                              {item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}
                            </span>
                            <span className="cm-history-item-copy">
                              <strong>{item.description || item.itemNumber}</strong>
                              <span>{item.itemNumber} · {item.orderName || 'No order reference'} · {money(salePrice)} × {rate}%</span>
                            </span>
                            <strong>{money(item.payoutAmount)}</strong>
                          </div>
                        );
                      })}
                      {Number(payout.payoutAdjustment || 0) !== 0 && (
                        <div className="cm-history-note">Manual adjustment: {money(payout.payoutAdjustment)}</div>
                      )}
                      {payout.payoutNote && <div className="cm-history-note">Note: {payout.payoutNote}</div>}
                      {payout.payoutMethod === 'Store credit' && (
                        <div className="cm-history-note"><strong>Store credit recorded:</strong> {money(payout.amount)}</div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </>
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
      <div className="jatb-body cm-payout-create-body">
        <div className="cm-section-grid">
          <section>
            <div className="jatb-card">
              <div className="cm-section-title">
                <div>
                  <h2>{consignor.firstName} {consignor.lastName}</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                    Default commission: {consignor.commissionPct}%
                  </p>
                </div>
                <div className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
              </div>
            </div>

            <div className="jatb-card">
              <div className="cm-section-title">
                <div>
                  <h2>Items in this payout</h2>
                  <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 12 }}>
                    Select the eligible sales to include.
                  </p>
                </div>
                <button
                  type="button"
                  className="cm-link-button"
                  onClick={() => setSelectedIds(selectedIds.length === eligible.length ? [] : eligible.map((item) => item.id))}
                >
                  {selectedIds.length === eligible.length ? 'Exclude all' : 'Select all'}
                </button>
              </div>

              {eligible.length === 0 && <div className="cm-empty-small">This consignor has no eligible unpaid sales.</div>}
              {eligible.map((item) => {
                const salePrice = Number(item.salePrice ?? item.price ?? 0);
                const rate = Number(item.commissionPct ?? consignor.commissionPct ?? 0);
                const due = (salePrice * rate) / 100;
                return (
                  <label key={item.id} className="jatb-row-btn" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                      style={{ width: 18, height: 18, accentColor: 'var(--green)' }}
                    />
                    <span className="cm-item-primary" style={{ flex: 1 }}>
                      <span className="jatb-batch-thumb">
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
            <div className="jatb-card">
              <div className="cm-section-title"><h2>Payout summary</h2></div>
              <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Selected sales</span><strong>{selected.length}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consignor earnings</span><strong>{money(itemTotal)}</strong></div>
                <div className="jatb-field" style={{ margin: '4px 0 0' }}>
                  <label className="jatb-label">Manual adjustment</label>
                  <input className="jatb-input" type="number" inputMode="decimal" value={adjustment} onChange={(event) => setAdjustment(event.target.value)} placeholder="0.00" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 16 }}>
                  <strong>Amount due</strong><strong>{money(payoutTotal)}</strong>
                </div>
              </div>
            </div>
            <div className="jatb-card">
              <div className="jatb-field">
                <label className="jatb-label">Payment method</label>
                <select className="jatb-select" value={method} onChange={(event) => setMethod(event.target.value)}>
                  <option>E-transfer</option><option>Cash</option><option>Cheque</option><option>Store credit</option><option>Other</option>
                </select>
              </div>
              {method === 'Store credit' && (
                <div className="cm-store-credit-note">
                  <CircleDollarSign size={17} />
                  <span>This records the amount as store credit in the payout ledger and on each linked Shopify product.</span>
                </div>
              )}
              <div className="cm-payout-fields">
                <div className="jatb-field">
                  <label className="jatb-label">Payout date</label>
                  <input className="jatb-input" type="date" value={payoutDate} onChange={(event) => setPayoutDate(event.target.value)} />
                </div>
                <div className="jatb-field">
                  <label className="jatb-label">Reference</label>
                  <input
                    className="jatb-input"
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder={method === 'Store credit' ? 'Credit memo or note' : 'Optional confirmation #'}
                  />
                </div>
              </div>
              <label className="jatb-label">Payout note</label>
              <textarea className="jatb-textarea" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional payment reference or note" />
            </div>
            <button
              type="button"
              className="jatb-btn"
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

function HomeScreen({ consignors, items, query, setQuery, onOpenConsignor, onNewConsignor, onImport, onExport }) {
  const filtered = consignors.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      String(c.number).includes(q)
    );
  });

  return (
    <>
      <Header
        eyebrow="Accounts"
        title="Consignors"
        action={(
          <div className="cm-header-actions">
            <details className="cm-data-menu">
              <summary><FileUp size={16} /> Data</summary>
              <div className="cm-data-menu-popover">
                <button type="button" onClick={onImport}><FileUp size={15} /> Import CSV</button>
                <button type="button" onClick={onExport}><Download size={15} /> Export CSV</button>
              </div>
            </details>
            <button className="jatb-btn" onClick={onNewConsignor}><Plus size={17} /> New consignor</button>
          </div>
        )}
      />
      <div className="jatb-body">
        <div className="jatb-search">
          <Search size={17} />
          <input
            placeholder="Search name, phone, or #"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 && consignors.length === 0 && (
          <div className="jatb-empty">
            <h3>No consignors yet</h3>
            <p>Add the first person who drops something off.</p>
          </div>
        )}
        {filtered.length === 0 && consignors.length > 0 && (
          <div className="jatb-empty">
            <h3>No matches</h3>
            <p>Try a different name, phone, or number.</p>
          </div>
        )}

        {filtered.map((c) => {
          const count = items.filter((i) => i.consignorId === c.id).length;
          return (
            <button key={c.id} className="jatb-row-btn" onClick={() => onOpenConsignor(c.id)}>
              <div className="jatb-avatar">{c.firstName?.[0]}{c.lastName?.[0]}</div>
              <div className="jatb-row-main">
                <div className="jatb-row-name">{c.firstName} {c.lastName}</div>
                <div className="jatb-row-sub">#{c.number} · {count} item{count === 1 ? '' : 's'}</div>
              </div>
              <ChevronRight size={18} className="jatb-chev" />
            </button>
          );
        })}

        <div className="jatb-footnote">Live Shopify consignment data</div>
      </div>
    </>
  );
}

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
      <div className="jatb-body">
        <button type="button" className="cm-quick-action primary" onClick={onCreate} style={{ width: '100%', marginBottom: 14 }}>
          <span className="cm-quick-action-icon"><Plus size={19} /></span>
          <span className="cm-quick-action-copy">
            <strong>Create new consignor</strong>
            <span>Add their details, then continue directly to the item</span>
          </span>
        </button>

        <div className="jatb-search">
          <Search size={17} />
          <input
            placeholder="Search name or consignor number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filtered.map((consignor) => (
          <button
            key={consignor.id}
            type="button"
            className="jatb-row-btn"
            onClick={() => onChoose(consignor.id)}
          >
            <div className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
            <div className="jatb-row-main">
              <div className="jatb-row-name">{consignor.firstName} {consignor.lastName}</div>
              <div className="jatb-row-sub">Consignor #{consignor.number}</div>
            </div>
            <ChevronRight size={18} className="jatb-chev" />
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="jatb-empty">
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

function csvValue(value) {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(fileName, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map(csvValue).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
  const required = isConsignors ? 'number, first_name, last_name' : 'consignor_number, description, price';
  const templateConsignorNumber = fixedConsignor?.number || 1;
  const template = isConsignors
    ? 'number,first_name,last_name,phone,email,address,city,province,postal_code,date_joined,commission_pct,unsold_preference,notes\n1,Jane,Smith,905-555-0100,jane@example.com,123 Main Street,Hamilton,Ontario,L8E 1A1,2026-07-30,50,Please return,'
    : `item_number,consignor_number,description,price,category,type,size,condition,status,date_received,commission_pct,notes,tags,brand,vendor,product_description,sale_price,date_sold,order_name,order_id,paid_out,payout_id,payout_date,payout_method,payout_reference,payout_note,payout_amount,payout_total,payout_adjustment,shopify_product_id\n,${templateConsignorNumber},Blue baby sweater,18.00,Clothing,Top,12M,Good,Available,2026-07-30,50,,,,,,,,,false,,,,,,,,,`;

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
          const supplied = String(row.consignor_number || row.consignorNumber || '').trim();
          if (supplied && Number(supplied) !== Number(fixedConsignor.number)) {
            throw new Error(`Row ${index + 2}: this import is for consignor #${fixedConsignor.number}, but the CSV contains consignor #${supplied}.`);
          }
          return { ...row, consignor_number: fixedConsignor.number };
        });
      }
      setRows(parsed); setFileName(file.name); setLocalError('');
    } catch (error) { setRows([]); setFileName(file.name); setLocalError(error.message); }
  }

  return (
    <>
      <Header eyebrow="Data import" title={isConsignors ? 'Import consignors' : fixedConsignor ? `Import items for ${fixedConsignor.firstName} ${fixedConsignor.lastName}` : 'Import items'} onBack={onBack} />
      <div className="jatb-body">
        <div className="jatb-card">
          <strong style={{ fontSize: 14 }}>Start with the template</strong>
          <p className="cm-import-help">Required columns: {required}. Keep the headings unchanged, fill in your rows, then save as CSV.{fixedConsignor && !isConsignors ? ` Every row will be assigned to consignor #${fixedConsignor.number}.` : ''}</p>
          <button className="jatb-btn secondary" onClick={downloadTemplate}><Download size={16} /> Download template</button>
        </div>
        <div className="cm-import-drop">
          <label>
            <FileUp size={24} />
            <span>{fileName || 'Choose CSV file'}</span>
            <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
          </label>
          <div className="cm-import-help">Nothing is imported until you review the count and press Import.</div>
        </div>
        {localError && <div className="jatb-card" style={{ color: 'var(--danger)' }}>{localError}</div>}
        {rows.length > 0 && (
          <>
            <div className="cm-import-preview">
              <div><span>File</span><strong style={{ fontSize: 12 }}>{fileName}</strong></div>
              <div><span>Rows ready</span><strong>{rows.length}</strong></div>
              <div><span>Importing</span><strong style={{ fontSize: 13 }}>{isConsignors ? 'Consignors' : 'Items'}</strong></div>
            </div>
            <div className="cm-import-actions">
              <button className="jatb-btn" disabled={saving} onClick={async () => {
                setSaving(true);
                try { await onImport(kind, rows); } finally { setSaving(false); }
              }}>{saving ? <Loader2 className="jatb-spin" size={16} /> : <FileUp size={16} />} Import {rows.length} row{rows.length === 1 ? '' : 's'}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function NewConsignorScreen({ onBack, onSave, nextNumber }) {
  const [form, setForm] = useState({ number: nextNumber, firstName: '', lastName: '', phone: '', email: '', address: '', city: '', province: 'Ontario', postalCode: '', commissionPct: 50, unsoldPreference: 'Please return', notes: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.firstName.trim() && form.lastName.trim();

  return (
    <>
      <Header eyebrow="New" title="Add consignor" onBack={onBack} />
      <div className="jatb-body">
        <div className="jatb-field">
          <label className="jatb-label">Consignor number</label>
          <input className="jatb-input" type="number" inputMode="numeric" min="1" step="1" value={form.number} onChange={set('number')} />
          <div className="jatb-row-sub" style={{ marginTop: 6 }}>Automatically assigned, but you can change it.</div>
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">First name</label>
            <input className="jatb-input" value={form.firstName} onChange={set('firstName')} placeholder="Sarah" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Last name</label>
            <input className="jatb-input" value={form.lastName} onChange={set('lastName')} placeholder="Lee" />
          </div>
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">Phone</label>
            <input className="jatb-input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="(416) 555-0134" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Email</label>
            <input className="jatb-input" type="email" value={form.email} onChange={set('email')} placeholder="sarah@email.com" />
          </div>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Street address</label>
          <input className="jatb-input" value={form.address} onChange={set('address')} placeholder="123 Main Street" autoComplete="street-address" />
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">City</label>
            <input className="jatb-input" value={form.city} onChange={set('city')} placeholder="Hamilton" autoComplete="address-level2" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Province</label>
            <input className="jatb-input" value={form.province} onChange={set('province')} placeholder="Ontario" autoComplete="address-level1" />
          </div>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Postal code</label>
          <input className="jatb-input" value={form.postalCode} onChange={set('postalCode')} placeholder="L8E 1A1" autoCapitalize="characters" autoComplete="postal-code" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Commission split &mdash; consignor gets</label>
          <input className="jatb-input" type="number" inputMode="decimal" value={form.commissionPct} onChange={set('commissionPct')} placeholder="50" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Unsold items</label>
          <select className="jatb-select" value={form.unsoldPreference} onChange={set('unsoldPreference')}>
            <option value="Please return">Please return</option>
            <option value="Donation okay">Donation okay</option>
            <option value="Ask me first">Ask me first</option>
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Notes (optional)</label>
          <textarea className="jatb-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" />
        </div>
      </div>
      <div className="jatb-fab-wrap">
        <button className="jatb-btn" disabled={!valid} onClick={() => onSave(form)}>
          <Check size={18} /> Save consignor
        </button>
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
      <div className="jatb-body">
        <div className="jatb-field">
          <label className="jatb-label">Consignor number</label>
          <input className="jatb-input" type="number" inputMode="numeric" min="1" step="1" value={form.number} onChange={set('number')} />
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">First name</label>
            <input className="jatb-input" value={form.firstName} onChange={set('firstName')} placeholder="Sarah" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Last name</label>
            <input className="jatb-input" value={form.lastName} onChange={set('lastName')} placeholder="Lee" />
          </div>
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">Phone</label>
            <input className="jatb-input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="(416) 555-0134" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Email</label>
            <input className="jatb-input" type="email" value={form.email} onChange={set('email')} placeholder="sarah@email.com" />
          </div>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Street address</label>
          <input className="jatb-input" value={form.address} onChange={set('address')} placeholder="123 Main Street" autoComplete="street-address" />
        </div>
        <div className="jatb-row2">
          <div className="jatb-field">
            <label className="jatb-label">City</label>
            <input className="jatb-input" value={form.city} onChange={set('city')} placeholder="Hamilton" autoComplete="address-level2" />
          </div>
          <div className="jatb-field">
            <label className="jatb-label">Province</label>
            <input className="jatb-input" value={form.province} onChange={set('province')} placeholder="Ontario" autoComplete="address-level1" />
          </div>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Postal code</label>
          <input className="jatb-input" value={form.postalCode} onChange={set('postalCode')} placeholder="L8E 1A1" autoCapitalize="characters" autoComplete="postal-code" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Commission split &mdash; consignor gets</label>
          <input className="jatb-input" type="number" inputMode="decimal" value={form.commissionPct} onChange={set('commissionPct')} placeholder="50" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Unsold items</label>
          <select className="jatb-select" value={form.unsoldPreference} onChange={set('unsoldPreference')}>
            <option value="Please return">Please return</option>
            <option value="Donation okay">Donation okay</option>
            <option value="Ask me first">Ask me first</option>
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Notes (optional)</label>
          <textarea className="jatb-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Anything worth remembering" />
        </div>
      </div>
      <div className="jatb-fab-wrap">
        <button className="jatb-btn" disabled={!valid} onClick={() => onSave(consignor.id, form)}>
          <Check size={18} /> Save changes
        </button>
      </div>
    </>
  );
}

function ConsignorScreen({ consignor, items, onBack, onStartIntake, onImportItems, onOpenItem, onDeleteItem, onDeleteConsignor, onEditConsignor }) {
  const consignorItems = items.filter((i) => i.consignorId === consignor.id);
  const draftCount = consignorItems.filter((i) => i.status === 'Draft').length;
  const soldItems = consignorItems.filter((i) => i.status === 'Sold' || i.dateSold);
  const unpaidItems = soldItems.filter((i) => !i.paidOut);
  const totalSales = soldItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const [confirmingDeleteConsignor, setConfirmingDeleteConsignor] = useState(false);
  const amountDue = unpaidItems.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
    0,
  );

  return (
    <>
      <Header
        eyebrow={`Consignor #${consignor.number}`}
        title={`${consignor.firstName} ${consignor.lastName}`}
        onBack={onBack}
        action={(
          <div className="cm-header-actions">
            <button className="jatb-btn" onClick={onStartIntake}>
              <Plus size={17} /> Add items
            </button>
            <button className="jatb-btn secondary" onClick={onImportItems}>
              <FileUp size={17} /> Import items
            </button>
            <button className="jatb-btn secondary" onClick={onEditConsignor}>
              <Pencil size={17} /> Edit
            </button>
            <button
              className="jatb-btn secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
              onClick={() => setConfirmingDeleteConsignor(true)}
            >
              <Trash2 size={17} /> Delete
            </button>
          </div>
        )}
      />
      <div className="jatb-body">
        <div className="jatb-card">
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
            {consignor.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={13} /> {consignor.phone}</span>}
            {consignor.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={13} /> {consignor.email}</span>}
            {(consignor.address || consignor.city || consignor.postalCode) && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MapPin size={13} /> {[consignor.address, consignor.city, consignor.province, consignor.postalCode].filter(Boolean).join(', ')}</span>}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
            Split: consignor gets {consignor.commissionPct}% · Joined {consignor.dateJoined}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--muted)' }}>
            Unsold items: {consignor.unsoldPreference || 'Please return'}
          </div>
        </div>

        <div className="cm-payout-summary">
          <div className="cm-summary-box"><span>Amount due</span><strong>{money(amountDue)}</strong></div>
          <div className="cm-summary-box"><span>Total sales</span><strong>{money(totalSales)}</strong></div>
          <div className="cm-summary-box"><span>Active items</span><strong>{consignorItems.filter((item) => ['Available', 'Active'].includes(item.status)).length}</strong></div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 10px' }}>
          <h3 style={{ fontSize: 16 }}>Items on file</h3>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{consignorItems.length} total · {draftCount} draft</span>
        </div>

        {consignorItems.length === 0 && (
          <div className="jatb-empty">
            <h3>No items yet</h3>
            <p>Add what they brought in today.</p>
          </div>
        )}

        {consignorItems.map((it) => (
          <div key={it.id} className="jatb-card" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 10px 10px 16px' }}>
            <button
              onClick={() => onOpenItem(it.id)}
              style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
            >
              <div className="jatb-batch-thumb" style={{ width: 48, height: 48, borderRadius: 10 }}>
                {it.photo ? <img src={it.photo} alt="" /> : <Tag size={18} color="var(--green-dark)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{it.description || it.category}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {it.itemNumber} · {it.type ? `${it.type} · ` : ''}{it.size ? `Size ${it.size} · ` : ''}{money(it.price)}
                </div>
                {it.paidOut && (
                  <span className="cm-paid-detail">
                    Paid {it.payoutDate || ''} · {it.payoutMethod || 'Method not recorded'} · {money(it.payoutAmount)}
                  </span>
                )}
              </div>
            </button>
            <span className={`jatb-badge ${it.paidOut ? 'paid' : it.status === 'Sold' ? 'unpaid' : statusClass(it.status)}`}>
              {it.paidOut ? 'Paid' : it.status === 'Sold' ? 'Sold · unpaid' : it.status}
            </span>
            <button className="jatb-batch-remove" onClick={() => onDeleteItem(it.id)} aria-label="Remove item">
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {confirmingDeleteConsignor && (
          <div className="jatb-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>Delete {consignor.firstName} {consignor.lastName} for good?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="jatb-btn secondary" style={{ padding: '8px 14px' }} onClick={() => setConfirmingDeleteConsignor(false)}>Cancel</button>
              <button className="jatb-btn danger" style={{ padding: '8px 14px' }} onClick={() => onDeleteConsignor(consignor.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ConsignmentItemFields({ form, setForm }) {
  const set = (key) => (event) => setForm((current) => ({
    ...current,
    [key]: event.target.value,
  }));
  const availableTypes = TYPE_OPTIONS[form.category] || [form.type || 'Other'];

  function setCategory(category) {
    setForm((current) => ({
      ...current,
      category,
      type: TYPE_OPTIONS[category][0],
    }));
  }

  return (
    <div className="jatb-card jatb-detail-card">
      <div className="jatb-section-heading">
        <label className="jatb-label">Consignment item information</label>
        <span className="jatb-row-sub">Jill's item record</span>
      </div>
      <div className="jatb-detail-grid">
        <div className="jatb-field">
          <label className="jatb-label">Category</label>
          <select className="jatb-select" value={form.category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">{form.category || 'Item'} type</label>
          <select className="jatb-select" value={form.type} onChange={set('type')}>
            {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Brand</label>
          <input className="jatb-input" value={form.brand} onChange={set('brand')} placeholder="e.g. Gap" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Size</label>
          <input className="jatb-input" value={form.size} onChange={set('size')} placeholder="6–12m" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Condition</label>
          <select className="jatb-select" value={form.condition} onChange={set('condition')}>
            {CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
          </select>
        </div>
        <div className="jatb-field wide">
          <label className="jatb-label">Internal notes</label>
          <textarea className="jatb-textarea" rows={2} value={form.notes} onChange={set('notes')} placeholder="Notes about this consigned item" />
        </div>
      </div>
    </div>
  );
}

function ShopifyProductFields({ form, setForm }) {
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
    <div className="jatb-shopify-fields">
      <div className="jatb-detail-grid">
        <div className="jatb-field">
          <label className="jatb-label">Vendor</label>
          <input className="jatb-input" value={form.vendor} onChange={set('vendor')} placeholder="Defaults to store name" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Tags</label>
          <input className="jatb-input" value={form.tags} onChange={set('tags')} placeholder="summer, baby" />
        </div>
        <div className="jatb-field wide">
          <label className="jatb-label">Shopify product category</label>
          <input
            className="jatb-input"
            value={categorySearch}
            onChange={(event) => {
              setCategorySearch(event.target.value);
              if (event.target.value !== form.shopifyCategoryName) {
                setForm((current) => ({ ...current, shopifyCategoryId: '', shopifyCategoryName: '' }));
              }
            }}
            placeholder="Search Shopify categories"
          />
          {searchingCategories && <div className="jatb-row-sub" style={{ marginTop: 6 }}>Searching Shopify…</div>}
          {categoryResults.length > 0 && (
            <div className="jatb-category-results">
              {categoryResults.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="jatb-category-result"
                  onClick={() => {
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
            <div className="jatb-selected-category">
              <span>{form.shopifyCategoryName}</span>
              <button
                type="button"
                className="jatb-batch-remove"
                aria-label="Remove Shopify category"
                onClick={() => {
                  setForm((current) => ({ ...current, shopifyCategoryId: '', shopifyCategoryName: '' }));
                  setCategorySearch('');
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
        <div className="jatb-field wide">
          <label className="jatb-label">Product description</label>
          <textarea className="jatb-textarea" rows={3} value={form.productDescription} onChange={set('productDescription')} placeholder="Shown to customers on Shopify" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">SEO title</label>
          <input className="jatb-input" value={form.seoTitle} onChange={set('seoTitle')} placeholder="Defaults to item title" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">SEO description</label>
          <textarea className="jatb-textarea" rows={2} value={form.seoDescription} onChange={set('seoDescription')} placeholder="Optional search description" />
        </div>
      </div>
    </div>
  );
}

function IntakeScreen({ consignor, items, onBack, onSaveBatch }) {
  const emptyForm = {
    category: 'Clothing',
    type: TYPE_OPTIONS.Clothing[0],
    description: '',
    size: '',
    condition: 'Good',
    price: '',
    photo: null,
    tags: '',
    vendor: '',
    brand: '',
    productDescription: '',
    shopifyCategoryId: '',
    shopifyCategoryName: '',
    seoTitle: '',
    seoDescription: '',
    notes: '',
    createProduct: false,
    publishOnline: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [batch, setBatch] = useState([]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const canAdd = form.description.trim() && form.price !== '';
  const saveCount = batch.length + (canAdd ? 1 : 0);
  const savedSequence = items
    .filter((item) => item.consignorId === consignor.id && item.itemNumber.startsWith(`${consignor.number}-`))
    .reduce((max, item) => Math.max(max, Number(item.itemNumber.split('-').pop()) || 0), 0);
  const nextItemNumber = `${consignor.number}-${String(savedSequence + batch.length + 1).padStart(3, '0')}`;

  function addToBatch() {
    if (!canAdd) return;
    setBatch((b) => [...b, form]);
    setForm({
      ...emptyForm,
      category: form.category,
      type: form.type,
      tags: form.tags,
      vendor: form.vendor,
      brand: form.brand,
    });
  }
  function removeFromBatch(idx) {
    setBatch((b) => b.filter((_, i) => i !== idx));
  }

  return (
    <>
      <Header eyebrow={`For ${consignor.firstName} ${consignor.lastName} · #${consignor.number}`} title="Add items" onBack={onBack} />
      <div className="jatb-body">
        {batch.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label className="jatb-label">Items ready to save ({batch.length})</label>
            {batch.map((b, idx) => (
              <div key={idx} className="jatb-batch-item">
                <div className="jatb-batch-thumb">
                  {b.photo ? <img src={b.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{b.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.type}{b.size ? ` · Size ${b.size}` : ''} · {money(b.price)}</div>
                  {b.createProduct && (
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                      {b.publishOnline
                        ? 'Active on Point of Sale + Online Store'
                        : 'Active on Point of Sale'}
                    </div>
                  )}
                </div>
                <button className="jatb-batch-remove" onClick={() => removeFromBatch(idx)} aria-label="Remove"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="jatb-section-heading">
          <label className="jatb-label">{batch.length > 0 ? 'Next item' : 'Consignment item'}</label>
          <span className="jatb-item-number">{nextItemNumber}</span>
        </div>
        <div className="jatb-card jatb-intake-primary">
          <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
          <div className="jatb-intake-primary-fields">
            <div className="jatb-field">
              <label className="jatb-label">Item description *</label>
              <input className="jatb-input" value={form.description} onChange={set('description')} placeholder="What is it?" />
            </div>
            <div className="jatb-field">
              <label className="jatb-label">Price *</label>
              <input className="jatb-input" type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
          </div>
        </div>

        <ConsignmentItemFields form={form} setForm={setForm} />

        <details className="jatb-card jatb-shopify-section">
          <summary className="jatb-shopify-summary">
            <span>
              <ShoppingBag size={17} />
              <strong>Shopify product</strong>
            </span>
            <span className="jatb-row-sub">Optional paid feature</span>
          </summary>
          <div className="jatb-shopify-content">
            <p className="jatb-shopify-help">
              Only open this section when this consigned item also needs to be created as a Shopify product.
            </p>
            <ShopifyProductFields form={form} setForm={setForm} />
            <label className="jatb-product-choice">
              <input
                type="checkbox"
                checked={form.createProduct}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  createProduct: event.target.checked,
                  publishOnline: event.target.checked ? current.publishOnline : false,
                }))}
              />
              <span>
                <strong>Create Shopify product</strong>
                <span>Creates an Active product with inventory of one and publishes it to Point of Sale.</span>
              </span>
            </label>
            {form.createProduct && (
              <label className="jatb-product-choice online">
                <input
                  type="checkbox"
                  checked={form.publishOnline}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    publishOnline: event.target.checked,
                  }))}
                />
                <span>
                  <strong>Also publish to Online Store</strong>
                  <span>Publishes this product online using the Shopify information above.</span>
                </span>
              </label>
            )}
          </div>
        </details>

        <button className="jatb-btn secondary jatb-add-another" disabled={!canAdd} onClick={addToBatch}>
          <Plus size={16} /> Add another item
        </button>
      </div>
      <div className="jatb-fab-wrap">
        <button
          className="jatb-btn"
          disabled={saveCount === 0}
          onClick={() => onSaveBatch(canAdd ? [...batch, form] : batch)}
        >
          <Check size={18} /> Save {saveCount === 1 ? 'item' : `${saveCount} items`}
        </button>
      </div>
    </>
  );
}

function productAdminUrl(productId) {
  const numericId = String(productId || '').split('/').pop();
  return `shopify://admin/products/${numericId}`;
}

function EditItemScreen({
  item,
  onBack,
  onSave,
  onDelete,
  onCreateProduct,
  onActivateProduct,
  onUpdateStatus,
}) {
  const [form, setForm] = useState({
    category: item.category || '', type: item.type || '',
    description: item.description, size: item.size, condition: item.condition,
    price: item.price, photo: item.photo,
    tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
    vendor: item.vendor || '',
    brand: item.brand || '',
    productDescription: item.productDescription || '',
    shopifyCategoryId: item.shopifyCategoryId || '',
    shopifyCategoryName: item.shopifyCategoryName || '',
    seoTitle: item.seoTitle || '',
    seoDescription: item.seoDescription || '',
    notes: item.notes || '',
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activating, setActivating] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [salePrice, setSalePrice] = useState(item.salePrice ?? item.price ?? '');
  const [dateSold, setDateSold] = useState(item.dateSold || new Date().toISOString().slice(0, 10));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isSold = item.status === 'Sold' || Boolean(item.dateSold);
  const isPaid = item.paidOut === true;
  const canSave = form.description.trim() && form.price !== '';

  return (
    <>
      <Header eyebrow={`Item ${item.itemNumber}`} title="Edit item" onBack={onBack} />
      <div className="jatb-body">
        <div className="jatb-card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <PhotoPicker value={form.photo} onChange={(v) => setForm((f) => ({ ...f, photo: v }))} />
            <div style={{ flex: 1 }}>
              <div className="jatb-field" style={{ marginBottom: 8 }}>
                <label className="jatb-label">Item description *</label>
                <input className="jatb-input" value={form.description} onChange={set('description')} placeholder="Hand-knit baby blanket" />
              </div>
            </div>
          </div>

          <div className="jatb-field">
            <label className="jatb-label">Price *</label>
            <input className="jatb-input" type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
          </div>

          <ConsignmentItemFields form={form} setForm={setForm} />
        </div>

        <div className="jatb-status-card">
          {!isSold && (
            <div className="jatb-manual-sale">
              <div className="jatb-manual-sale-copy">
                <strong>Manual sale</strong>
                <span>Only use for a sale outside Shopify.</span>
              </div>
              <div className="jatb-manual-sale-controls">
                <div className="jatb-field">
                  <label className="jatb-label">Sale price</label>
                  <input className="jatb-input" type="number" inputMode="decimal" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                </div>
                <button className="jatb-btn jatb-sold-btn" disabled={statusSaving || salePrice === ''} onClick={async () => {
                  setStatusSaving(true);
                  try { await onUpdateStatus(item.id, 'Sold', { salePrice, dateSold }); } finally { setStatusSaving(false); }
                }}>
                  Sold
                </button>
              </div>
            </div>
          )}

          {isSold && !isPaid && (
            <div className="jatb-sold-status">
              <span className="jatb-badge unpaid">Sold · unpaid</span>
              <span className="jatb-row-sub">Waiting in Payouts for payment.</span>
            </div>
          )}

          {isPaid && (
            <div className="jatb-status-actions">
              <span className="jatb-badge paid">Paid</span>
              <span className="cm-paid-detail">
                {item.payoutDate || ''} · {item.payoutMethod || 'Payment recorded'} · {money(item.payoutAmount)}
              </span>
            </div>
          )}
        </div>

        <div className={`jatb-product-card ${isSold ? 'disabled' : ''}`}>
          <details className="jatb-shopify-edit-details">
            <summary className="jatb-shopify-summary">
              <span>
                <ShoppingBag size={17} color="var(--green-dark)" />
                <strong>Shopify product information</strong>
              </span>
              <span className="jatb-row-sub">Optional</span>
            </summary>
            <div className="jatb-shopify-content">
              <ShopifyProductFields form={form} setForm={setForm} />
            </div>
          </details>

          {!item.shopifyProductId && (
            <>
              <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
                Create an Active product with this item’s photo, price, SKU, and inventory
                of one. It will be available on Point of Sale only—not the Online Store.
              </p>
              <button className="jatb-btn secondary" onClick={() => onCreateProduct(item.id)}>
                <ShoppingBag size={16} /> Create Shopify product
              </button>
            </>
          )}

          {item.shopifyProductId && item.shopifyProductStatus !== 'ACTIVE' && (
            <>
              <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: 12, lineHeight: 1.45 }}>
                {item.shopifyProductTitle || item.description} is saved as a draft. Finish its
                category, description, SEO, and other details in Shopify. When it is ready,
                return here to make it active.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <a
                  className="jatb-btn secondary"
                  href={productAdminUrl(item.shopifyProductId)}
                  target="_top"
                >
                  <ExternalLink size={16} /> Edit Shopify product
                </a>
                <button
                  className="jatb-btn"
                  disabled={activating}
                  onClick={async () => {
                    setActivating(true);
                    try {
                      await onActivateProduct(item.id);
                    } finally {
                      setActivating(false);
                    }
                  }}
                >
                  {activating ? <Loader2 className="jatb-spin" size={16} /> : <Check size={16} />}
                  {activating ? 'Publishing…' : 'Make active for POS'}
                </button>
              </div>
            </>
          )}

          {item.shopifyProductId && item.shopifyProductStatus === 'ACTIVE' && (
            <>
              <p style={{ margin: '0 0 10px', color: 'var(--green-dark)', fontSize: 12, lineHeight: 1.45 }}>
                <Check size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                Active and available on Point of Sale with SKU {item.itemNumber}. It is not
                automatically published to the Online Store.
              </p>
              <a
                className="jatb-btn secondary"
                href={productAdminUrl(item.shopifyProductId)}
                target="_top"
              >
                <ExternalLink size={16} /> Edit Shopify product
              </a>
            </>
          )}
        </div>

        {!confirmingDelete ? (
          <button className="jatb-btn secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={16} /> Delete item
          </button>
        ) : (
          <div className="jatb-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>Delete {item.itemNumber} for good?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="jatb-btn secondary" style={{ padding: '8px 14px' }} onClick={() => setConfirmingDelete(false)}>Cancel</button>
              <button className="jatb-btn danger" style={{ padding: '8px 14px' }} onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>
      <div className="jatb-fab-wrap">
        <button className="jatb-btn" disabled={!canSave || isSold} onClick={() => onSave(item.id, form)}>
          <Check size={18} /> Save changes
        </button>
      </div>
    </>
  );
}

/* ---------- app ---------- */

export default function ConsignmentIntakeApp() {
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
  const [error, setError] = useState('');

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

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
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
      flash(`${result.imported} ${kind === 'consignors' ? 'consignor' : 'item'}${result.imported === 1 ? '' : 's'} imported`);
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

  async function handleCreateProduct(itemId) {
    try {
      setError('');
      await createShopifyProduct(itemId);
      await refreshData();
      flash('Shopify product is active on Point of Sale');
    } catch (e) {
      setError(errorMessage(e, 'Could not create the Shopify product'));
    }
  }

  async function handleActivateProduct(itemId) {
    try {
      setError('');
      await activateShopifyProduct(itemId);
      await refreshData();
      flash('Product is active on Point of Sale');
    } catch (e) {
      setError(errorMessage(e, 'Could not activate and publish the Shopify product'));
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
    <div className="jatb">
      <GlobalStyle />
      {ready && <AppNavigation view={navigationView} onNavigate={navigate} />}
      {toast && <div className="jatb-toast"><Check size={14} /> {toast}</div>}
      {error && (
        <div className="jatb-toast" style={{ background: 'var(--danger)', top: 12 }}>
          <X size={14} /> {error}
        </div>
      )}

      {!ready && (
        <div className="jatb-loading">
          <Loader2 className="jatb-spin" size={22} />
        </div>
      )}

      {ready && view === 'dashboard' && (
        <DashboardScreen
          consignors={consignors}
          items={items}
          onOpenConsignor={openConsignor}
          onNavigate={navigate}
          onNewConsignor={() => startNewConsignor('consignor', 'dashboard')}
          onNewItem={startNewItem}
        />
      )}

      {ready && view === 'home' && (
        <HomeScreen
          consignors={consignors}
          items={items}
          query={query}
          setQuery={setQuery}
          onOpenConsignor={openConsignor}
          onNewConsignor={() => startNewConsignor('consignor', 'home')}
          onImport={() => startImport('consignors', 'home')}
          onExport={() => exportConsignors(consignors)}
        />
      )}

      {ready && view === 'items' && (
        <ItemsScreen
          items={items}
          consignors={consignors}
          onOpenItem={openItem}
          onImport={() => startImport('items', 'items')}
          onExport={() => exportItems(items, consignors)}
        />
      )}

      {ready && view === 'sales' && (
        <SalesScreen items={items} consignors={consignors} />
      )}

      {ready && view === 'payouts' && (
        <PayoutsScreen
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
        <NewConsignorScreen onBack={() => setView(newConsignorBack)} onSave={handleNewConsignor} nextNumber={nextConsignorNumber} />
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
        <ConsignorScreen
          consignor={activeConsignor}
          items={items}
          onBack={() => setView('home')}
          onStartIntake={() => setView('intake')}
          onImportItems={() => startImport('items', 'consignor', activeConsignor.id)}
          onOpenItem={openItem}
          onDeleteItem={handleDeleteItem}
          onDeleteConsignor={handleDeleteConsignor}
          onEditConsignor={() => setView('editConsignor')}
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
        />
      )}

      {ready && view === 'editItem' && activeItem && (
        <EditItemScreen
          item={activeItem}
          onBack={() => setView('consignor')}
          onSave={handleUpdateItem}
          onDelete={handleDeleteItemFromEdit}
          onCreateProduct={handleCreateProduct}
          onActivateProduct={handleActivateProduct}
          onUpdateStatus={handleUpdateItemStatus}
        />
      )}
    </div>
  );
}
