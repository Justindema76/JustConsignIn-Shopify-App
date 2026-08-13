/* eslint-disable react/prop-types, jsx-a11y/label-has-associated-control */
import { useState, useEffect } from 'react';
import {
  Search, Plus, ArrowLeft, Camera, X, ChevronRight, ChevronDown, Phone, Mail,
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
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

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
        /* Aliases — some newer components reference these names instead of
           the ones above. Keeping both in sync avoids invisible borders/
           buttons if a rule uses the other name. */
        --text: var(--ink);
        --border: var(--line);
        --blue: var(--green);
        --blue-soft: var(--green-soft);
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

      .jatb-back-to-top {
        position: fixed; right: max(18px, calc((100vw - 1240px) / 2 + 18px));
        bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 40;
        display: inline-flex; align-items: center; justify-content: center;
        width: 44px; height: 44px; min-width: 44px; padding: 0; border: 0; border-radius: 50%;
        background: var(--green); color: #fff;
        box-shadow: 0 6px 18px rgba(20,63,115,.28);
      }
      .jatb-back-to-top:hover { background: var(--green-dark); }
      .jatb-back-to-top:focus-visible { outline: 3px solid var(--green-soft); outline-offset: 2px; }

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

      .cm-consignor-row { margin-bottom: 10px; }
      .cm-consignor-row-summary {
        width: 100%; display: flex; align-items: center; gap: 12px;
        background: var(--surface); border: 1px solid var(--line);
        border-radius: 12px; padding: 14px 14px; cursor: pointer;
        list-style: none; transition: background .15s;
      }
      .cm-consignor-row-summary::-webkit-details-marker { display: none; }
      .cm-consignor-row-summary:active { background: var(--green-soft); }
      .cm-consignor-row-name {
        display: block; padding: 0; border: 0; background: none;
        font-family: inherit; font-weight: 600; font-size: 15px; color: var(--ink);
        text-align: left; cursor: pointer;
      }
      .cm-consignor-row-name:hover { text-decoration: underline; color: var(--green); }
      .cm-consignor-row-chevron { color: var(--muted); flex-shrink: 0; transition: transform .15s; }
      .cm-consignor-row[open] .cm-consignor-row-summary { border-radius: 12px 12px 0 0; border-bottom: 0; }
      .cm-consignor-row[open] .cm-consignor-row-chevron { transform: rotate(180deg); }
      .cm-consignor-row-items {
        border: 1px solid var(--line); border-top: 0; border-radius: 0 0 12px 12px;
        background: #fff; padding: 6px 10px;
      }
      .cm-consignor-row-item {
        display: flex; align-items: center; gap: 10px; padding: 9px 4px;
        border-bottom: 1px solid var(--line);
      }
      .cm-consignor-row-item:last-child { border-bottom: 0; }
      .cm-consignor-row-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .cm-consignor-row-item-main strong { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cm-consignor-row-item-main small { font-size: 11px; color: var(--muted); }
      .cm-consignor-row-item-price { font-size: 13px; flex-shrink: 0; }

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
      .cm-page-toolbar { display:grid; grid-template-columns:minmax(240px,1fr) repeat(4,minmax(145px,auto)) auto; gap:10px; align-items:end; }
      .cm-consignors-toolbar { grid-template-columns:minmax(260px,1fr) minmax(190px,260px) auto; }
      .cm-page-toolbar .jatb-search { width:100%; min-height:42px; }
      .cm-tool-field, .cm-tool-view { min-width:0; }
      .cm-tool-field > span, .cm-tool-view > span { display:block; margin-bottom:6px; color:var(--muted); font-size:10px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
      .cm-tool-field .jatb-select { width:100%; min-width:0; min-height:42px; }
      .cm-tool-view .cm-view-toggle { min-height:42px; }
      .cm-items-toolbar { grid-template-columns:minmax(240px,1fr) repeat(4,minmax(145px,auto)) auto; }
      .cm-items-filter-details { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); overflow: hidden; }
      .cm-items-filter-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 12px 14px; list-style: none; color: var(--ink); font-size: 13px; font-weight: 700; cursor: pointer; }
      .cm-items-filter-summary::-webkit-details-marker { display: none; }
      .cm-items-filter-summary svg { color: var(--muted); transition: transform .15s; }
      .cm-items-filter-details[open] .cm-items-filter-summary svg { transform: rotate(180deg); }
      .cm-items-filter-details .cm-items-toolbar-top { padding: 12px 14px 14px; border-top: 1px solid var(--line); }
      .cm-readable-card-sku { display: flex !important; align-items: baseline; gap: 2px; min-width: 0; white-space: nowrap; }
      .cm-readable-card-sku b { flex-shrink: 0; font-size: 10px; }
      .cm-readable-card-sku span { overflow: hidden; text-overflow: ellipsis; }
      @media (max-width:980px) {
        .cm-page-toolbar, .cm-items-toolbar, .cm-consignors-toolbar { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .cm-page-toolbar .jatb-search { grid-column:1/-1; }
        .cm-tool-view { grid-column:1/-1; }
        .cm-tool-view .cm-view-toggle { width:100%; }
        .cm-tool-view .cm-view-toggle button { flex:1; }
      }
      @media (max-width:600px) {
        .cm-page-toolbar, .cm-items-toolbar, .cm-consignors-toolbar { grid-template-columns:1fr; gap:9px; }
        .cm-page-toolbar .jatb-search, .cm-tool-view { grid-column:auto; }
        .cm-page-toolbar .cm-filter-select, .cm-page-toolbar .jatb-select { width:100%; min-width:0; }
        .cm-readable-grid, .cm-consignor-grid, .cm-sales-grid-view { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:8px; }
        .cm-readable-card { min-width:0; }
        .cm-readable-card-meta { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }
        .cm-readable-card-meta strong { font-size:18px; overflow-wrap:anywhere; }
        .cm-readable-card-details { align-items:flex-start; }
        .cm-readable-card-actions > *,
        .cm-sales-grid-actions .cm-sales-pay-btn,
        .cm-sales-pay-btn.compact { min-height:32px; padding:6px 8px; font-size:10px; }
      }
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
        display: grid; grid-template-columns: minmax(220px, 2fr) minmax(130px, 1fr) 100px 100px 118px 92px;
        gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .cm-list-row:last-child { border-bottom: 0; }
      .cm-list-head { color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .cm-item-groups { display: grid; gap: 12px; }
      .cm-item-group {
        border: 1px solid var(--line); border-radius: 12px; background: var(--surface); overflow: hidden;
      }
      .cm-item-group-summary {
        list-style: none; display: grid; grid-template-columns: 30px 38px minmax(0, 1fr) 86px 70px;
        gap: 12px; align-items: center; padding: 14px; cursor: pointer;
      }
      .cm-item-group-summary::-webkit-details-marker { display: none; }
      .cm-item-group-chevron {
        width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 999px;
        display: grid; place-items: center; color: var(--muted); transition: transform .15s;
      }
      .cm-item-group[open] .cm-item-group-chevron { transform: rotate(90deg); }
      .cm-item-group-avatar { width: 38px; height: 38px; flex: 0 0 auto; }
      .cm-item-group-person { min-width: 0; }
      .cm-item-group-person > span { display: block; }
      .cm-item-group-link {
        color: var(--green-dark); font-size: 14px; font-weight: 700; width: fit-content; cursor: pointer;
      }
      .cm-item-group-link:hover, .cm-item-group-link:focus-visible { text-decoration: underline; }
      .cm-item-group-meta { display: flex !important; align-items: baseline; gap: 5px; margin-top: 3px; }
      .cm-item-group-number { color: var(--green-dark); font-size: 15px; font-weight: 800; line-height: 1.2; }
      .cm-item-group-count { color: var(--muted); font-size: 12px; font-weight: 500; }
      .cm-item-group-stat { text-align: right; }
      .cm-item-group-stat strong, .cm-item-group-stat span { display: block; }
      .cm-item-group-stat strong { font-size: 14px; }
      .cm-item-group-stat span { color: var(--muted); font-size: 10px; margin-top: 2px; }
      .cm-item-group-items { border-top: 1px solid var(--line); }
      .cm-grouped-item-row {
        display: grid; grid-template-columns: minmax(220px, 2fr) 90px 90px 112px 92px 112px;
        gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); font-size: 13px;
      }
      .cm-grouped-item-row:last-child { border-bottom: 0; }
      .cm-grouped-item-open {
        display: flex; align-items: center; gap: 10px; min-width: 0; border: 0; background: transparent;
        color: inherit; padding: 0; text-align: left; font: inherit;
      }
      .cm-grouped-item-open > span:last-child { min-width: 0; }
      .cm-grouped-item-open strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cm-grouped-item-open > span:last-child > span { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
      .cm-item-quick-action { display: flex; justify-content: flex-start; }
      .cm-quick-sold-btn {
        border: 0; border-radius: 8px; padding: 9px 11px; background: var(--green); color: #fff;
        font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer;
      }
      .cm-quick-sold-btn:disabled { opacity: .65; cursor: wait; }
      .cm-item-action-note { color: var(--muted); font-size: 11px; }
      .cm-items-toolbar {
        display: grid; grid-template-columns: minmax(250px, 1fr) 170px 155px 170px auto;
        gap: 10px; align-items: center; margin-bottom: 12px;
      }
      .cm-view-toggle { display: flex; border: 1px solid var(--line); border-radius: 9px; overflow: hidden; background: var(--surface); }
      .cm-view-toggle button { border: 0; border-right: 1px solid var(--line); background: transparent; color: var(--muted); padding: 10px 11px; font-size: 12px; font-weight: 700; white-space: nowrap; }
      .cm-view-toggle button:last-child { border-right: 0; }
      .cm-view-toggle button.active { background: #E7F0FA; color: var(--green-dark); }
      .cm-finder-toggle button { display:flex; align-items:center; justify-content:center; gap:7px; min-height:42px; cursor:pointer; }
      .cm-consignor-list { padding:0; overflow:hidden; }
      .cm-consignor-list-row { width:100%; display:grid; grid-template-columns:minmax(230px,2fr) minmax(190px,1.4fr) 70px 100px 24px; gap:14px; align-items:center; padding:13px 16px; border:0; border-bottom:1px solid var(--line); background:var(--surface); color:var(--ink); text-align:left; font:inherit; cursor:pointer; }
      .cm-consignor-list-row:last-child { border-bottom:0; }
      button.cm-consignor-list-row:hover { background:#F8FAFC; }
      .cm-consignor-identity { display:flex; align-items:center; gap:11px; min-width:0; }
      .cm-consignor-identity > span:last-child, .cm-consignor-contact { display:grid; gap:3px; min-width:0; }
      .cm-consignor-identity strong, .cm-consignor-contact strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
      .cm-consignor-identity small, .cm-consignor-contact small { color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
      .cm-consignor-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
      .cm-consignor-card { display:flex; flex-direction:column; min-height:220px; padding:18px; border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--ink); text-align:left; font:inherit; cursor:pointer; box-shadow:0 1px 2px rgba(15,23,42,.04); }
      .cm-consignor-card:hover { border-color:#9EBFE4; box-shadow:0 7px 20px rgba(15,23,42,.08); }
      .cm-consignor-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; color:var(--muted); }
      .cm-consignor-card-name { font-size:16px; line-height:1.25; }
      .cm-consignor-card-number { color:var(--muted); margin-top:4px; font-size:14px; font-weight:700; }
      .cm-consignor-card-contact { color:var(--muted); font-size:12px; margin:13px 0 16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .cm-consignor-card-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:auto; padding-top:14px; border-top:1px solid var(--line); }
      .cm-consignor-card-stats span { display:grid; gap:3px; }
      .cm-consignor-card-stats small { color:var(--muted); font-size:9px; text-transform:uppercase; font-weight:700; }
      .cm-consignor-card-stats strong { font-size:15px; }
      .cm-consignor-profile-link { border: 0; background: transparent; color: var(--green-dark); padding: 0; font: inherit; font-weight: 700; text-align: left; cursor: pointer; width: fit-content; }
      .cm-consignor-profile-link:hover, .cm-consignor-profile-link:focus-visible { text-decoration: underline; }
      .cm-item-group-chevron { padding: 0; background: var(--surface); cursor: pointer; }
      .cm-item-group-chevron.open { transform: rotate(90deg); }
      .cm-item-open-btn, .cm-grid-open-btn { border: 1px solid #9EBFE4; border-radius: 8px; background: #fff; color: var(--green-dark); padding: 8px 10px; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
      .cm-all-items-card { padding: 0; overflow: hidden; }
      .cm-all-item-row { display: grid; grid-template-columns: minmax(210px, 2fr) 82px minmax(120px, 1fr) 84px 88px 108px 90px 108px; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line); font-size: 13px; }
      .cm-all-item-row:last-child { border-bottom: 0; }
      .cm-all-items-card > .cm-list-head { grid-template-columns: minmax(210px, 2fr) 82px minmax(120px, 1fr) 84px 88px 108px 90px 108px; }
      .cm-items-grid { display: grid; grid-template-columns: repeat(auto-fill, 148px); gap: 8px; justify-content: start; align-items: start; }
      .cm-item-grid-card { width: 148px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface); overflow: hidden; min-width: 0; }
      .cm-grid-image { width: 100%; height: 78px; border: 0; border-bottom: 1px solid var(--line); background: #F4F6F8; display: block; padding: 0; overflow: hidden; cursor: pointer; }
      .cm-grid-image-wrapper { width: 100%; height: 100%; display: grid; place-items: center; overflow: hidden; }
      .cm-grid-image img { display: block; width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; object-position: center; }
      .cm-grid-card-body { padding: 8px; display: grid; gap: 5px; overflow: hidden; }
      .cm-grid-title { border: 0; background: transparent; padding: 0; color: var(--ink); font-size: 11px; font-weight: 800; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
      .cm-grid-sub { color: var(--muted); font-size: 8px; }
      .cm-grid-card-body .cm-consignor-profile-link { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; font-weight: 700; }
      .cm-grid-meta { display: grid; grid-template-columns: 1fr; gap: 7px; }
      .cm-grid-meta span { min-width: 0; }
      .cm-grid-meta small, .cm-grid-meta strong { display: block; }
      .cm-grid-meta small { color: var(--muted); font-size: 7px; }
      .cm-grid-meta strong { font-size: 10px; margin-top: 1px; }
      .cm-grid-badges { display: flex; flex-wrap: wrap; gap: 3px; min-height: 17px; }
      .cm-grid-badges .cm-product-badge, .cm-grid-badges .jatb-badge { min-width: 0; padding: 3px 5px; font-size: 6px; }
      .cm-item-grid-card .cm-quick-sold-btn, .cm-item-grid-card .cm-grid-open-btn { width: 100%; padding: 6px; font-size: 9px; }
      .cm-sales-row {
        display: grid; grid-template-columns: minmax(230px, 2fr) 86px minmax(130px, 1fr) 92px 112px 92px 128px;
        gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--line);
        font-size: 13px;
      }
      .cm-sales-row:last-child { border-bottom: 0; }
      .cm-sales-action { display: flex; justify-content: flex-start; }
      .cm-sales-pay-btn {
        border: 0; border-radius: 8px; padding: 9px 12px; background: var(--green); color: white;
        font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer;
      }
      .cm-sales-paid-note { color: var(--muted); font-size: 12px; font-weight: 600; }
      .cm-product-badge {
        display: inline-flex; align-items: center; justify-content: center; justify-self: start;
        width: fit-content; min-width: 76px; padding: 5px 9px; border-radius: 999px;
        font-size: 10px; font-weight: 700; line-height: 1; text-transform: uppercase; white-space: nowrap;
      }
      .cm-product-badge.manual { background: #FDE68A; color: #713F12; }
      .cm-product-badge.draft { background: #FFF4D6; color: #8A5D14; }
      .cm-product-badge.pos { background: #E4EEF9; color: #143F73; }
      .cm-product-badge.online { background: #DFF5E7; color: #17663A; }
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
      .cm-payout-list.grid {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px; padding: 16px;
      }
      .cm-payout-list.grid .cm-section-title,
      .cm-payout-list.grid .cm-empty-small { grid-column: 1 / -1; }
      .cm-payout-list.grid .cm-payout-row {
        grid-template-columns: minmax(0, 1fr); align-content: space-between;
        gap: 16px; min-width: 0; min-height: 144px; margin: 0; padding: 16px;
      }
      .cm-payout-list.grid .cm-payout-action { justify-content: space-between; }
      @media (max-width: 720px) {
        .cm-payout-list.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 10px; }
        .cm-payout-list.grid .cm-payout-row { min-height: 178px; padding: 10px; gap: 10px; }
        .cm-payout-list.grid .cm-payout-person { align-items: flex-start; gap: 8px; }
        .cm-payout-list.grid .jatb-avatar { width: 34px; height: 34px; border-radius: 9px; font-size: 13px; }
        .cm-payout-list.grid .jatb-row-name { font-size: 13px; line-height: 1.25; }
        .cm-payout-list.grid .jatb-row-sub { font-size: 10px; line-height: 1.35; }
        .cm-payout-list.grid .cm-payout-action { flex-direction: column; align-items: stretch; gap: 8px; }
        .cm-payout-list.grid .cm-payout-amount { font-size: 16px; }
        .cm-payout-list.grid .cm-payout-action .jatb-btn { width: 100%; min-width: 0; padding: 8px 6px; font-size: 11px; }
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
      .cm-history-consignor-link {
        display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-weight: 700; color: var(--ink); cursor: pointer;
      }
      .cm-history-consignor-link:hover { color: var(--green); text-decoration: underline; }
      .cm-history-consignor-link:focus-visible {
        color: var(--green); text-decoration: underline; outline: 2px solid var(--green-soft); outline-offset: 2px;
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
      .jatb-shopify-photo-row {
        display: grid; grid-template-columns: 140px minmax(0, 1fr);
        gap: 16px; align-items: start; margin-top: 12px;
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
        .cm-list-row { grid-template-columns: minmax(180px, 2fr) minmax(110px, 1fr) 85px 108px 92px; }
        .cm-list-row > :nth-child(4) { display: none; }
        .cm-grouped-item-row { grid-template-columns: minmax(190px, 2fr) 84px 106px 88px 106px; }
        .cm-grouped-item-row > :nth-child(3) { display: none; }
        .cm-sales-row { grid-template-columns: minmax(200px, 2fr) 80px minmax(120px, 1fr) 88px 100px 86px 118px; }
        .cm-items-toolbar { grid-template-columns: minmax(220px, 1fr) 160px 145px 160px; }
        .cm-view-toggle { grid-column: 1 / -1; width: fit-content; }
        .cm-items-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .cm-all-item-row, .cm-all-items-card > .cm-list-head { grid-template-columns: minmax(180px, 2fr) 76px minmax(105px, 1fr) 80px 102px 86px 102px; }
        .cm-all-item-row > :nth-child(5), .cm-all-items-card > .cm-list-head > :nth-child(5) { display: none; }
      }
      @media (max-width: 640px) {
        .jatb { padding-bottom: 74px; }
        .jatb-back-to-top {
          right: 14px;
          bottom: calc(84px + env(safe-area-inset-bottom));
        }
        .jatb-header { padding: 18px 16px 12px; position: static; }
        .jatb-header-row { flex-direction: column; align-items: stretch; gap: 10px; }
        .jatb-header-action { width: 100%; }
        .cm-header-actions { flex-wrap: wrap; }
        .cm-header-actions .jatb-btn {
          width: calc(50% - 4px); flex: 0 0 auto;
        }
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
        .cm-list-row > :nth-child(2), .cm-list-row > :nth-child(3), .cm-list-row > :nth-child(4), .cm-list-row > :nth-child(6) { display: none; }
        .cm-item-group-summary { grid-template-columns: 28px 36px minmax(0, 1fr); gap: 9px; padding: 12px; }
        .cm-item-group-stat { display: none; }
        .cm-grouped-item-row {
          position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; padding: 10px 12px;
        }
        .cm-grouped-item-row.cm-list-head { display: none; }
        .cm-grouped-item-row > :nth-child(1) { flex: 1 1 100%; min-width: 0; padding-right: 96px; }
        .cm-grouped-item-row > :nth-child(3) { display: none; }
        .cm-grouped-item-row > .cm-item-quick-action {
          position: absolute; top: 12px; right: 12px; margin: 0;
          display: flex; justify-content: flex-end;
        }
        .cm-grouped-item-row .cm-item-open-btn,
        .cm-grouped-item-row .cm-quick-sold-btn { width: auto; min-width: 0; padding: 7px 9px; font-size: 11px; }
        .cm-sales-row { grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding: 12px; }
        .cm-sales-row.cm-list-head { display: none; }
        .cm-sales-row > :nth-child(2), .cm-sales-row > :nth-child(3), .cm-sales-row > :nth-child(4), .cm-sales-row > :nth-child(5), .cm-sales-row > :nth-child(6) { display: none; }
        .cm-sales-pay-btn { width: auto; min-width: 112px; }
        .cm-consignor-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }
        .cm-consignor-card { min-height:190px; padding:12px; }
        .cm-consignor-card-stats { gap:4px; }
        .cm-consignor-card-stats small { font-size:7px; }
        .cm-consignor-card-stats strong { font-size:12px; }
        .cm-consignor-list-row { grid-template-columns:minmax(0,1fr) auto; gap:10px; padding:12px; }
        .cm-consignor-list-row.cm-list-head { display:none; }
        .cm-consignor-list-row > :nth-child(2), .cm-consignor-list-row > :nth-child(4) { display:none; }
        .cm-items-toolbar { grid-template-columns: 1fr; }
        .cm-view-toggle { width: 100%; }
        .cm-view-toggle button { flex: 1; padding: 9px 5px; font-size: 10px; }
        .cm-items-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; justify-content: stretch; }
        .cm-item-grid-card { width: 100%; }
        .cm-grid-image { height: 78px; }
        .cm-grid-card-body { padding: 8px; }
        .cm-all-item-row {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px;
        }
        .cm-all-items-card > .cm-list-head { display: none; }
        .cm-all-item-row > :nth-child(1) { flex: 1 1 100%; }
        .cm-all-item-row > :nth-child(3), .cm-all-item-row > :nth-child(5) { display: none; }
        .cm-all-item-row > :nth-child(2) { font-weight: 800; color: var(--green-dark); }
        .cm-all-item-row > :nth-child(8) { margin-left: auto; }
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
        .jatb-shopify-photo-row {
          grid-template-columns: minmax(0, 1fr); gap: 12px;
        }
        .jatb-shopify-photo-row .jatb-photo-btn { width: 96px; height: 96px; }
        .jatb-detail-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .jatb-detail-grid .jatb-field.wide { grid-column: auto; }
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

      /* Shared readable card layout — used by both the Items grid and the
         Sales grid so the two views look consistent. */
      .cm-readable-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; align-items:stretch; }
      .cm-readable-card { min-width:0; min-height:270px; display:flex; flex-direction:column; padding:16px; border:1px solid var(--line); border-radius:12px; background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.04); }
      .cm-readable-card-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
      .cm-readable-card-top strong { display:block; overflow:hidden; color:var(--ink); font-size:16px; line-height:1.25; white-space:nowrap; text-overflow:ellipsis; }
      .cm-readable-card-top small { display:block; margin-top:5px; color:var(--muted); font-size:11px; }
      .cm-readable-card-top small b { color:var(--ink); }
      .cm-grid-thumb-row { display:flex; gap:10px; align-items:center; min-width:0; }
      .cm-grid-thumb { flex:0 0 auto; width:44px; height:44px; border-radius:8px; overflow:hidden; background:var(--green-soft); display:flex; align-items:center; justify-content:center; }
      .cm-grid-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
      .cm-readable-consignor-link { padding:0; border:0; background:none; color:var(--green); font:inherit; font-size:14px; font-weight:800; text-align:left; cursor:pointer; margin-top:12px; }
      .cm-readable-card-meta { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0 14px; padding:14px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
      .cm-readable-card-meta span { display:flex; flex-direction:column; gap:3px; }
      .cm-readable-card-meta small { color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; }
      .cm-readable-card-meta strong { color:var(--ink); font-size:21px; line-height:1.1; }
      .cm-sales-money-rows { grid-template-columns:1fr; gap:0; }
      .cm-sales-money-rows > span { flex-direction:row; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; }
      .cm-sales-money-rows > span + span { border-top:1px solid var(--line); }
      .cm-sales-money-rows strong { white-space:nowrap; overflow-wrap:normal; word-break:normal; flex-shrink:0; }
      .cm-readable-card-details { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; }
      .cm-readable-card-details strong { color:var(--ink); font-size:13px; }
      .cm-readable-card-actions { margin-top:auto; display:flex; gap:8px; flex-wrap:wrap; }
      .cm-readable-card-actions > * { flex:1; min-height:42px; }
      @media (max-width:1100px) { .cm-readable-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
      @media (max-width:760px) { .cm-readable-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .cm-readable-card { min-height:250px; padding:13px; } .cm-readable-card-meta strong { font-size:18px; } }

      /* Items toolbar: two clean rows matching the approved inventory layout. */
      .cm-items-toolbar {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        margin: 2px 0 16px;
      }
      .cm-items-toolbar-top {
        display: grid;
        grid-template-columns: repeat(4, minmax(150px, 1fr));
        gap: 12px;
        max-width: 920px;
        align-items: end;
      }
      .cm-items-toolbar-bottom {
        display: grid;
        grid-template-columns: minmax(260px, 520px) auto;
        gap: 12px;
        align-items: end;
      }
      .cm-items-toolbar .cm-tool-field,
      .cm-items-toolbar .cm-tool-view { min-width: 0; }
      .cm-items-toolbar .cm-tool-field > span,
      .cm-items-toolbar .cm-tool-view > span {
        display: block;
        margin-bottom: 6px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .cm-items-toolbar .jatb-select {
        width: 100%;
        min-width: 0;
        min-height: 44px;
        border-radius: 11px;
      }
      .cm-items-toolbar .jatb-search {
        width: 100%;
        min-width: 0;
        min-height: 46px;
        margin: 0;
        border-radius: 12px;
      }
      .cm-items-toolbar .cm-view-toggle { min-height: 46px; }
      @media (max-width: 900px) {
        .cm-items-toolbar-top { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: none; }
      }
      @media (max-width: 640px) {
        .cm-items-toolbar { gap: 12px; }
        .cm-items-toolbar-top,
        .cm-items-toolbar-bottom { grid-template-columns: 1fr; gap: 9px; }
        .cm-items-toolbar .cm-view-toggle { width: 100%; }
        .cm-items-toolbar .cm-view-toggle button { flex: 1; min-height: 44px; font-size: 12px; }
      }
      /* Consignor dashboard */
      .cm-consignor-profile {
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: hidden; padding: 0; margin-bottom: 10px;
      }
      .cm-profile-column { min-width: 0; padding: 10px 14px; }
      .cm-profile-column + .cm-profile-column { border-left: 1px solid var(--line); background: #FAFBFC; }
      .cm-profile-title {
        margin: 0 0 2px; color: var(--ink); font-size: 10px; font-weight: 800;
        text-align: center; text-transform: uppercase; letter-spacing: .07em;
      }
      .cm-profile-row {
        min-height: 50px; display: grid; grid-template-columns: 25px minmax(0, 1fr);
        align-items: center; gap: 8px; border-bottom: 1px solid #EDF0F2;
      }
      .cm-profile-row:last-child { border-bottom: 0; }
      .cm-profile-row.detail { grid-template-columns: minmax(0, 1fr); padding-left: 33px; }
      .cm-profile-icon { width: 25px; height: 25px; display: grid; place-items: center; color: var(--muted); }
      .cm-profile-copy { min-width: 0; }
      .cm-profile-label {
        display: block; margin-bottom: 3px; color: var(--muted); font-size: 9px;
        font-weight: 800; line-height: 1; text-transform: uppercase; letter-spacing: .045em;
      }
      .cm-profile-value { display: block; color: var(--ink); font-size: 12px; font-weight: 650; line-height: 1.35; overflow-wrap: anywhere; }
      .cm-profile-link { color: var(--blue); font-weight: 750; text-decoration: none; }
      .cm-profile-link:hover, .cm-profile-link:focus { text-decoration: underline; }
      .cm-consignor-stats {
        display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px; margin-bottom: 16px;
      }
      .cm-consignor-stat {
        min-width: 0; min-height: 62px; display: flex; flex-direction: column;
        justify-content: center; padding: 10px 12px; border: 1px solid var(--line);
        border-radius: 9px; background: var(--surface);
      }
      .cm-consignor-stat span { color: var(--muted); font-size: 11px; font-weight: 650; white-space: nowrap; }
      .cm-consignor-stat strong { margin-top: 5px; color: var(--ink); font-size: 20px; line-height: 1; white-space: nowrap; }
      .cm-consignor-items-head {
        display: flex; align-items: flex-end; justify-content: space-between;
        gap: 12px; margin: 0 0 9px;
      }
      .cm-consignor-items-head h3 { margin: 0; font-size: 17px; }
      .cm-consignor-items-tools { display: flex; align-items: center; gap: 10px; }
      .cm-consignor-items-count { color: var(--muted); font-size: 13px; }
      .cm-consignor-view-toggle {
        display: grid; grid-template-columns: 1fr 1fr; overflow: hidden;
        border: 1px solid var(--line); border-radius: 8px; background: var(--surface);
      }
      .cm-consignor-view-toggle button {
        height: 32px; padding: 0 12px; border: 0; border-right: 1px solid var(--line);
        background: var(--surface); color: var(--muted); font-size: 12px; font-weight: 750;
      }
      .cm-consignor-view-toggle button:last-child { border-right: 0; }
      .cm-consignor-view-toggle button.active { background: #EAF2FC; color: #153E7A; }
      .cm-consignor-item-list { display: grid; gap: 8px; }
      .cm-consignor-item {
        display: grid; grid-template-columns: minmax(0, 1fr) auto;
        align-items: center; gap: 12px; margin: 0; padding: 10px 12px;
      }
      .cm-consignor-item-open {
        min-width: 0; display: grid; grid-template-columns: 48px minmax(0, 1fr);
        align-items: center; gap: 12px; padding: 0; border: 0; background: transparent; text-align: left;
      }
      .cm-consignor-item-copy { min-width: 0; }
      .cm-consignor-item-title { display: block; overflow: hidden; color: var(--ink); font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .cm-consignor-item-meta { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; line-height: 1.35; }
      .cm-consignor-item-actions {
        display: grid; grid-template-columns: minmax(76px, auto) minmax(96px, auto) minmax(106px, auto);
        align-items: center; justify-content: end; gap: 6px;
      }
      .cm-consignor-item-actions .cm-product-badge,
      .cm-consignor-item-actions .jatb-badge { width: 100%; min-width: 0; box-sizing: border-box; }
      .cm-consignor-pay-btn {
        height: 32px; padding: 0 10px; border: 0; border-radius: 8px;
        background: var(--blue); color: white; font-size: 11px; font-weight: 750; white-space: nowrap;
      }
      .cm-consignor-item-list.grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .cm-consignor-item-list.grid .cm-consignor-item {
        display: flex; flex-direction: column; align-items: stretch; min-width: 0; min-height: 180px;
      }
      .cm-consignor-item-list.grid .cm-consignor-item-open {
        grid-template-columns: 42px minmax(0, 1fr);
      }
      .cm-consignor-item-list.grid .cm-consignor-item-actions {
        grid-template-columns: 1fr; justify-content: stretch; width: 100%; margin-top: auto;
      }

      @media (max-width: 640px) {
        .cm-consignor-profile { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .cm-profile-column { padding: 9px 10px; }
        .cm-profile-row { min-height: 54px; grid-template-columns: 20px minmax(0, 1fr); gap: 6px; }
        .cm-profile-row.detail { grid-template-columns: minmax(0, 1fr); padding-left: 26px; }
        .cm-profile-icon { width: 20px; height: 20px; }
        .cm-profile-label { font-size: 8px; }
        .cm-profile-value { font-size: 10px; }
        .cm-consignor-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-bottom: 14px; }
        .cm-consignor-stat { min-height: 58px; padding: 9px 7px; }
        .cm-consignor-stat span { font-size: 9px; }
        .cm-consignor-stat strong { font-size: 17px; }
        .cm-consignor-items-head { align-items: flex-start; flex-direction: column; }
        .cm-consignor-items-tools { width: 100%; justify-content: space-between; }
        .cm-consignor-view-toggle { margin-left: auto; }
        .cm-consignor-item-list.grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
        .cm-consignor-item-list.grid .cm-consignor-item { min-height: 224px; padding: 10px; gap: 8px; }
        .cm-consignor-item-list.grid .cm-consignor-item-open { grid-template-columns: 38px minmax(0, 1fr); gap: 8px; }
        .cm-consignor-item-list:not(.grid) .cm-consignor-item {
          grid-template-columns: minmax(0, 1fr); align-items: stretch;
        }
        .cm-consignor-item-list:not(.grid) .cm-consignor-item-actions {
          grid-template-columns: minmax(72px, 82px) minmax(92px, 106px) minmax(104px, 112px);
          justify-content: start; padding-left: 60px;
        }
        .cm-consignor-item-title { font-size: 13px; }
        .cm-consignor-item-meta { font-size: 11px; overflow-wrap: anywhere; }
        .cm-consignor-pay-btn { padding: 0 7px; font-size: 10px; }
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

// Display-only relabel: the stored status value stays "Draft" (so existing
// data and filters keep working) but manual items shouldn't show a badge
// that reads "Draft" next to Shopify's own draft/active product status.
function statusLabel(status) {
  const value = status || 'Draft';
  return value === 'Draft' ? 'Pending' : value;
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

function ItemsScreen({ items, consignors, onOpenItem, onOpenConsignor, onMarkSold, onNewItem }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Current');
  const [consignorFilter, setConsignorFilter] = useState('All');
  const [productFilter, setProductFilter] = useState('All');
  const [sort, setSort] = useState('consignor');
  const [viewMode, setViewMode] = useState('list');
  const [sellingItemId, setSellingItemId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const statuses = ['Current', 'Draft', 'Available', 'Sold', 'Archived', 'Returned', 'Donated'];
  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));

  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    const consignor = consignorById[item.consignorId];
    const matchesQuery = !q || `${item.description} ${item.itemNumber} ${item.type} ${item.brand || ''} ${consignor?.firstName || ''} ${consignor?.lastName || ''} ${consignor?.number || ''}`.toLowerCase().includes(q);
    const matchesConsignor = consignorFilter === 'All' || item.consignorId === consignorFilter;
    const product = productLabel(item);
    const matchesProduct = productFilter === 'All'
      || (productFilter === 'Manual' && product.className === 'manual')
      || (productFilter === 'POS' && product.text === 'POS')
      || (productFilter === 'Online' && product.text === 'Online')
      || (productFilter === 'POS + Online' && product.text === 'POS + Online');
    const matchesStatus = filter === 'Current'
      ? !item.paidOut
      : filter === 'Archived'
        ? item.paidOut
        : filter === 'Available'
          ? item.status === 'Available' || item.status === 'Active'
          : item.status === filter && !item.paidOut;
    return matchesQuery && matchesConsignor && matchesProduct && matchesStatus;
  }).sort((a, b) => {
    if (sort === 'oldest') return String(a.dateReceived || '').localeCompare(String(b.dateReceived || ''));
    if (sort === 'consignor') {
      const aName = `${consignorById[a.consignorId]?.lastName || ''} ${consignorById[a.consignorId]?.firstName || ''}`;
      const bName = `${consignorById[b.consignorId]?.lastName || ''} ${consignorById[b.consignorId]?.firstName || ''}`;
      return aName.localeCompare(bName) || a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true });
    }
    if (sort === 'ticket') return a.itemNumber.localeCompare(b.itemNumber, undefined, { numeric: true });
    if (sort === 'priceHigh') return Number(b.price || 0) - Number(a.price || 0);
    if (sort === 'priceLow') return Number(a.price || 0) - Number(b.price || 0);
    return String(b.dateReceived || '').localeCompare(String(a.dateReceived || '')) || b.itemNumber.localeCompare(a.itemNumber, undefined, { numeric: true });
  });

  const grouped = filtered.reduce((groups, item) => {
    const key = item.consignorId || 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
    return groups;
  }, new Map());

  const groupedEntries = Array.from(grouped.entries()).sort(([aId, aItems], [bId, bItems]) => {
    if (sort !== 'consignor') return filtered.indexOf(aItems[0]) - filtered.indexOf(bItems[0]);
    const a = consignorById[aId];
    const b = consignorById[bId];
    return `${a?.lastName || ''} ${a?.firstName || ''}`.localeCompare(`${b?.lastName || ''} ${b?.firstName || ''}`);
  });

  async function quickMarkSold(item) {
    if (sellingItemId) return;
    const amount = window.prompt(`Sale price for ${item.description || item.itemNumber}`, String(item.price ?? ''));
    if (amount === null) return;
    const salePrice = Number(amount);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      window.alert('Enter a valid sale price.');
      return;
    }
    setSellingItemId(item.id);
    try {
      await onMarkSold(item.id, { salePrice, dateSold: new Date().toISOString().slice(0, 10) });
    } finally {
      setSellingItemId(null);
    }
  }

  function toggleGroup(consignorId) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(consignorId)) next.delete(consignorId);
      else next.add(consignorId);
      return next;
    });
  }

  function ConsignorName({ consignor }) {
    if (!consignor) return <span>Unassigned</span>;
    return (
      <button type="button" className="cm-consignor-profile-link" onClick={() => onOpenConsignor(consignor.id)}>
        {consignor.firstName} {consignor.lastName}
      </button>
    );
  }

  function ItemAction({ item, product, compact = false }) {
    const isManualAvailable = product.className === 'manual' && (item.status === 'Available' || item.status === 'Active') && !item.paidOut;
    if (isManualAvailable) {
      return (
        <button type="button" className="cm-quick-sold-btn" disabled={sellingItemId === item.id} onClick={() => quickMarkSold(item)}>
          {sellingItemId === item.id ? 'Saving…' : 'Mark sold'}
        </button>
      );
    }
    return (
      <button type="button" className={compact ? 'cm-grid-open-btn' : 'cm-item-open-btn'} onClick={() => onOpenItem(item.id)}>
        Open item
      </button>
    );
  }

  return (
    <>
      <Header
        eyebrow="Inventory"
        title="Items"
        action={(
          <button className="jatb-btn" type="button" onClick={onNewItem}>
            <Plus size={17} /> Add new item
          </button>
        )}
      />
      <div className="jatb-body">
        <div className="cm-items-toolbar">
          <details className="cm-items-filter-details">
            <summary className="cm-items-filter-summary">
              <span>Filters &amp; sorting</span>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>
            <div className="cm-items-toolbar-top">
            <label className="cm-tool-field"><span>Consignor</span><select className="jatb-select cm-filter-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)} aria-label="Filter by consignor">
              <option value="All">All consignors</option>
              {consignors.map((consignor) => <option key={consignor.id} value={consignor.id}>#{consignor.number} · {consignor.firstName} {consignor.lastName}</option>)}
            </select></label>
            <label className="cm-tool-field"><span>Sort</span><select className="jatb-select cm-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort items">
              <option value="consignor">Consignor name</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="ticket">SKU / item number</option><option value="priceHigh">Price high to low</option><option value="priceLow">Price low to high</option>
            </select></label>
            <label className="cm-tool-field"><span>Product type</span><select className="jatb-select cm-filter-select" value={productFilter} onChange={(event) => setProductFilter(event.target.value)} aria-label="Filter by product type">
              <option value="All">All product types</option><option value="Manual">Manual</option><option value="POS">POS</option><option value="Online">Online</option><option value="POS + Online">POS + Online</option>
            </select></label>
            <label className="cm-tool-field"><span>Status</span><select id="item-status-filter" className="jatb-select cm-filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
              {statuses.map((status) => {
                const count = status === 'Current' ? items.filter((item) => !item.paidOut).length : status === 'Archived' ? items.filter((item) => item.paidOut).length : items.filter((item) => item.status === status && !item.paidOut).length;
                return <option key={status} value={status}>{statusLabel(status)} ({count})</option>;
              })}
            </select></label>
            </div>
          </details>
          <div className="cm-items-toolbar-bottom">
            <div className="jatb-search">
              <Search size={19} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, brand, or consignor" />
            </div>
            <div className="cm-tool-view"><span>View</span><div className="cm-view-toggle cm-finder-toggle" aria-label="Choose item view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> All items</button>
              <button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
            </div></div>
          </div>
        </div>


        {filtered.length === 0 && <section className="jatb-card"><div className="cm-empty-small">No items match these filters.</div></section>}

        {viewMode === 'grouped' && (
          <div className="cm-item-groups">
            {groupedEntries.map(([consignorId, consignorItems]) => {
              const consignor = consignorById[consignorId];
              const availableCount = consignorItems.filter((item) => item.status === 'Available' || item.status === 'Active').length;
              const soldCount = consignorItems.filter((item) => item.status === 'Sold' || item.dateSold).length;
              const initials = consignor ? `${consignor.firstName?.[0] || ''}${consignor.lastName?.[0] || ''}` : '—';
              const collapsed = collapsedGroups.has(consignorId);
              return (
                <section className="cm-item-group" key={consignorId}>
                  <div className="cm-item-group-summary">
                    <button type="button" className={`cm-item-group-chevron ${collapsed ? '' : 'open'}`} onClick={() => toggleGroup(consignorId)} aria-label={collapsed ? 'Expand consignor items' : 'Collapse consignor items'}><ChevronRight size={16} /></button>
                    <span className="jatb-avatar cm-item-group-avatar">{initials}</span>
                    <span className="cm-item-group-person">
                      <ConsignorName consignor={consignor} />
                      <span className="cm-item-group-meta"><strong className="cm-item-group-number">#{consignor?.number || '—'}</strong><span className="cm-item-group-count">· {consignorItems.length} item{consignorItems.length === 1 ? '' : 's'}</span></span>
                    </span>
                    <span className="cm-item-group-stat"><strong>{availableCount}</strong><span>Available</span></span>
                    <span className="cm-item-group-stat"><strong>{soldCount}</strong><span>Sold</span></span>
                  </div>
                  {!collapsed && (
                    <div className="cm-item-group-items">
                      <div className="cm-grouped-item-row cm-list-head"><span>Item</span><span>Price</span><span>Commission</span><span>Product</span><span>Status</span><span>Action</span></div>
                      {consignorItems.map((item) => {
                        const product = productLabel(item);
                        return (
                          <div className="cm-grouped-item-row" key={item.id}>
                            <button type="button" className="cm-grouped-item-open" onClick={() => onOpenItem(item.id)}><span className="jatb-batch-thumb">{item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}</span><span><strong>{item.description || item.type || 'Consignment item'}</strong><span>{item.itemNumber}{item.size ? ` · ${item.size}` : ''}{item.brand ? ` · ${item.brand}` : ''}</span></span></button>
                            <strong>{money(item.price)}</strong><span>{item.commissionPct}%</span><span className={`cm-product-badge ${product.className}`}>{product.text}</span><span className={`jatb-badge ${item.paidOut ? 'sold' : statusClass(item.status)}`}>{item.paidOut ? 'Paid · archived' : statusLabel(item.status)}</span><span className="cm-item-quick-action"><ItemAction item={item} product={product} /></span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {viewMode === 'list' && (
          <section className="jatb-card cm-all-items-card">
            <div className="cm-list-row cm-list-head"><span>Item</span><span>SKU</span><span>Consignor</span><span>Price</span><span>Commission</span><span>Product</span><span>Status</span><span>Action</span></div>
            {filtered.map((item) => {
              const consignor = consignorById[item.consignorId];
              const product = productLabel(item);
              return (
                <div className="cm-all-item-row" key={item.id}>
                  <button type="button" className="cm-grouped-item-open" onClick={() => onOpenItem(item.id)}><span className="jatb-batch-thumb">{item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}</span><span><strong>{item.description || item.type || 'Consignment item'}</strong><span>{item.itemNumber}{item.size ? ` · ${item.size}` : ''}{item.brand ? ` · ${item.brand}` : ''}</span></span></button>
                  <strong>{item.itemNumber || '—'}</strong><ConsignorName consignor={consignor} /><strong>{money(item.price)}</strong><span>{item.commissionPct}%</span><span className={`cm-product-badge ${product.className}`}>{product.text}</span><span className={`jatb-badge ${item.paidOut ? 'sold' : statusClass(item.status)}`}>{item.paidOut ? 'Paid · archived' : statusLabel(item.status)}</span><span className="cm-item-quick-action"><ItemAction item={item} product={product} /></span>
                </div>
              );
            })}
          </section>
        )}

        {viewMode === 'grid' && (
          <div className="cm-readable-grid">
            {filtered.map((item) => {
              const consignor = consignorById[item.consignorId];
              const product = productLabel(item);
              return (
                <article className="cm-readable-card" key={item.id}>
                  <div className="cm-readable-card-top">
                    <div className="cm-grid-thumb-row">
                      <div className="cm-grid-thumb">
                        {(item.shopifyPhoto || item.photo) ? (
                          <img src={item.shopifyPhoto || item.photo} alt="" />
                        ) : (
                          <Tag size={16} color="var(--muted)" />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong>{item.description || item.type || 'Consignment item'}</strong>
                        <small className="cm-readable-card-sku"><b>SKU {item.itemNumber || '—'}</b>{item.size ? <span> · {item.size}</span> : null}</small>
                      </div>
                    </div>
                    <span className={`cm-product-badge ${product.className}`}>{product.text}</span>
                  </div>

                  {consignor ? (
                    <button type="button" className="cm-readable-consignor-link" onClick={() => onOpenConsignor(consignor.id)}>
                      {consignor.firstName} {consignor.lastName}
                    </button>
                  ) : (
                    <span className="cm-readable-consignor-link" style={{ cursor: 'default', color: 'var(--muted)' }}>Unassigned</span>
                  )}

                  <div className="cm-readable-card-meta cm-sales-money-rows">
                    <span><small>Price</small><strong>{money(item.price)}</strong></span>
                    <span><small>Commission</small><strong>{item.commissionPct}%</strong></span>
                  </div>

                  <div className="cm-readable-card-details">
                    <span><small>Status</small></span>
                    <span className={`jatb-badge ${item.paidOut ? 'sold' : statusClass(item.status)}`}>{item.paidOut ? 'Paid' : statusLabel(item.status)}</span>
                  </div>

                  <div className="cm-readable-card-actions"><ItemAction item={item} product={product} compact /></div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function SalesScreen({ items, consignors, onStartPayout, onOpenConsignor }) {
  const [query, setQuery] = useState('');
  const [payoutFilter, setPayoutFilter] = useState('all');
  const [consignorFilter, setConsignorFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortMode, setSortMode] = useState('newest');
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches,
  );

  const consignorById = Object.fromEntries(consignors.map((entry) => [entry.id, entry]));
  const saleSource = (item) => {
    if (!item.shopifyProductId && !item.shopifyProduct) return 'manual';
    if (item.publishOnline || item.publishToOnlineStore) return 'online';
    return 'pos';
  };

  const allSales = items.filter((item) => item.status === 'Sold' || item.dateSold || item.orderId);
  const filteredSales = allSales
    .filter((item) => {
      const consignor = consignorById[item.consignorId];
      const q = query.trim().toLowerCase();
      const searchable = `${item.description || ''} ${item.itemNumber || ''} ${item.orderName || ''} ${consignor?.firstName || ''} ${consignor?.lastName || ''}`.toLowerCase();
      if (q && !searchable.includes(q)) return false;
      if (payoutFilter === 'paid' && !item.paidOut) return false;
      if (payoutFilter === 'unpaid' && item.paidOut) return false;
      if (consignorFilter !== 'all' && item.consignorId !== consignorFilter) return false;
      if (sourceFilter !== 'all' && saleSource(item) !== sourceFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const aConsignor = consignorById[a.consignorId];
      const bConsignor = consignorById[b.consignorId];
      const aPrice = Number(a.salePrice ?? a.price ?? 0);
      const bPrice = Number(b.salePrice ?? b.price ?? 0);
      const aDue = (aPrice * Number(a.commissionPct ?? aConsignor?.commissionPct ?? 0)) / 100;
      const bDue = (bPrice * Number(b.commissionPct ?? bConsignor?.commissionPct ?? 0)) / 100;
      if (sortMode === 'oldest') return String(a.dateSold || '').localeCompare(String(b.dateSold || ''));
      if (sortMode === 'price') return bPrice - aPrice;
      if (sortMode === 'due') return bDue - aDue;
      if (sortMode === 'consignor') return `${aConsignor?.lastName || ''} ${aConsignor?.firstName || ''}`.localeCompare(`${bConsignor?.lastName || ''} ${bConsignor?.firstName || ''}`);
      if (sortMode === 'sku') return String(a.itemNumber || '').localeCompare(String(b.itemNumber || ''), undefined, { numeric: true });
      return String(b.dateSold || '').localeCompare(String(a.dateSold || ''));
    });

  const groupedSales = Object.values(filteredSales.reduce((groups, item) => {
    const key = item.consignorId || 'unknown';
    if (!groups[key]) groups[key] = { consignor: consignorById[item.consignorId], sales: [] };
    groups[key].sales.push(item);
    return groups;
  }, {})).sort((a, b) => `${a.consignor?.lastName || ''} ${a.consignor?.firstName || ''}`.localeCompare(`${b.consignor?.lastName || ''} ${b.consignor?.firstName || ''}`));

  const totalSales = allSales.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const totalUnpaid = allSales.filter((item) => !item.paidOut).reduce((sum, item) => {
    const consignor = consignorById[item.consignorId];
    const salePrice = Number(item.salePrice ?? item.price ?? 0);
    return sum + (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
  }, 0);
  const unpaidCount = allSales.filter((item) => !item.paidOut).length;
  const paidCount = allSales.filter((item) => item.paidOut).length;

  const sourceLabel = (item) => {
    const source = saleSource(item);
    if (source === 'online') return { text: 'Online', className: 'online' };
    if (source === 'pos') return { text: 'POS', className: 'pos' };
    return { text: 'Manual', className: 'manual' };
  };

  const formatSaleDate = (value) => {
    if (!value) return 'Date unavailable';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const exportSales = () => {
    const headers = ['SKU', 'Item', 'Consignor', 'Source', 'Sale price', 'Consignor due', 'Payout status', 'Date sold', 'Order'];
    const rows = filteredSales.map((item) => {
      const consignor = consignorById[item.consignorId];
      const price = Number(item.salePrice ?? item.price ?? 0);
      const due = (price * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
      return [item.itemNumber || '', item.description || '', consignor ? `${consignor.firstName} ${consignor.lastName}` : '', sourceLabel(item).text, price, due, item.paidOut ? 'Paid' : 'Unpaid', item.dateSold || '', item.orderName || ''];
    });
    downloadCsv(`sales-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const ConsignorLink = ({ consignor }) => consignor ? (
    <button type="button" className="cm-sales-consignor-link" onClick={() => onOpenConsignor?.(consignor.id)}>{consignor.firstName} {consignor.lastName}</button>
  ) : <span>—</span>;

  const PayoutAction = ({ item, consignor, compact = false }) => !item.paidOut && consignor ? (
    <button type="button" className={`cm-sales-pay-btn${compact ? ' compact' : ''}`} onClick={() => onStartPayout(consignor.id)}>Pay consignor</button>
  ) : (
    <span className="cm-sales-paid-note">Paid</span>
  );

  return (
    <>
      <Header
        eyebrow="Sales ledger"
        title="Sales"
        action={<button type="button" className="jatb-btn secondary" onClick={exportSales}><Download size={16} /> Export</button>}
      />
      <div className="jatb-body cm-sales-page">
        <div className="cm-sales-summary-grid">
          <div className="cm-sales-summary-card"><span>Total sales</span><strong>{money(totalSales)}</strong></div>
          <div className="cm-sales-summary-card"><span>Unpaid to consignors</span><strong>{money(totalUnpaid)}</strong></div>
          <div className="cm-sales-summary-card"><span>Unpaid sales</span><strong>{unpaidCount}</strong></div>
          <div className="cm-sales-summary-card"><span>Paid sales</span><strong>{paidCount}</strong></div>
        </div>

        <div className="cm-sales-toolbar">
          <div className="jatb-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sale, SKU, order, or consignor" /></div>
          <details className="cm-sales-filter-dropdown" open={filtersOpen} onToggle={(event) => setFiltersOpen(event.currentTarget.open)}>
            <summary><span>Filters &amp; sorting</span><ChevronDown size={17} /></summary>
            <div className="cm-sales-filter-fields">
              <label className="cm-tool-field"><span>Payout status</span><select className="jatb-select" value={payoutFilter} onChange={(event) => setPayoutFilter(event.target.value)}><option value="all">All payout statuses</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
              <label className="cm-tool-field"><span>Consignor</span><select className="jatb-select" value={consignorFilter} onChange={(event) => setConsignorFilter(event.target.value)}><option value="all">All consignors</option>{consignors.slice().sort((a,b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)).map((consignor) => <option key={consignor.id} value={consignor.id}>{consignor.firstName} {consignor.lastName}</option>)}</select></label>
              <label className="cm-tool-field"><span>Sale source</span><select className="jatb-select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="all">All sale sources</option><option value="manual">Manual</option><option value="pos">POS</option><option value="online">Online</option></select></label>
              <label className="cm-tool-field"><span>Sort</span><select className="jatb-select" value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price">Highest sale price</option><option value="due">Highest consignor due</option><option value="consignor">Consignor name</option><option value="sku">SKU</option></select></label>
            </div>
          </details>
          <div className="cm-tool-view cm-sales-view"><span>View</span><div className="cm-view-toggle cm-finder-toggle" aria-label="Choose sales view"><button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> All sales</button><button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button><button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button></div></div>
        </div>

        {filteredSales.length === 0 && <div className="cm-empty-small">No sales match the selected filters.</div>}

        {viewMode === 'list' && filteredSales.length > 0 && (
          <>
            <div className="cm-sales-scroll-hint" aria-hidden="true">Swipe to see more <span>→</span></div>
            <section className="jatb-card cm-sales-table-card">
            <div className="cm-sales-multi-row cm-list-head"><span>Sale</span><span>SKU</span><span>Consignor</span><span>Source</span><span>Sale price</span><span>Consignor due</span><span>Payout</span><span>Action</span></div>
            {filteredSales.map((item) => {
              const consignor = consignorById[item.consignorId];
              const salePrice = Number(item.salePrice ?? item.price ?? 0);
              const due = (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
              const source = sourceLabel(item);
              return <div className="cm-sales-multi-row" key={item.id}><span className="cm-item-primary"><span className="jatb-batch-thumb">{item.photo ? <img src={item.photo} alt="" /> : <ReceiptText size={16} color="var(--green-dark)" />}</span><span><strong>{item.description || item.itemNumber}</strong><span>{item.orderName || (source.text === 'Manual' ? 'Manual sale' : 'Shopify order')} · {item.dateSold || 'Paid'}</span></span></span><strong>{item.itemNumber || '—'}</strong><ConsignorLink consignor={consignor} /><span className={`cm-product-badge ${source.className}`}>{source.text}</span><strong>{money(salePrice)}</strong><strong>{money(due)}</strong><span className={`jatb-badge ${item.paidOut ? 'available' : 'draft'}`}>{item.paidOut ? 'Paid' : 'Unpaid'}</span><span className="cm-sales-action"><PayoutAction item={item} consignor={consignor} /></span></div>;
            })}
            </section>
          </>
        )}

        {viewMode === 'grouped' && filteredSales.length > 0 && (
          <div className="cm-sales-groups">
            {groupedSales.map(({ consignor, sales }) => {
              const groupTotal = sales.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
              const groupDue = sales.filter((item) => !item.paidOut).reduce((sum, item) => {
                const price = Number(item.salePrice ?? item.price ?? 0);
                return sum + (price * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
              }, 0);
              return (
                <details className="cm-sales-group" open key={consignor?.id || 'unknown'}>
                  <summary>
                    <span className="cm-sales-group-chevron">›</span>
                    <span className="cm-sales-avatar">{`${consignor?.firstName?.[0] || '?'}${consignor?.lastName?.[0] || ''}`}</span>
                    <span className="cm-sales-group-person"><ConsignorLink consignor={consignor} /><small>Consignor #{consignor?.number || '—'} · {sales.length} sales</small></span>
                    <span className="cm-sales-group-stat"><strong>{money(groupTotal)}</strong><small>Total sales</small></span>
                    <span className="cm-sales-group-stat"><strong>{money(groupDue)}</strong><small>Total owed</small></span>
                    <span className="cm-sales-group-stat"><strong>{sales.filter((item) => !item.paidOut).length}</strong><small>Unpaid</small></span>
                  </summary>
                  <div className="cm-sales-scroll-hint" aria-hidden="true">Swipe to see more <span>→</span></div>
                  <div className="cm-sales-group-list cm-sales-table-card">
                    <div className="cm-sales-multi-row cm-list-head"><span>Sale</span><span>SKU</span><span>Consignor</span><span>Source</span><span>Sale price</span><span>Consignor due</span><span>Payout</span><span>Action</span></div>
                    {sales.map((item) => {
                      const salePrice = Number(item.salePrice ?? item.price ?? 0);
                      const due = (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
                      const source = sourceLabel(item);
                      return <div className="cm-sales-multi-row" key={item.id}><span className="cm-item-primary"><span className="jatb-batch-thumb">{item.photo ? <img src={item.photo} alt="" /> : <ReceiptText size={16} color="var(--green-dark)" />}</span><span><strong>{item.description || item.itemNumber}</strong><span>{item.orderName || (source.text === 'Manual' ? 'Manual sale' : 'Shopify order')} · {item.dateSold || 'Paid'}</span></span></span><strong>{item.itemNumber || '—'}</strong><ConsignorLink consignor={consignor} /><span className={`cm-product-badge ${source.className}`}>{source.text}</span><strong>{money(salePrice)}</strong><strong>{money(due)}</strong><span className={`jatb-badge ${item.paidOut ? 'available' : 'draft'}`}>{item.paidOut ? 'Paid' : 'Unpaid'}</span><span className="cm-sales-action"><PayoutAction item={item} consignor={consignor} /></span></div>;
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {viewMode === 'grid' && filteredSales.length > 0 && (
          <div className="cm-readable-grid">
            {filteredSales.map((item) => {
              const consignor = consignorById[item.consignorId];
              const salePrice = Number(item.salePrice ?? item.price ?? 0);
              const due = (salePrice * Number(item.commissionPct ?? consignor?.commissionPct ?? 0)) / 100;
              const source = sourceLabel(item);
              return (
                <article className="cm-readable-card" key={item.id}>
                  <div className="cm-readable-card-top">
                    <div className="cm-grid-thumb-row">
                      <div className="cm-grid-thumb">
                        {(item.shopifyPhoto || item.photo) ? (
                          <img src={item.shopifyPhoto || item.photo} alt="" />
                        ) : (
                          <Tag size={16} color="var(--muted)" />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <strong>{item.description || item.itemNumber}</strong>
                        <small><b>SKU:</b> {item.itemNumber || '—'}</small>
                      </div>
                    </div>
                    <span className={`cm-product-badge ${source.className}`}>{source.text}</span>
                  </div>

                  <ConsignorLink consignor={consignor} />

                  <div className="cm-readable-card-meta cm-sales-money-rows">
                    <span><small>Sale price</small><strong>{money(salePrice)}</strong></span>
                    <span><small>Consignor due</small><strong>{money(due)}</strong></span>
                  </div>

                  <div className="cm-readable-card-details">
                    <span><small>Sale date</small><strong>{formatSaleDate(item.dateSold)}</strong></span>
                    <span className={`jatb-badge ${item.paidOut ? 'available' : 'draft'}`}>{item.paidOut ? 'Paid' : 'Unpaid'}</span>
                  </div>

                  <div className="cm-sales-grid-order">{item.orderName || (source.text === 'Manual' ? 'Manual sale' : 'Shopify order')}</div>
                  <div className="cm-readable-card-actions"><PayoutAction item={item} consignor={consignor} compact /></div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        .cm-sales-header-tools { display:flex; align-items:center; gap:10px; min-width:min(680px, 58vw); }
        .cm-sales-search { position:relative; flex:1; }
        .cm-sales-search > span { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); }
        .cm-sales-search input { width:100%; min-height:40px; padding:9px 12px 9px 35px; border:1px solid var(--border); border-radius:10px; background:#fff; }
        .cm-sales-page { padding-top:14px; }
        .cm-sales-summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; }
        .cm-sales-summary-card { background:#fff; border:1px solid var(--border); border-radius:11px; padding:13px; }
        .cm-sales-summary-card span { display:block; color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; }
        .cm-sales-summary-card strong { display:block; margin-top:4px; font-size:18px; }
        .cm-sales-toolbar { display:grid; grid-template-columns:minmax(220px,300px) minmax(0,1fr) auto; gap:10px; align-items:end; margin-bottom:14px; }
        .cm-sales-toolbar > .jatb-search { margin:0; min-height:42px; }
        .cm-sales-filter-dropdown > summary { display:none; }
        .cm-sales-filter-fields { display:grid; grid-template-columns:repeat(4,minmax(135px,1fr)); gap:10px; align-items:end; }
        .cm-sales-filter-fields .cm-tool-field > span { display:block; margin-bottom:6px; color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; }
        .cm-sales-filter-fields select { width:100%; min-height:40px; padding:9px 10px; border:1px solid var(--border); border-radius:9px; background:#fff; }
        .cm-sales-scroll-hint { display:none; }
        .cm-sales-filter-row > label > span { display:block; margin-bottom:6px; color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; }
        .cm-sales-filter-row select { width:100%; min-height:40px; padding:9px 10px; border:1px solid var(--border); border-radius:9px; background:#fff; }
        .cm-sales-view-toggle { display:flex; overflow:hidden; border:1px solid var(--border); border-radius:9px; background:#fff; }
        .cm-sales-view-toggle button { min-height:40px; padding:9px 12px; border:0; border-right:1px solid var(--border); background:#fff; color:var(--muted); font-weight:700; white-space:nowrap; }
        .cm-sales-view-toggle button:last-child { border-right:0; }
        .cm-sales-view-toggle button.active { background:var(--green-soft); color:var(--green); }
        .cm-sales-table-card { padding:0; overflow:hidden; }
        .cm-sales-multi-row { display:grid; grid-template-columns:minmax(210px,1.35fr) 85px minmax(130px,1fr) 95px 95px 110px 85px 120px; gap:12px; align-items:center; padding:12px 14px; border-bottom:1px solid var(--border); font-size:12px; }
        .cm-sales-multi-row:last-child { border-bottom:0; }
        .cm-sales-consignor-link { padding:0; border:0; background:none; color:var(--green); font:inherit; font-weight:700; text-align:left; cursor:pointer; }
        .cm-sales-consignor-link:hover { text-decoration:underline; }
        .cm-sales-pay-btn { border:0; border-radius:8px; background:var(--green); color:#fff; padding:8px 10px; font-size:11px; font-weight:700; white-space:nowrap; cursor:pointer; }
        .cm-sales-pay-btn.compact { width:100%; }
        .cm-sales-money-rows { grid-template-columns:1fr; gap:0; }
        .cm-sales-money-rows > span { flex-direction:row; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; }
        .cm-sales-money-rows > span + span { border-top:1px solid var(--border); }
        .cm-sales-money-rows strong { white-space:nowrap; overflow-wrap:normal; }
        .cm-sales-paid-note { color:var(--green-dark); font-size:11px; font-weight:700; }
        .cm-sales-group { margin-bottom:10px; overflow:hidden; border:1px solid var(--border); border-radius:12px; background:#fff; }
        .cm-sales-group > summary { display:grid; grid-template-columns:auto auto minmax(0,1fr) auto auto auto; gap:12px; align-items:center; padding:13px 14px; list-style:none; cursor:pointer; }
        .cm-sales-group > summary::-webkit-details-marker { display:none; }
        .cm-sales-group-chevron { width:26px; height:26px; display:grid; place-items:center; border:1px solid var(--border); border-radius:50%; transition:transform .2s; }
        .cm-sales-group[open] .cm-sales-group-chevron { transform:rotate(90deg); }
        .cm-sales-avatar { width:36px; height:36px; display:grid; place-items:center; border-radius:9px; background:var(--green-soft); color:var(--green); font-size:11px; font-weight:800; }
        .cm-sales-group-person { display:flex; flex-direction:column; gap:2px; }
        .cm-sales-group-person small, .cm-sales-group-stat small { color:var(--muted); font-size:9px; }
        .cm-sales-group-stat { display:flex; flex-direction:column; text-align:right; }
        .cm-sales-group-list { border-top:1px solid var(--border); }
        .cm-sales-group-row { display:grid; grid-template-columns:minmax(230px,1fr) 90px 100px 90px 120px; gap:12px; align-items:center; padding:11px 14px; border-bottom:1px solid var(--border); font-size:12px; }
        .cm-sales-group-row:last-child { border-bottom:0; }
        .cm-sales-grid-view { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; align-items:stretch; }
        .cm-sales-grid-card { min-width:0; min-height:270px; display:flex; flex-direction:column; padding:16px; border:1px solid var(--border); border-radius:12px; background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .cm-sales-grid-top { display:flex; justify-content:space-between; gap:10px; align-items:flex-start; }
        .cm-sales-grid-top > div { min-width:0; }
        .cm-sales-grid-top strong { display:block; overflow:hidden; color:var(--text); font-size:17px; line-height:1.25; white-space:nowrap; text-overflow:ellipsis; }
        .cm-sales-grid-top small { display:block; margin-top:5px; color:var(--muted); font-size:11px; }
        .cm-sales-grid-top small b { color:var(--text); }
        .cm-sales-grid-card > .cm-sales-consignor-link { margin-top:12px; color:var(--green); font-size:14px; font-weight:800; }
        .cm-sales-grid-meta { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:16px 0 14px; padding:14px 0; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .cm-sales-grid-meta span, .cm-sales-grid-details > span:first-child { display:flex; flex-direction:column; gap:3px; }
        .cm-sales-grid-meta small, .cm-sales-grid-details small { color:var(--muted); font-size:11px; font-weight:700; text-transform:uppercase; }
        .cm-sales-grid-meta strong { color:var(--text); font-size:21px; line-height:1.1; }
        .cm-sales-grid-details { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
        .cm-sales-grid-details strong { color:var(--text); font-size:13px; }
        .cm-sales-grid-details .jatb-badge { min-width:78px; padding:6px 10px; font-size:10px; }
        .cm-sales-grid-order { margin-bottom:14px; color:var(--muted); font-size:11px; }
        .cm-sales-grid-actions { margin-top:auto; }
        .cm-sales-grid-actions .cm-sales-pay-btn { width:100%; min-height:42px; font-size:13px; }
        .cm-sales-grid-actions .cm-sales-paid-note { width:100%; min-height:42px; display:flex; align-items:center; justify-content:center; border:1px solid var(--border); border-radius:8px; background:#f7f8f9; }
        @media (max-width:1100px) { .cm-sales-grid-view { grid-template-columns:repeat(3,minmax(0,1fr)); } .cm-sales-filter-row { grid-template-columns:repeat(2,minmax(0,1fr)); } .cm-sales-view-toggle { grid-column:1/-1; width:max-content; } .cm-sales-multi-row { min-width:1000px; } .cm-sales-table-card { overflow-x:auto; } }
        @media (max-width:760px) {
          .cm-sales-header-tools { min-width:0; width:100%; flex-direction:column; align-items:stretch; }
          .cm-sales-summary-grid { grid-template-columns:1fr 1fr; }
          .cm-sales-toolbar { grid-template-columns:1fr; align-items:stretch; }
          .cm-sales-filter-dropdown { border:1px solid var(--border); border-radius:10px; background:#fff; overflow:hidden; }
          .cm-sales-filter-dropdown > summary { display:flex; align-items:center; justify-content:space-between; min-height:42px; padding:10px 12px; color:var(--green-dark); font-size:13px; font-weight:700; cursor:pointer; list-style:none; }
          .cm-sales-filter-dropdown > summary::-webkit-details-marker { display:none; }
          .cm-sales-filter-dropdown > summary svg { transition:transform .18s; }
          .cm-sales-filter-dropdown[open] > summary svg { transform:rotate(180deg); }
          .cm-sales-filter-fields { grid-template-columns:1fr; gap:9px; padding:12px; border-top:1px solid var(--border); }
          .cm-sales-view { grid-column:auto; }
          .cm-sales-view .cm-view-toggle { width:100%; }
          .cm-sales-view .cm-view-toggle button { flex:1; }
          .cm-sales-scroll-hint { display:flex; align-items:center; justify-content:flex-end; gap:5px; margin:-2px 2px 7px; color:var(--green-dark); font-size:11px; font-weight:700; }
          .cm-sales-scroll-hint span { font-size:16px; }
          .cm-sales-table-card { position:relative; box-shadow:inset -14px 0 14px -16px rgba(20,63,115,.75); }
          .cm-sales-group > summary { grid-template-columns:auto auto minmax(0,1fr); }
          .cm-sales-group-stat { display:none; }
          .cm-sales-group-row { grid-template-columns:1fr auto; }
          .cm-sales-group-row > *:not(.cm-item-primary):not(.cm-sales-pay-btn):not(.cm-sales-paid-note) { display:none; }
          .cm-sales-grid-view { grid-template-columns:repeat(2,minmax(0,1fr)); justify-content:stretch; }
          .cm-sales-grid-card { min-height:250px; padding:13px; }
          .cm-sales-grid-meta strong { font-size:18px; }
        }
      `}</style>
    </>
  );
}

function PayoutsScreen({ items, consignors, onOpenConsignor, onStartPayout }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('amount');
  const [viewMode, setViewMode] = useState('list');
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
  const allConsignorRows = consignors
    .map((consignor) => {
      const sales = items.filter((item) => item.consignorId === consignor.id);
      const due = sales
        .filter((item) => (item.status === 'Sold' || item.dateSold) && !item.paidOut)
        .reduce(
          (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
          0,
        );
      return { consignor, sales, due };
    })
    .filter(({ consignor }) => {
      const q = query.trim().toLowerCase();
      return !q || `${consignor.firstName} ${consignor.lastName} ${consignor.number}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'amount') return b.due - a.due;
      return `${a.consignor.lastName} ${a.consignor.firstName}`.localeCompare(`${b.consignor.lastName} ${b.consignor.firstName}`);
    });
  const displayedRows = viewMode === 'grouped' ? allConsignorRows : rows;
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
          <div className="cm-tool-view">
            <span>View</span>
            <div className="cm-view-toggle cm-finder-toggle" aria-label="Choose payout view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> All payouts</button>
              <button type="button" className={viewMode === 'grouped' ? 'active' : ''} onClick={() => setViewMode('grouped')} aria-pressed={viewMode === 'grouped'}><Users size={16} /> By consignor</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
            </div>
          </div>
        </div>
        <section className={`jatb-card cm-payout-list ${viewMode === 'grid' ? 'grid' : 'list'}`}>
          <div className="cm-section-title">
            <h2>{viewMode === 'grouped' ? 'All consignors' : 'Consignors with payouts due'}</h2>
            <CalendarDays size={18} color="var(--muted)" />
          </div>
          {displayedRows.length === 0 && <div className="cm-empty-small">{viewMode === 'grouped' ? 'No consignors match this search.' : 'There are no eligible unpaid sales.'}</div>}
          {displayedRows.map(({ consignor, sales, due }) => (
            <div key={consignor.id} className="cm-payout-row">
              <button
                type="button"
                className="cm-payout-person"
                onClick={() => onOpenConsignor(consignor.id)}
              >
                <div className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</div>
                <div className="jatb-row-main">
                  <div className="jatb-row-name">{consignor.firstName} {consignor.lastName}</div>
                  <div className="jatb-row-sub">#{consignor.number} · {sales.length} {viewMode === 'grouped' ? `item${sales.length === 1 ? '' : 's'}` : `eligible item${sales.length === 1 ? '' : 's'}`}</div>
                </div>
              </button>
              <div className="cm-payout-action">
                <strong className="cm-payout-amount">{money(due)}</strong>
                {due > 0 && <button type="button" className="jatb-btn" onClick={() => onStartPayout(consignor.id)}>Review & pay</button>}
              </div>
              {viewMode === 'grouped' && sales.length > 0 && (
                <div className="cm-payout-all-items" style={{ gridColumn: '1 / -1', width: '100%' }}>
                  {sales.map((item) => (
                    <div className="cm-history-item" key={item.id}>
                      <span className="jatb-batch-thumb">
                        {item.photo ? <img src={item.photo} alt="" /> : <Tag size={16} color="var(--green-dark)" />}
                      </span>
                      <span className="cm-history-item-copy">
                        <strong>{item.description || item.itemNumber}</strong>
                        <span>SKU {item.itemNumber} · {statusLabel(item.status)} · {money(item.salePrice ?? item.price)}</span>
                      </span>
                      <span className={`jatb-badge ${item.paidOut ? 'paid' : ''}`}>{item.paidOut ? 'Paid' : ((item.status === 'Sold' || item.dateSold) ? 'Unpaid' : 'Not sold')}</span>
                    </div>
                  ))}
                </div>
              )}
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
                      {consignor ? (
                        <span
                          className="cm-history-consignor-link"
                          role="link"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenConsignor(consignor.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              onOpenConsignor(consignor.id);
                            }
                          }}
                        >
                          {consignorName} · #{consignor.number}
                        </span>
                      ) : (
                        <strong>{consignorName}</strong>
                      )}
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

function HomeScreen({ consignors, items, query, setQuery, onOpenConsignor, onNewConsignor, onNewItem, onImport, onExport }) {
  const [sort, setSort] = useState('number');
  const [viewMode, setViewMode] = useState('list');
  const filtered = consignors.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      String(c.phone || '').includes(q) ||
      String(c.number).includes(q)
    );
  }).sort((a, b) => {
    if (sort === 'nameAsc') return `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`);
    if (sort === 'nameDesc') return `${b.lastName || ''} ${b.firstName || ''}`.localeCompare(`${a.lastName || ''} ${a.firstName || ''}`);
    if (sort === 'itemsHigh') {
      const aCount = items.filter((item) => item.consignorId === a.id).length;
      const bCount = items.filter((item) => item.consignorId === b.id).length;
      return bCount - aCount || Number(a.number || 0) - Number(b.number || 0);
    }
    return Number(a.number || 0) - Number(b.number || 0);
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
            <button className="jatb-btn secondary" type="button" onClick={onNewItem}><Plus size={16} /> New item</button>
            <button className="jatb-btn" type="button" onClick={onNewConsignor}><Plus size={17} /> New consignor</button>
          </div>
        )}
      />
      <div className="jatb-body">
        <div className="cm-toolbar cm-page-toolbar cm-consignors-toolbar">
          <div className="jatb-search">
            <Search size={17} />
            <input
              placeholder="Search name, phone, or #"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="cm-tool-field"><span>Sort</span><select className="jatb-select cm-filter-select" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort consignors">
            <option value="number">Consignor number</option>
            <option value="nameAsc">Name A–Z</option>
            <option value="nameDesc">Name Z–A</option>
            <option value="itemsHigh">Most items</option>
          </select></label>
          <div className="cm-tool-view"><span>View</span><div className="cm-view-toggle cm-finder-toggle" aria-label="Choose consignor view">
            <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={16} /> List</button>
            <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={16} /> Grid</button>
          </div></div>
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

        {viewMode === 'list' && (
          <section className="jatb-card cm-consignor-list">
            <div className="cm-consignor-list-row cm-list-head"><span>Consignor</span><span>Contact</span><span>Items</span><span>Commission</span><span></span></div>
            {filtered.map((c) => {
              const count = items.filter((item) => item.consignorId === c.id).length;
              return (
                <button type="button" className="cm-consignor-list-row" key={c.id} onClick={() => onOpenConsignor(c.id)}>
                  <span className="cm-consignor-identity"><span className="jatb-avatar">{c.firstName?.[0]}{c.lastName?.[0]}</span><span><strong>{c.firstName} {c.lastName}</strong><small>Consignor #{c.number}</small></span></span>
                  <span className="cm-consignor-contact"><strong>{c.phone || 'No phone'}</strong><small>{c.email || 'No email'}</small></span>
                  <strong>{count}</strong>
                  <span>{c.commissionPct}%</span>
                  <ChevronRight size={18} className="jatb-chev" />
                </button>
              );
            })}
          </section>
        )}

        {viewMode === 'grid' && (
          <div className="cm-consignor-grid">
            {filtered.map((c) => {
              const consignorItems = items.filter((item) => item.consignorId === c.id);
              const available = consignorItems.filter((item) => item.status === 'Available' || item.status === 'Active').length;
              return (
                <button type="button" className="cm-consignor-card" key={c.id} onClick={() => onOpenConsignor(c.id)}>
                  <span className="cm-consignor-card-top"><span className="jatb-avatar">{c.firstName?.[0]}{c.lastName?.[0]}</span><ChevronRight size={18} /></span>
                  <strong className="cm-consignor-card-name">{c.firstName} {c.lastName}</strong>
                  <small className="cm-consignor-card-number">Consignor #{c.number}</small>
                  <span className="cm-consignor-card-contact">{c.phone || c.email || 'No contact information'}</span>
                  <span className="cm-consignor-card-stats"><span><small>Items</small><strong>{consignorItems.length}</strong></span><span><small>Available</small><strong>{available}</strong></span><span><small>Commission</small><strong>{c.commissionPct}%</strong></span></span>
                </button>
              );
            })}
          </div>
        )}

        <div className="jatb-footnote">Live Shopify consignment data</div>
      </div>
    </>
  );
}

function ChooseConsignorScreen({ consignors, onBack, onChoose, onCreate }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
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

        <div className="cm-toolbar">
          <div className="jatb-search">
            <Search size={17} />
            <input
              placeholder="Search name or consignor number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="cm-view-toggle cm-finder-toggle" aria-label="Choose consignor view">
            <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>
              <List size={15} /> List
            </button>
            <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>
              <Grid3X3 size={15} /> Grid
            </button>
          </div>
        </div>

        {viewMode === 'list' && filtered.map((consignor) => (
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

        {viewMode === 'grid' && (
          <div className="cm-consignor-grid">
            {filtered.map((consignor) => (
              <button
                key={consignor.id}
                type="button"
                className="cm-consignor-card"
                style={{ minHeight: 160 }}
                onClick={() => onChoose(consignor.id)}
              >
                <span className="cm-consignor-card-top">
                  <span className="jatb-avatar">{consignor.firstName?.[0]}{consignor.lastName?.[0]}</span>
                  <ChevronRight size={18} />
                </span>
                <strong className="cm-consignor-card-name">{consignor.firstName} {consignor.lastName}</strong>
                <small className="cm-consignor-card-number">Consignor #{consignor.number}</small>
                <span className="cm-consignor-card-contact">{consignor.phone || consignor.email || 'Select consignor'}</span>
              </button>
            ))}
          </div>
        )}

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
  const required = isConsignors
    ? 'consignor_import_key, first_name, last_name; item_description and price when the row contains an item'
    : fixedConsignor ? 'item_description, price' : 'consignor_import_key (or email/phone), item_description, price';
  const templateConsignorNumber = fixedConsignor?.number || 1;
  const template = isConsignors
    ? 'consignor_import_key,first_name,last_name,phone,email,address,city,province,postal_code,date_joined,commission_pct,unsold_preference,consignor_notes,item_import_key,item_description,price,category,brand,size,condition,item_notes,status,sale_price,sale_date,payout_status\njane-smith-9055550100,Jane,Smith,905-555-0100,jane@example.com,123 Main Street,Hamilton,Ontario,L8E 1A1,2026-07-30,50,Please return,,jane-001,Blue winter coat,45.00,Clothing,Gap,Medium,Like new,,Available,,,'
    : fixedConsignor
      ? `item_import_key,item_description,price,category,brand,size,condition,item_notes,status,sale_price,sale_date,payout_status,consignor_number\nitem-001,Blue baby sweater,18.00,Clothing,Gap,12M,Good,,Available,,,,${templateConsignorNumber}`
      : 'consignor_import_key,email,phone,item_import_key,item_description,price,category,brand,size,condition,item_notes,status,sale_price,sale_date,payout_status\njane-smith-9055550100,jane@example.com,905-555-0100,jane-001,Blue winter coat,45.00,Clothing,Gap,Medium,Like new,,Available,,,';

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
      <div className="jatb-body">
        <div className="jatb-card">
          <strong style={{ fontSize: 14 }}>Start with the template</strong>
          <p className="cm-import-help">Required columns: {required}. The app assigns consignor and item numbers automatically. Keep the headings unchanged, fill in your rows, then save as CSV.{fixedConsignor && !isConsignors ? ` Every row will be assigned to consignor #${fixedConsignor.number}.` : ''}</p>
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
              <div><span>Importing</span><strong style={{ fontSize: 13 }}>{isConsignors ? 'Consignors + manual items' : 'Items'}</strong></div>
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

function ConsignorScreen({ consignor, items, onBack, onStartIntake, onOpenItem, onDeleteConsignor, onEditConsignor, onStartPayout }) {
  const [viewMode, setViewMode] = useState('grid');
  const consignorItems = items.filter((item) => item.consignorId === consignor.id);
  const draftCount = consignorItems.filter((item) => item.status === 'Draft').length;
  const soldItems = consignorItems.filter((item) => item.status === 'Sold' || item.dateSold);
  const unpaidItems = soldItems.filter((item) => !item.paidOut);
  const totalSales = soldItems.reduce((sum, item) => sum + Number(item.salePrice ?? item.price ?? 0), 0);
  const activeCount = consignorItems.filter((item) => ['Available', 'Active'].includes(item.status)).length;
  const [confirmingDeleteConsignor, setConfirmingDeleteConsignor] = useState(false);
  const amountDue = unpaidItems.reduce(
    (sum, item) => sum + (Number(item.salePrice ?? item.price ?? 0) * Number(item.commissionPct ?? consignor.commissionPct ?? 0)) / 100,
    0,
  );
  const fullAddress = [consignor.address, consignor.city, consignor.province, consignor.postalCode]
    .filter(Boolean)
    .join(', ');

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
        <section className="jatb-card cm-consignor-profile" aria-label="Consignor profile information">
          <div className="cm-profile-column">
            <div className="cm-profile-title">Contact</div>
            <div className="cm-profile-row">
              <span className="cm-profile-icon"><Phone size={17} /></span>
              <span className="cm-profile-copy">
                <span className="cm-profile-label">Phone</span>
                {consignor.phone ? <a className="cm-profile-value cm-profile-link" href={`tel:${String(consignor.phone).replace(/[^\d+]/g, '')}`}>{consignor.phone}</a> : <span className="cm-profile-value">—</span>}
              </span>
            </div>
            <div className="cm-profile-row">
              <span className="cm-profile-icon"><Mail size={17} /></span>
              <span className="cm-profile-copy">
                <span className="cm-profile-label">Email</span>
                {consignor.email ? <a className="cm-profile-value cm-profile-link" href={`mailto:${consignor.email}`}>{consignor.email}</a> : <span className="cm-profile-value">—</span>}
              </span>
            </div>
            <div className="cm-profile-row">
              <span className="cm-profile-icon"><MapPin size={17} /></span>
              <span className="cm-profile-copy">
                <span className="cm-profile-label">Address</span>
                {fullAddress ? <a className="cm-profile-value cm-profile-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">{fullAddress}</a> : <span className="cm-profile-value">—</span>}
              </span>
            </div>
          </div>
          <div className="cm-profile-column">
            <div className="cm-profile-title">Account details</div>
            <div className="cm-profile-row detail"><span className="cm-profile-copy"><span className="cm-profile-label">Commission split</span><span className="cm-profile-value">Consignor gets {consignor.commissionPct}%</span></span></div>
            <div className="cm-profile-row detail"><span className="cm-profile-copy"><span className="cm-profile-label">Joined</span><span className="cm-profile-value">{consignor.dateJoined || '—'}</span></span></div>
            <div className="cm-profile-row detail"><span className="cm-profile-copy"><span className="cm-profile-label">Unsold items</span><span className="cm-profile-value">{consignor.unsoldPreference || 'Please return'}</span></span></div>
          </div>
        </section>

        <div className="cm-consignor-stats">
          <div className="cm-consignor-stat"><span>Amount due</span><strong>{money(amountDue)}</strong></div>
          <div className="cm-consignor-stat"><span>Total sales</span><strong>{money(totalSales)}</strong></div>
          <div className="cm-consignor-stat"><span>Active items</span><strong>{activeCount}</strong></div>
          <div className="cm-consignor-stat"><span>Store credit</span><strong aria-label="Not available yet">&nbsp;</strong></div>
        </div>

        <div className="cm-consignor-items-head">
          <h3>Items on file</h3>
          <div className="cm-consignor-items-tools">
            <span className="cm-consignor-items-count">{consignorItems.length} total · {draftCount} pending</span>
            <div className="cm-consignor-view-toggle" aria-label="Choose item view">
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List size={14} /> List</button>
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid3X3 size={14} /> Grid</button>
            </div>
          </div>
        </div>

        {consignorItems.length === 0 && (
          <div className="jatb-empty">
            <h3>No items yet</h3>
            <p>Add what they brought in today.</p>
          </div>
        )}

        <div className={`cm-consignor-item-list ${viewMode === 'grid' ? 'grid' : ''}`}>
          {consignorItems.map((item) => {
            const product = productLabel(item);
            const soldUnpaid = (item.status === 'Sold' || item.dateSold) && !item.paidOut;
            return (
              <article key={item.id} className="jatb-card cm-consignor-item">
                <button type="button" className="cm-consignor-item-open" onClick={() => onOpenItem(item.id)}>
                  <span className="jatb-batch-thumb" style={{ width: 48, height: 48, borderRadius: 10 }}>
                    {item.photo ? <img src={item.photo} alt="" /> : <Tag size={18} color="var(--green-dark)" />}
                  </span>
                  <span className="cm-consignor-item-copy">
                    <span className="cm-consignor-item-title">{item.description || item.category}</span>
                    <span className="cm-consignor-item-meta">{item.itemNumber} · {item.size ? `Size ${item.size} · ` : ''}{money(item.price)}</span>
                    <span className="cm-consignor-item-meta">Product type: {item.type || item.category || 'Not set'}</span>
                    {item.paidOut && <span className="cm-paid-detail">Paid {item.payoutDate || ''} · {item.payoutMethod || 'Method not recorded'} · {money(item.payoutAmount)}</span>}
                  </span>
                </button>
                <div className="cm-consignor-item-actions">
                  <span className={`cm-product-badge ${product.className}`}>{product.text}</span>
                  <span className={`jatb-badge ${item.paidOut ? 'paid' : item.status === 'Sold' ? 'unpaid' : statusClass(item.status)}`}>
                    {item.paidOut ? 'Paid' : item.status === 'Sold' ? 'Sold · unpaid' : statusLabel(item.status)}
                  </span>
                  {soldUnpaid ? (
                    <button type="button" className="cm-consignor-pay-btn" onClick={() => onStartPayout(consignor.id)}>Review &amp; pay</button>
                  ) : <span aria-hidden="true" />}
                </div>
              </article>
            );
          })}
        </div>

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

  function setCategory(category) {
    setForm((current) => ({
      ...current,
      category,
      type: '',
    }));
  }

  return (
    <div className="jatb-card jatb-detail-card">
      <div className="jatb-section-heading">
        <label className="jatb-label">Consignment item information</label>
        <span className="jatb-row-sub">Manual metaobject record</span>
      </div>
      <div className="jatb-detail-grid">
        <div className="jatb-field">
          <label className="jatb-label">Category</label>
          <select className="jatb-select" value={form.category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Brand</label>
          <input className="jatb-input" value={form.brand} onChange={set('brand')} placeholder="e.g. Gap" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Size</label>
          <input className="jatb-input" value={form.size} onChange={set('size')} placeholder="Optional" />
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
        <div className="jatb-field wide">
          <label className="jatb-label">Shopify title *</label>
          <input className="jatb-input" value={form.shopifyTitle || ''} onChange={set('shopifyTitle')} placeholder="Required Shopify product title" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Shopify price</label>
          <input className="jatb-input" type="number" inputMode="decimal" min="0" step="0.01" value={form.shopifyPrice ?? ''} onChange={set('shopifyPrice')} placeholder="Defaults to the manual item price" />
        </div>
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
    <div className="jatb-card">
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

      <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />

      <div className="jatb-section-heading">
        <label className="jatb-label">Consignment item information</label>
        <span className="jatb-row-sub">Manual metaobject record</span>
      </div>
      <div className="jatb-detail-grid">
        <div className="jatb-field">
          <label className="jatb-label">Category</label>
          <select className="jatb-select" value={form.category} onChange={(event) => setCategory(event.target.value)}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Brand</label>
          <input className="jatb-input" value={form.brand} onChange={set('brand')} placeholder="e.g. Gap" />
        </div>
        <div className="jatb-field">
          <label className="jatb-label">Size</label>
          <input className="jatb-input" value={form.size} onChange={set('size')} placeholder="Optional" />
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

      <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ display: 'block', fontSize: 14 }}>Manual consignment record</strong>
          <span className="jatb-row-sub" style={{ display: 'block', marginTop: 3 }}>{helperText}</span>
        </div>
        <button className="jatb-btn" disabled={saveDisabled} onClick={onSave}>
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
  linkedProductId = '',
  linkedStatus = '',
  disabled = false,
  onSync = null,
  syncing = false,
}) {
  const canSync = Boolean(onSync);
  return (
    <details className="jatb-card jatb-shopify-section" open={Boolean(linkedProductId)}>
      <summary className="jatb-shopify-summary">
        <span>
          <ShoppingBag size={17} />
          <strong>Shopify product</strong>
        </span>
        <span className="jatb-row-sub">{linkedProductId ? 'Connected' : 'Separate optional workflow'}</span>
      </summary>
      <div className="jatb-shopify-content">
        <p className="jatb-shopify-help">
          This section only controls the linked Shopify product. Manual item saving never creates or updates a Shopify product.
        </p>
        <div className="jatb-shopify-photo-row">
          <PhotoPicker value={shopifyForm.photo} onChange={(value) => setShopifyForm((current) => ({ ...current, photo: value }))} />
          <ShopifyProductFields form={shopifyForm} setForm={setShopifyForm} />
        </div>
        <label className="jatb-product-choice">
          <input type="checkbox" checked={shopifyForm.publishToPos !== false} onChange={(event) => setShopifyForm((current) => ({ ...current, publishToPos: event.target.checked }))} />
          <span>
            <strong>Create Shopify product</strong>
            <span>Creates or updates an Active product with inventory of one and publishes it to Point of Sale.</span>
          </span>
        </label>
        <label className="jatb-product-choice online">
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
          <button className="jatb-btn" style={{ marginTop: 14 }} disabled={!canSync || disabled || syncing || shopifyForm.publishToPos === false || !String(shopifyForm.shopifyTitle || '').trim()} onClick={onSync}>
            {syncing ? <Loader2 className="jatb-spin" size={16} /> : <ShoppingBag size={16} />}
            Create Shopify product
          </button>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
            <button className="jatb-btn" disabled={!canSync || disabled || syncing || shopifyForm.publishToPos === false || !String(shopifyForm.shopifyTitle || '').trim()} onClick={onSync}>
              {syncing ? <Loader2 className="jatb-spin" size={16} /> : <Check size={16} />}
              Update Shopify product
            </button>
            <a className="jatb-btn secondary" href={productAdminUrl(linkedProductId)} target="_top">
              <span aria-hidden="true">↗</span> Edit in Shopify
            </a>
          </div>
        )}
        {linkedProductId && (
          <div className="jatb-row-sub" style={{ marginTop: 8 }}>
            Changes made in Shopify are loaded back into this section whenever the app refreshes. Changes made here are sent to Shopify with “Update Shopify product”.
          </div>
        )}
        {!canSync && <div className="jatb-row-sub" style={{ marginTop: 8 }}>Save the manual item first, then the Shopify product can be created and synced here.</div>}
      </div>
    </details>
  );
}

function IntakeScreen({ consignor, items, onBack, onSaveBatch }) {
  const emptyForm = {
    category: 'Clothing', type: '', description: '', size: '', condition: 'Good',
    price: '', brand: '', notes: '',
  };
  const emptyShopifyForm = {
    photo: null, shopifyTitle: '', shopifyPrice: '', tags: '', vendor: '', productDescription: '', shopifyCategoryId: '',
    shopifyCategoryName: '', seoTitle: '', seoDescription: '', publishToPos: true,
    publishOnline: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [shopifyForm, setShopifyForm] = useState(emptyShopifyForm);
  const [batch, setBatch] = useState([]);
  const canAdd = form.description.trim() && form.price !== '';
  const saveCount = batch.length + (canAdd ? 1 : 0);
  const savedSequence = items
    .filter((item) => item.consignorId === consignor.id && item.itemNumber.startsWith(`${consignor.number}-`))
    .reduce((max, item) => Math.max(max, Number(item.itemNumber.split('-').pop()) || 0), 0);
  const nextItemNumber = `${consignor.number}-${String(savedSequence + batch.length + 1).padStart(3, '0')}`;

  function addToBatch() {
    if (!canAdd) return;
    setBatch((current) => [...current, form]);
    setForm({ ...emptyForm, category: form.category, brand: form.brand });
  }

  return (
    <>
      <Header eyebrow={`For ${consignor.firstName} ${consignor.lastName} · #${consignor.number}`} title="Add items" onBack={onBack} />
      <div className="jatb-body">
        {batch.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label className="jatb-label">Manual items ready to save ({batch.length})</label>
            {batch.map((entry, index) => (
              <div key={`${entry.description}-${index}`} className="jatb-batch-item">
                <div className="jatb-batch-thumb"><Tag size={16} color="var(--green-dark)" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{entry.category} · {money(entry.price)}</div>
                </div>
                <button className="jatb-batch-remove" onClick={() => setBatch((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="jatb-section-heading">
          <label className="jatb-label">{batch.length > 0 ? 'Next manual item' : 'Manual consignment item'}</label>
          <span className="jatb-item-number">{nextItemNumber}</span>
        </div>
        <ManualItemCore
          form={form}
          setForm={setForm}
          onSave={() => onSaveBatch(canAdd ? [...batch, form] : batch)}
          saveDisabled={saveCount === 0}
          saveLabel={saveCount === 1 ? 'Save manual item' : `Save ${saveCount} manual items`}
        />
        <button className="jatb-btn secondary jatb-add-another" disabled={!canAdd} onClick={addToBatch}>
          <Plus size={16} /> Add another manual item
        </button>
        <ShopifyProductSection shopifyForm={shopifyForm} setShopifyForm={setShopifyForm} />
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
}) {
  const [form, setForm] = useState({
    category: item.category || 'Other', type: '', description: item.description || '',
    size: item.size || '', condition: item.condition || 'Good', price: item.price ?? '',
    brand: item.brand || '', notes: item.notes || '',
  });
  const [shopifyForm, setShopifyForm] = useState({
    photo: item.shopifyPhoto || item.photo || null,
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [salePrice, setSalePrice] = useState(item.salePrice ?? item.price ?? '');
  const [dateSold] = useState(item.dateSold || new Date().toISOString().slice(0, 10));
  const isSold = item.status === 'Sold' || Boolean(item.dateSold);
  const isPaid = item.paidOut === true;
  const canSave = form.description.trim() && form.price !== '';

  return (
    <>
      <Header eyebrow={`Item ${item.itemNumber}`} title="Edit item" onBack={onBack} />
      <div className="jatb-body">
        <div className="jatb-section-heading">
          <label className="jatb-label">Manual consignment item</label>
          <span className="jatb-item-number">{item.itemNumber}</span>
        </div>
        <ManualItemCore
          form={form}
          setForm={setForm}
          onSave={() => onSave(item.id, form)}
          saveDisabled={!canSave || isSold}
          saveLabel="Save manual changes"
          helperText="Updates only the consignment item metaobject. Shopify product data and media are handled separately below."
        />

        <div className="jatb-status-card">
          {!isSold && (
            <div className="jatb-manual-sale">
              <div className="jatb-manual-sale-copy"><strong>Manual sale</strong><span>Only use for a sale outside Shopify.</span></div>
              <div className="jatb-manual-sale-controls">
                <div className="jatb-field"><label className="jatb-label">Sale price</label><input className="jatb-input" type="number" inputMode="decimal" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></div>
                <button className="jatb-btn jatb-sold-btn" disabled={statusSaving || salePrice === ''} onClick={async () => { setStatusSaving(true); try { await onUpdateStatus(item.id, 'Sold', { salePrice, dateSold }); } finally { setStatusSaving(false); } }}>Sold</button>
              </div>
            </div>
          )}
          {isSold && !isPaid && <div className="jatb-sold-status"><span className="jatb-badge unpaid">Sold · unpaid</span><span className="jatb-row-sub">Waiting in Payouts for payment.</span></div>}
          {isPaid && <div className="jatb-status-actions"><span className="jatb-badge paid">Paid</span><span className="cm-paid-detail">{item.payoutDate || ''} · {item.payoutMethod || 'Payment recorded'} · {money(item.payoutAmount)}</span></div>}
        </div>

        <ShopifyProductSection
          shopifyForm={shopifyForm}
          setShopifyForm={setShopifyForm}
          linkedProductId={item.shopifyProductId}
          linkedStatus={item.shopifyProductStatus}
          disabled={isSold}
          syncing={syncing}
          onSync={async () => {
            setSyncing(true);
            try { await onSyncProduct(item.id, shopifyForm); } finally { setSyncing(false); }
          }}
        />

        {!confirmingDelete ? (
          <button className="jatb-btn secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-soft)' }} onClick={() => setConfirmingDelete(true)}><Trash2 size={16} /> Delete item</button>
        ) : (
          <div className="jatb-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13 }}>Delete {item.itemNumber} and its linked Shopify product?</span>
            <div style={{ display: 'flex', gap: 8 }}><button className="jatb-btn secondary" style={{ padding: '8px 14px' }} onClick={() => setConfirmingDelete(false)}>Cancel</button><button className="jatb-btn danger" style={{ padding: '8px 14px' }} onClick={() => onDelete(item.id)}>Delete</button></div>
          </div>
        )}
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
    document.querySelector('.jatb-body')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setShowBackToTop(false);
  }, [view]);

  useEffect(() => {
    if (!ready) return undefined;
    const body = document.querySelector('.jatb-body');
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
    document.querySelector('.jatb-body')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

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
      if (kind === 'consignors') {
        flash(`${result.consignorsCreated || 0} created, ${result.consignorsUpdated || 0} matched/updated, ${result.itemsImported || 0} items imported`);
      } else {
        flash(`${result.itemsImported ?? result.imported} item${(result.itemsImported ?? result.imported) === 1 ? '' : 's'} imported`);
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
      await syncShopifyProduct(itemId, shopifyForm);
      await refreshData();
      flash('Shopify product synced');
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
          onNewItem={startNewItem}
          onImport={() => startImport('consignors', 'home')}
          onExport={() => exportConsignors(consignors)}
        />
      )}

      {ready && view === 'items' && (
        <ItemsScreen
          items={items}
          consignors={consignors}
          onOpenItem={openItem}
          onOpenConsignor={openConsignor}
          onMarkSold={(itemId, details) => handleUpdateItemStatus(itemId, 'Sold', details)}
          onNewItem={startNewItem}
        />
      )}

      {ready && view === 'sales' && (
        <SalesScreen
          items={items}
          consignors={consignors}
          onOpenConsignor={openConsignor}
          onStartPayout={(consignorId) => {
            setActiveId(consignorId);
            setView('createPayout');
          }}
        />
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
        />
      )}

      {ready && showBackToTop && (
        <button className="jatb-back-to-top" type="button" onClick={scrollToTop} aria-label="Back to top" title="Back to top">
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}