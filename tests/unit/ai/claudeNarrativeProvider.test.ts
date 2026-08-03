import { describe, expect, it } from "vitest";
import { ClaudeNarrativeProvider } from "@/lib/ai/claudeNarrativeProvider";

/**
 * Only the deterministic, network-free path is unit-tested here: no API
 * key configured must resolve to `null` without attempting a request.
 * Testing the real Claude round trip would require either a live API key
 * (costly, non-deterministic, not appropriate for an automated suite) or
 * mocking the Anthropic SDK (low-signal — proves nothing about real
 * behavior, and this codebase's established discipline is real
 * integration tests over mocks). The "unavailable" contract is exactly
 * what's safe and meaningful to assert without either.
 */
describe("ClaudeNarrativeProvider", () => {
  it("returns null without making a request when no API key is configured", async () => {
    const provider = new ClaudeNarrativeProvider(undefined);

    const result = await provider.generateNarrative({
      category: "INVENTORY",
      severity: "CRITICAL",
      triggerCondition: "stockStatus === CRITICAL",
      supportingMetrics: { onHandQty: 10 },
      justification: "Test justification.",
    });

    expect(result).toBeNull();
  });

  it("does not throw when constructed with an empty string API key", () => {
    expect(() => new ClaudeNarrativeProvider("")).not.toThrow();
  });
});
