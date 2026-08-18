// Shared formatting/display helpers for the consignment app.
// Starting scoped to what DashboardScreen needs; more helpers move here
// as each additional page gets broken out of consignment_intake.jsx.

export const money = (n) => `$${Number(n || 0).toFixed(2)}`;
