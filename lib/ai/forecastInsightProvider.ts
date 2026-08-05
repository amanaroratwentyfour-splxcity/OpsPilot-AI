import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 500;

export interface ForecastInsightInput {
  movingAverageAccuracy: number | null;
  exponentialSmoothingAccuracy: number | null;
  productsRequiringAttention: { productName: string | null; justification: string }[];
}

export interface ForecastInsightResult {
  suggestedActionsRecommendation: string | null;
}

const NULL_RESULT: ForecastInsightResult = { suggestedActionsRecommendation: null };

/**
 * Provider-agnostic contract for Forecasting's optional AI content —
 * mirrors lib/ai/supplierInsightProvider.ts and the other page providers
 * exactly (same never-throws, all-null-on-failure contract). Only one
 * result field: "overall performance" and "which method performs better"
 * are already fully derivable from the two accuracy numbers (see
 * lib/presentation/forecastingInsights.ts), so the AI call is scoped to
 * the one genuinely judgment-based ask — suggested actions.
 */
export interface ForecastInsightProvider {
  generateInsights(input: ForecastInsightInput): Promise<ForecastInsightResult>;
}

export function buildForecastInsightPrompt(input: ForecastInsightInput): string {
  const attentionText =
    input.productsRequiringAttention.length === 0
      ? "None — no products currently show a trusted, rising demand pattern."
      : input.productsRequiringAttention.map((p) => `- ${p.productName ?? "Unknown product"}: ${p.justification}`).join("\n");

  return `You are an operations analyst writing a short, plain-English suggestion for a demand forecasting page. The page is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Moving Average accuracy company-wide: ${input.movingAverageAccuracy === null ? "not available" : `${input.movingAverageAccuracy.toFixed(1)}%`}
Exponential Smoothing accuracy company-wide: ${input.exponentialSmoothingAccuracy === null ? "not available" : `${input.exponentialSmoothingAccuracy.toFixed(1)}%`}

Products with a trusted, rising demand pattern requiring attention:
${attentionText}

Write one short suggestion (1-2 sentences) for "suggestedActionsRecommendation": the single most useful action to take right now, using ONLY the facts given above — never invent numbers, causes, or context not stated here.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this page is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly this one key and a string value, no markdown, no preamble: {"suggestedActionsRecommendation": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for forecast insights. Runs at effort "low", same
 * rationale as every other page's provider: a short, low-complexity
 * summarization task over facts already known.
 */
export class ClaudeForecastInsightProvider implements ForecastInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: ForecastInsightInput): Promise<ForecastInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildForecastInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<ForecastInsightResult>;
      return {
        suggestedActionsRecommendation:
          typeof parsed.suggestedActionsRecommendation === "string" ? parsed.suggestedActionsRecommendation : null,
      };
    } catch (error) {
      console.error("ClaudeForecastInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
