"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type InsightsStatus = "idle" | "running" | "done" | "unavailable";

export interface InsightsContextValue<TResult> {
  status: InsightsStatus;
  insights: TResult | null;
  message: string | null;
  generate: () => Promise<void>;
}

const UNAVAILABLE_MESSAGE =
  "AI insights are unavailable right now — this usually means Claude isn't configured. The static analysis above still reflects the full picture.";
const ERROR_MESSAGE = "AI insights are unavailable right now — the static analysis above still reflects the full picture.";

/**
 * Shared factory behind every page's "Generate AI Insights" trigger
 * (Executive Dashboard, Inventory Intelligence, and any future page that
 * adds one) — POSTs a page-specific payload to a page-specific endpoint
 * and tracks idle/running/done/unavailable status, with the exact same
 * graceful-degradation contract used throughout lib/ai/: AI unavailability
 * is never an error state for the rest of the page.
 *
 * Deliberately generic over TInput/TResult rather than a single shared
 * shape — each page's insight payload and result fields are genuinely
 * different (see lib/ai/dashboardInsightProvider.ts vs
 * lib/ai/inventoryInsightProvider.ts), matching this codebase's existing
 * "separate provider per distinct shape" pattern (narrativeProvider.ts's
 * own doc comments). Only the state-machine plumbing — which is 100%
 * identical across pages — is deduplicated here.
 */
export function createInsightsContext<TInput, TResult>(
  endpoint: string,
  hasContent: (result: TResult) => boolean,
) {
  const DEFAULT_VALUE: InsightsContextValue<TResult> = {
    status: "idle",
    insights: null,
    message: null,
    generate: async () => {},
  };

  const Context = createContext<InsightsContextValue<TResult>>(DEFAULT_VALUE);

  function Provider({ requestPayload, children }: { requestPayload: TInput; children: ReactNode }) {
    const [status, setStatus] = useState<InsightsStatus>("idle");
    const [insights, setInsights] = useState<TResult | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    async function generate() {
      setStatus("running");
      setMessage(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });
        const result = (await response.json()) as TResult;

        if (hasContent(result)) {
          setInsights(result);
          setStatus("done");
        } else {
          setStatus("unavailable");
          setMessage(UNAVAILABLE_MESSAGE);
        }
      } catch {
        setStatus("unavailable");
        setMessage(ERROR_MESSAGE);
      }
    }

    return <Context.Provider value={{ status, insights, message, generate }}>{children}</Context.Provider>;
  }

  function useInsights() {
    return useContext(Context);
  }

  return { Provider, useInsights };
}
