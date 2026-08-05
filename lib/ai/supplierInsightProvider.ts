import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 700;

export interface SupplierInsightInput {
  totalSuppliers: number;
  averageReliability: number | null;
  belowThreshold: number;
  flaggedSuppliers: { name: string; score: number }[];
}

export interface SupplierInsightResult {
  riskSupplierRecommendation: string | null;
  procurementActionRecommendation: string | null;
}

const NULL_RESULT: SupplierInsightResult = {
  riskSupplierRecommendation: null,
  procurementActionRecommendation: null,
};

/**
 * Provider-agnostic contract for Suppliers' optional AI content — mirrors
 * lib/ai/procurementInsightProvider.ts and the Dashboard/Inventory
 * providers exactly (same never-throws, all-null-on-failure contract),
 * kept as its own interface for the same "one interface per distinct
 * input shape" reason those are separate from each other.
 */
export interface SupplierInsightProvider {
  generateInsights(input: SupplierInsightInput): Promise<SupplierInsightResult>;
}

export function buildSupplierInsightPrompt(input: SupplierInsightInput): string {
  const flaggedText =
    input.flaggedSuppliers.length === 0
      ? "None — no suppliers are currently below the reliability threshold."
      : input.flaggedSuppliers.map((s) => `- ${s.name}: ${s.score}/100`).join("\n");

  return `You are an operations analyst writing short, plain-English suggestions for a supplier management page. The page is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Total suppliers tracked: ${input.totalSuppliers}
Average reliability score: ${input.averageReliability === null ? "not available" : `${Math.round(input.averageReliability)}/100`}
Suppliers below the reliability threshold: ${input.belowThreshold}

Flagged (below-threshold) suppliers and their scores:
${flaggedText}

Write two short, distinct suggestions (1-2 sentences each), using ONLY the facts given above — never invent numbers, causes, or context not stated here. Important: reliability scores here are a single point-in-time calculation, not a tracked history — never claim a supplier's reliability is "declining," "improving," or otherwise changing over time, since that data does not exist.
1. "riskSupplierRecommendation": which supplier(s) carry the most procurement risk right now, and why, based only on the flagged list above.
2. "procurementActionRecommendation": the single most useful procurement action to take right now.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this page is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly these two keys and string values, no markdown, no preamble: {"riskSupplierRecommendation": "...", "procurementActionRecommendation": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for supplier insights. Runs at effort "low", same
 * rationale as the Dashboard/Inventory/Procurement providers: a short,
 * low-complexity summarization task over facts already known.
 */
export class ClaudeSupplierInsightProvider implements SupplierInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: SupplierInsightInput): Promise<SupplierInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildSupplierInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<SupplierInsightResult>;
      return {
        riskSupplierRecommendation:
          typeof parsed.riskSupplierRecommendation === "string" ? parsed.riskSupplierRecommendation : null,
        procurementActionRecommendation:
          typeof parsed.procurementActionRecommendation === "string" ? parsed.procurementActionRecommendation : null,
      };
    } catch (error) {
      console.error("ClaudeSupplierInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
