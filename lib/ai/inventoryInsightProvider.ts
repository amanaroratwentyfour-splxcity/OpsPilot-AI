import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 700;

export interface InventoryInsightInput {
  totalPositions: number;
  critical: number;
  overstocked: number;
  avgHealthScore: number | null;
  categoryBreakdown: { category: string; count: number }[];
  warehouseBreakdown: { warehouseName: string; critical: number; overstocked: number }[];
}

export interface InventoryInsightResult {
  stockChartRecommendation: string | null;
  categoryChartRecommendation: string | null;
  healthSuggestion: string | null;
}

const NULL_RESULT: InventoryInsightResult = {
  stockChartRecommendation: null,
  categoryChartRecommendation: null,
  healthSuggestion: null,
};

/**
 * Provider-agnostic contract for the Inventory Intelligence page's
 * optional AI content (DESIGN_SPECIFICATION.md §7.2/§7.5's "AI
 * Recommendation" slots) — mirrors lib/ai/dashboardInsightProvider.ts's
 * exact shape and contract (never throws; unavailable → all-null) rather
 * than sharing a type with it, since chart/company-wide aggregates differ
 * genuinely per page, matching this codebase's established "one interface
 * per distinct input shape" pattern. Only the state-machine plumbing
 * behind this is shared (components/intelligence/insights-context.tsx).
 */
export interface InventoryInsightProvider {
  generateInsights(input: InventoryInsightInput): Promise<InventoryInsightResult>;
}

export function buildInventoryInsightPrompt(input: InventoryInsightInput): string {
  const categoryText = input.categoryBreakdown
    .map((c) => `- ${c.category.replace(/_/g, " ")}: ${c.count}`)
    .join("\n");
  const warehouseText = input.warehouseBreakdown
    .map((w) => `- ${w.warehouseName}: ${w.critical} critical, ${w.overstocked} overstocked`)
    .join("\n");

  return `You are an operations analyst writing short, plain-English suggestions for an inventory management dashboard. The dashboard is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Total inventory positions in view: ${input.totalPositions}
Critical (at risk of stockout): ${input.critical}
Overstocked: ${input.overstocked}
Average inventory health score: ${input.avgHealthScore === null ? "not available" : `${Math.round(input.avgHealthScore)}/100`}

Positions by category:
${categoryText}

Critical/overstocked positions by warehouse:
${warehouseText}

Write three short, distinct suggestions (1-2 sentences each), using ONLY the facts given above — never invent numbers, causes, or context not stated here:
1. "stockChartRecommendation": an action management should consider about the mix of critical/overstocked/healthy positions.
2. "categoryChartRecommendation": an action management should consider about which product category needs the most attention.
3. "healthSuggestion": the single most useful lever to raise the average inventory health score.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this dashboard is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly these three keys and string values, no markdown, no preamble: {"stockChartRecommendation": "...", "categoryChartRecommendation": "...", "healthSuggestion": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for inventory insights — every caller talks to
 * InventoryInsightProvider's plain interface instead. Runs at effort
 * "low", same rationale as ClaudeDashboardInsightProvider: a short,
 * low-complexity summarization task over facts already known.
 */
export class ClaudeInventoryInsightProvider implements InventoryInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: InventoryInsightInput): Promise<InventoryInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildInventoryInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<InventoryInsightResult>;
      return {
        stockChartRecommendation: typeof parsed.stockChartRecommendation === "string" ? parsed.stockChartRecommendation : null,
        categoryChartRecommendation:
          typeof parsed.categoryChartRecommendation === "string" ? parsed.categoryChartRecommendation : null,
        healthSuggestion: typeof parsed.healthSuggestion === "string" ? parsed.healthSuggestion : null,
      };
    } catch (error) {
      console.error("ClaudeInventoryInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
