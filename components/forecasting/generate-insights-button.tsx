"use client";

import { GenerateInsightsButtonView } from "@/components/intelligence/generate-insights-button";
import { useForecastingInsights } from "./forecasting-insights-context";

/** Thin Forecasting-context wrapper around the shared button view — see components/intelligence/generate-insights-button.tsx. */
export function GenerateInsightsButton() {
  const { status, message, generate } = useForecastingInsights();
  return (
    <GenerateInsightsButtonView status={status} message={message} onGenerate={generate} label="Generate Forecast Insights" />
  );
}
