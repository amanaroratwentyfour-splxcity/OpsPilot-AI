import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 500;

export interface AnalyticsInsightInput {
  totalInventoryValue: number;
  highestValueWarehouseName: string | null;
  classCounts: { A: number; B: number; C: number };
  inventoryTurnover: number | null;
  warehouseUtilizations: { warehouseName: string; utilizationPercent: number | null }[];
}

export interface AnalyticsInsightResult {
  suggestedActionsRecommendation: string | null;
}

const NULL_RESULT: AnalyticsInsightResult = { suggestedActionsRecommendation: null };

/**
 * Provider-agnostic contract for Analytics' optional AI content — mirrors
 * lib/ai/forecastInsightProvider.ts exactly (same never-throws,
 * all-null-on-failure contract, single result field). "Overall analytics /
 * Pareto observations / ABC distribution / warehouse utilization" are all
 * already fully derivable deterministically (see
 * lib/presentation/analyticsInsights.ts), so the AI call is scoped to the
 * one genuinely judgment-based ask — suggested operational actions.
 */
export interface AnalyticsInsightProvider {
  generateInsights(input: AnalyticsInsightInput): Promise<AnalyticsInsightResult>;
}

export function buildAnalyticsInsightPrompt(input: AnalyticsInsightInput): string {
  const utilizationText = input.warehouseUtilizations
    .map((w) => `- ${w.warehouseName}: ${w.utilizationPercent === null ? "not available" : `${Math.round(w.utilizationPercent)}%`}`)
    .join("\n");

  return `You are an operations analyst writing a short, plain-English suggestion for an inventory analytics page. The page is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Total inventory value: ${input.totalInventoryValue.toFixed(0)}
Highest-value warehouse: ${input.highestValueWarehouseName ?? "not available"}
ABC classification counts: Class A ${input.classCounts.A}, Class B ${input.classCounts.B}, Class C ${input.classCounts.C}
Inventory turnover: ${input.inventoryTurnover === null ? "not available" : `${input.inventoryTurnover.toFixed(1)}x/year`}

Warehouse utilization:
${utilizationText}

Write one short suggestion (1-2 sentences) for "suggestedActionsRecommendation": the single most useful operational action to take right now, using ONLY the facts given above — never invent numbers, causes, or context not stated here.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this page is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly this one key and a string value, no markdown, no preamble: {"suggestedActionsRecommendation": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for analytics insights. Runs at effort "low", same
 * rationale as every other page's provider: a short, low-complexity
 * summarization task over facts already known.
 */
export class ClaudeAnalyticsInsightProvider implements AnalyticsInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: AnalyticsInsightInput): Promise<AnalyticsInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildAnalyticsInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<AnalyticsInsightResult>;
      return {
        suggestedActionsRecommendation:
          typeof parsed.suggestedActionsRecommendation === "string" ? parsed.suggestedActionsRecommendation : null,
      };
    } catch (error) {
      console.error("ClaudeAnalyticsInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
