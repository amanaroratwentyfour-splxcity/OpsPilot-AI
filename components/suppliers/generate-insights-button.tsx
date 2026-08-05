"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useSuppliersInsights } from "./suppliers-insights-context";

/** Thin Suppliers-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useSuppliersInsights();
  return (
    <GenerateInsightsButtonView status={status} message={message} onGenerate={generate} label="Generate Supplier Insights" />
  );
}
