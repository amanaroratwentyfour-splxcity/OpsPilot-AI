"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useInventoryInsights } from "./inventory-insights-context";

/** Thin Inventory-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useInventoryInsights();
  return <GenerateInsightsButtonView status={status} message={message} onGenerate={generate} />;
}
