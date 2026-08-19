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
