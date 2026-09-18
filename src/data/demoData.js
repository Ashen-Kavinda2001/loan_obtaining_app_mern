// ============================================================
//  FGI Loan Management — Shared Utilities & Formatters
// ============================================================

// Helper: format currency in Rs.
export const formatCurrency = (val) =>
  `Rs. ${Number(val || 0).toLocaleString('en-LK')}`;

// Helper: status badge class
export const statusClass = (status) => `badge badge-${status}`;
