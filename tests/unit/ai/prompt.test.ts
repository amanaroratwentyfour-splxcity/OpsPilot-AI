import { describe, expect, it } from "vitest";
import { buildNarrativePrompt } from "@/lib/ai/prompt";
import type { RecommendationNarrativeInput } from "@/lib/ai/narrativeProvider";

function input(overrides: Partial<RecommendationNarrativeInput> = {}): RecommendationNarrativeInput {
  return {
    category: "INVENTORY",
    severity: "CRITICAL",
    triggerCondition: "stockStatus === CRITICAL (onHandQty <= reorderPoint)",
    supportingMetrics: { onHandQty: 95, reorderPoint: 182 },
    justification: "NovaFresh Processed Cheese Block 400g at Mumbai is critically low.",
    ...overrides,
  };
}

describe("buildNarrativePrompt", () => {
  it("includes every field from the input", () => {
    const prompt = buildNarrativePrompt(input());

    expect(prompt).toContain("INVENTORY");
    expect(prompt).toContain("CRITICAL");
    expect(prompt).toContain("stockStatus === CRITICAL (onHandQty <= reorderPoint)");
    expect(prompt).toContain("onHandQty: 95");
    expect(prompt).toContain("reorderPoint: 182");
    expect(prompt).toContain("NovaFresh Processed Cheese Block 400g at Mumbai is critically low.");
  });

  it("instructs the model not to invent facts and to respond with only the narrative", () => {
    const prompt = buildNarrativePrompt(input());

    expect(prompt.toLowerCase()).toContain("do not invent");
    expect(prompt.toLowerCase()).toContain("only the narrative text");
  });

  it("renders every supporting metric on its own line", () => {
    const prompt = buildNarrativePrompt(
      input({ supportingMetrics: { a: 1, b: "x", c: 3.5 } }),
    );

    expect(prompt).toContain("- a: 1");
    expect(prompt).toContain("- b: x");
    expect(prompt).toContain("- c: 3.5");
  });

  it("handles an empty supportingMetrics object without crashing", () => {
    const prompt = buildNarrativePrompt(input({ supportingMetrics: {} }));
    expect(prompt).toContain("Supporting metrics:");
  });
});
