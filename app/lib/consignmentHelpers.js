// Shared formatting/display helpers for the consignment app.
// Starting scoped to what DashboardScreen needs; more helpers move here
// as each additional page gets broken out of consignment_intake.jsx.

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Extracted verbatim from consignment_intake.jsx (still also present there
// for now — nothing in the monolith has been rewired yet). AllConsignorView
// imports these copies. Removing the monolith's local versions happens in
// the later "wire it in" step, not here.

export function productLabel(item) {
  if (!item?.shopifyProductId) return { text: 'Manual', className: 'manual' };

  const productStatus = String(item.shopifyProductStatus || '').toUpperCase();
  if (productStatus && productStatus !== 'ACTIVE') {
    return { text: 'Shopify Draft', className: 'draft' };
  }

  return item.publishOnline
    ? { text: 'POS + Online', className: 'online' }
    : { text: 'POS', className: 'pos' };
}

export function statusClass(status) {
  return String(status || 'Draft').toLowerCase();
}

// Display-only relabel: the stored status value stays "Draft" (so existing
// data and filters keep working) but manual items show "Available" instead.
export function statusLabel(status) {
  const value = status || 'Draft';
  return value === 'Draft' ? 'Available' : value;
}

export function productAdminUrl(productId) {
  const numericId = String(productId || '').split('/').pop();
  return `shopify://admin/products/${numericId}`;
}

export function csvValue(value) {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(fileName, headers, rows) {
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

// Shared payout math/grouping — originally lived only inside reports.jsx.
// Extracted so the Payouts page's history view and the Reports payout
// ledger CSV are guaranteed to agree on what a "payout" is, instead of
// each page maintaining its own copy that could silently drift apart.

export function saleAmount(item) {
  return Number(item.salePrice ?? item.price ?? 0);
}

export function commissionRate(item, consignor) {
  return Number(item.commissionPct ?? consignor?.commissionPct ?? 0);
}

export function consignorEarning(item, consignor) {
  return (saleAmount(item) * commissionRate(item, consignor)) / 100;
}

export function isSold(item) {
  return item.status === 'Sold' || Boolean(item.dateSold) || Boolean(item.orderId);
}

// Groups paid-out items back into the individual payout events that
// created them (one payoutId = one "Record payout" action for one
// consignor). This is the single source of truth for payout history.
export function recordedPayoutGroups(items) {
  const groups = new Map();

  items
    .filter((item) => item.paidOut && item.payoutId)
    .forEach((item) => {
      if (!groups.has(item.payoutId)) {
        groups.set(item.payoutId, {
          payoutId: item.payoutId,
          consignorId: item.consignorId || null,
          payoutDate: item.payoutDate || '',
          payoutMethod: item.payoutMethod || '',
          payoutReference: item.payoutReference || '',
          payoutTotal: Number(item.payoutTotal || 0),
          payoutAdjustment: Number(item.payoutAdjustment || 0),
          items: [],
        });
      }
      groups.get(item.payoutId).items.push(item);
    });

  return [...groups.values()];
}
