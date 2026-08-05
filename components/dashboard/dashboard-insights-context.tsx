"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { DashboardInsightInput, DashboardInsightResult } from "@/lib/ai/dashboardInsightProvider";

export type DashboardInsightsStatus = "idle" | "running" | "done" | "unavailable";

interface DashboardInsightsContextValue {
  status: DashboardInsightsStatus;
  insights: DashboardInsightResult | null;
  message: string | null;
  generate: () => Promise<void>;
}

const DEFAULT_VALUE: DashboardInsightsContextValue = {
  status: "idle",
  insights: null,
  message: null,
  generate: async () => {},
};

const DashboardInsightsContext = createContext<DashboardInsightsContextValue>(DEFAULT_VALUE);

/**
 * Shares one "Generate AI Insights" action and its result across the
 * dashboard's several, physically distant AI content slots (two chart
 * footers + the Health Score panel) without prop-drilling through the
 * Server Component page tree. A component outside this provider (e.g.
 * StockStatusChart rendered on the Inventory page, which never wraps
 * itself in this provider) safely gets DEFAULT_VALUE — status stays
 * "idle" and no AI content ever renders there, exactly matching that
 * page's current, unchanged behavior.
 */
export function DashboardInsightsProvider({
  requestPayload,
  children,
}: {
  requestPayload: DashboardInsightInput;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<DashboardInsightsStatus>("idle");
  const [insights, setInsights] = useState<DashboardInsightResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generate() {
    setStatus("running");
    setMessage(null);
    try {
      const response = await fetch("/api/dashboard/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      const result = (await response.json()) as DashboardInsightResult;

      if (result.warehouseChartRecommendation || result.stockChartRecommendation || result.healthScoreSuggestion) {
        setInsights(result);
        setStatus("done");
      } else {
        setStatus("unavailable");
        setMessage(
          "AI insights are unavailable right now — this usually means Claude isn't configured. The dashboard's static analysis above still reflects the full picture.",
        );
      }
    } catch {
      setStatus("unavailable");
      setMessage("AI insights are unavailable right now — the dashboard's static analysis above still reflects the full picture.");
    }
  }

  return (
    <DashboardInsightsContext.Provider value={{ status, insights, message, generate }}>
      {children}
    </DashboardInsightsContext.Provider>
  );
}

export function useDashboardInsights() {
  return useContext(DashboardInsightsContext);
}
