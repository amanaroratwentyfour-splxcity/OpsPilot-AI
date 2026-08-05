"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useProcurementInsights } from "./procurement-insights-context";

/** Thin Procurement-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useProcurementInsights();
  return (
    <GenerateInsightsButtonView
      status={status}
      message={message}
      onGenerate={generate}
      label="Generate Procurement Insights"
    />
  );
}
