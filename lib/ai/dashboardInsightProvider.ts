import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 700;

export interface DashboardInsightInput {
  operationsHealthScore: number | null;
  healthComponents: { label: string; value: number | null }[];
  warehouseUtilizations: { name: string; utilizationPercent: number | null }[];
  stockStatusCounts: { CRITICAL: number; LOW: number; HEALTHY: number; OVERSTOCKED: number };
}

export interface DashboardInsightResult {
  warehouseChartRecommendation: string | null;
  stockChartRecommendation: string | null;
  healthScoreSuggestion: string | null;
}

const NULL_RESULT: DashboardInsightResult = {
  warehouseChartRecommendation: null,
  stockChartRecommendation: null,
  healthScoreSuggestion: null,
};

/**
 * Provider-agnostic contract for the Executive Dashboard's optional AI
 * content (DESIGN_SPECIFICATION.md §7.2/§7.5's "AI Recommendation" slots
 * and §4's Health Score "AI suggestions to improve it"). Mirrors the
 * shape of lib/ai/narrativeProvider.ts — a separate interface rather than
 * an extension of NarrativeProvider, since the input here (chart/company-
 * wide aggregates) is a genuinely different shape from a single
 * recommendation's trigger data, matching this codebase's existing
 * pattern of "swapping providers means writing a new class against a
 * plain interface" rather than overloading one interface for two purposes.
 *
 * Contract: implementations must never throw — any failure resolves to
 * the all-null result, so "AI unavailable" is a normal, silent outcome
 * for every caller, exactly like NarrativeProvider's contract.
 */
export interface DashboardInsightProvider {
  generateInsights(input: DashboardInsightInput): Promise<DashboardInsightResult>;
}

export function buildDashboardInsightPrompt(input: DashboardInsightInput): string {
  const healthComponentsText = input.healthComponents
    .map((c) => `- ${c.label}: ${c.value === null ? "not available" : Math.round(c.value)}`)
    .join("\n");
  const warehouseText = input.warehouseUtilizations
    .map((w) => `- ${w.name}: ${w.utilizationPercent === null ? "not available" : `${Math.round(w.utilizationPercent)}%`}`)
    .join("\n");

  return `You are an operations analyst writing short, plain-English suggestions for an executive operations dashboard. The dashboard is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Operations Health Score: ${input.operationsHealthScore === null ? "not available" : Math.round(input.operationsHealthScore)}/100
Health score components:
${healthComponentsText}

Warehouse utilization:
${warehouseText}

Inventory status counts: ${input.stockStatusCounts.CRITICAL} critical, ${input.stockStatusCounts.LOW} low, ${input.stockStatusCounts.HEALTHY} healthy, ${input.stockStatusCounts.OVERSTOCKED} overstocked.

Write three short, distinct suggestions (1-2 sentences each), using ONLY the facts given above — never invent numbers, causes, or context not stated here:
1. "warehouseChartRecommendation": an action management should consider about warehouse capacity/balance.
2. "stockChartRecommendation": an action management should consider about the inventory status mix.
3. "healthScoreSuggestion": the single most useful lever to raise the Operations Health Score, based on which component above is weakest.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this dashboard is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly these three keys and string values, no markdown, no preamble: {"warehouseChartRecommendation": "...", "stockChartRecommendation": "...", "healthScoreSuggestion": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for dashboard insights — every caller talks to
 * DashboardInsightProvider's plain interface instead.
 *
 * Runs at effort "low", same rationale as ClaudeNarrativeProvider: this is
 * a short, low-complexity summarization task over facts already known,
 * not open-ended reasoning.
 */
export class ClaudeDashboardInsightProvider implements DashboardInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: DashboardInsightInput): Promise<DashboardInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildDashboardInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<DashboardInsightResult>;
      return {
        warehouseChartRecommendation:
          typeof parsed.warehouseChartRecommendation === "string" ? parsed.warehouseChartRecommendation : null,
        stockChartRecommendation:
          typeof parsed.stockChartRecommendation === "string" ? parsed.stockChartRecommendation : null,
        healthScoreSuggestion:
          typeof parsed.healthScoreSuggestion === "string" ? parsed.healthScoreSuggestion : null,
      };
    } catch (error) {
      console.error("ClaudeDashboardInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
