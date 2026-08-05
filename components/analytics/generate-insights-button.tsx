"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useAnalyticsInsights } from "./analytics-insights-context";

/** Thin Analytics-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useAnalyticsInsights();
  return (
    <GenerateInsightsButtonView status={status} message={message} onGenerate={generate} label="Generate Analytics Insights" />
  );
}
