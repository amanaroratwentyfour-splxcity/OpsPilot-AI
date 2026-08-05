"use client";

import { createInsightsContext } from "@/components/intelligence/insights-context";
import type { SupplierInsightInput, SupplierInsightResult } from "@/lib/ai/supplierInsightProvider";

/**
 * Shares one "Generate Supplier Insights" action and its result across the
 * Suppliers page's chart footer — same role as
 * components/procurement/procurement-insights-context.tsx, built on the
 * same shared factory (components/intelligence/insights-context.tsx).
 */
const { Provider, useInsights } = createInsightsContext<SupplierInsightInput, SupplierInsightResult>(
  "/api/suppliers/insights",
  (result) => !!(result.riskSupplierRecommendation || result.procurementActionRecommendation),
);

export const SuppliersInsightsProvider = Provider;
export const useSuppliersInsights = useInsights;
