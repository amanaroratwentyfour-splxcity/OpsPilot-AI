"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useDashboardInsights } from "./dashboard-insights-context";

/** Thin dashboard-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useDashboardInsights();
  return <GenerateInsightsButtonView status={status} message={message} onGenerate={generate} />;
}
