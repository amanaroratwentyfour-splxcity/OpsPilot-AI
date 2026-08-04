/** Mirrors the schema's fixed enums — used to populate filter dropdowns. */
export const PRODUCT_CATEGORIES = [
  "DAIRY",
  "BEVERAGES",
  "SNACKS",
  "BAKERY",
  "PERSONAL_CARE",
  "HOUSEHOLD",
  "FROZEN_FOODS",
] as const;

export const STOCK_STATUSES = ["CRITICAL", "LOW", "HEALTHY", "OVERSTOCKED"] as const;

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_TRANSIT",
  "RECEIVED",
  "CANCELLED",
] as const;

export const RECOMMENDATION_SEVERITIES = ["CRITICAL", "WARNING", "INFO"] as const;
export const RECOMMENDATION_CATEGORIES = ["INVENTORY", "PROCUREMENT", "SUPPLIER", "DEMAND"] as const;
export const RECOMMENDATION_STATUSES = ["ACTIVE", "SNOOZED", "DISMISSED", "ACCEPTED"] as const;
