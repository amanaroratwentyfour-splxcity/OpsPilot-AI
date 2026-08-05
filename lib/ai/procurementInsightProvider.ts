import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 700;

export interface ProcurementInsightInput {
  openPurchaseOrders: number;
  overduePurchaseOrders: number;
  flaggedProducts: number;
  risks: { severity: string; supplierName: string | null; warehouseName: string | null; justification: string }[];
}

export interface ProcurementInsightResult {
  purchasingPriorityRecommendation: string | null;
  immediateActionRecommendation: string | null;
}

const NULL_RESULT: ProcurementInsightResult = {
  purchasingPriorityRecommendation: null,
  immediateActionRecommendation: null,
};

/**
 * Provider-agnostic contract for Procurement's optional AI content —
 * mirrors lib/ai/dashboardInsightProvider.ts and
 * lib/ai/inventoryInsightProvider.ts exactly (same never-throws,
 * all-null-on-failure contract), kept as its own interface for the same
 * "one interface per distinct input shape" reason those two are separate
 * from each other.
 */
export interface ProcurementInsightProvider {
  generateInsights(input: ProcurementInsightInput): Promise<ProcurementInsightResult>;
}

export function buildProcurementInsightPrompt(input: ProcurementInsightInput): string {
  const risksText =
    input.risks.length === 0
      ? "None — no purchase orders are currently overdue."
      : input.risks
          .map((r) => `- [${r.severity}] ${r.supplierName ?? "Unknown supplier"} → ${r.warehouseName ?? "Unknown warehouse"}: ${r.justification}`)
          .join("\n");

  return `You are an operations analyst writing short, plain-English suggestions for a procurement management page. The page is company-agnostic — you don't know and must not guess which company or industry this data belongs to.

Open purchase orders: ${input.openPurchaseOrders}
Overdue purchase orders: ${input.overduePurchaseOrders}
Products currently flagged for reorder: ${input.flaggedProducts}

Active procurement risk flags (overdue deliveries by supplier/warehouse):
${risksText}

Write two short, distinct suggestions (1-2 sentences each), using ONLY the facts given above — never invent numbers, causes, or context not stated here:
1. "purchasingPriorityRecommendation": which purchase order(s) or supplier/warehouse pair(s) should be prioritized first, and why.
2. "immediateActionRecommendation": the single most useful immediate action procurement should take right now.

Rules: never mention FMCG, dairy, groceries, or any specific industry, and never mention or invent any company name — this page is used by companies across many industries and must read as fully generic. Respond with ONLY a valid JSON object with exactly these two keys and string values, no markdown, no preamble: {"purchasingPriorityRecommendation": "...", "immediateActionRecommendation": "..."}`;
}

/**
 * The only file (besides this one's prompt builder) that imports the
 * Anthropic SDK for procurement insights. Runs at effort "low", same
 * rationale as the Dashboard/Inventory providers: a short, low-complexity
 * summarization task over facts already known.
 */
export class ClaudeProcurementInsightProvider implements ProcurementInsightProvider {
  private readonly client: Anthropic | null;

  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateInsights(input: ProcurementInsightInput): Promise<ProcurementInsightResult> {
    if (!this.client) {
      return NULL_RESULT;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildProcurementInsightPrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return NULL_RESULT;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      if (text.length === 0) return NULL_RESULT;

      const parsed = JSON.parse(text) as Partial<ProcurementInsightResult>;
      return {
        purchasingPriorityRecommendation:
          typeof parsed.purchasingPriorityRecommendation === "string" ? parsed.purchasingPriorityRecommendation : null,
        immediateActionRecommendation:
          typeof parsed.immediateActionRecommendation === "string" ? parsed.immediateActionRecommendation : null,
      };
    } catch (error) {
      console.error("ClaudeProcurementInsightProvider: insight generation failed", error);
      return NULL_RESULT;
    }
  }
}
