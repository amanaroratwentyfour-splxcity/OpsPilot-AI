import Anthropic from "@anthropic-ai/sdk";
import type { NarrativeProvider, RecommendationNarrativeInput } from "./narrativeProvider";
import { buildNarrativePrompt } from "./prompt";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 500;

/**
 * The only file in this codebase (besides prompt.ts) that imports the
 * Anthropic SDK or knows Claude-specific request/response shapes — every
 * other file in lib/ai/ and all of lib/domain/ talk to NarrativeProvider's
 * plain interface instead. Swapping providers later means writing a new
 * class here, not touching narrateRecommendations.ts or anything upstream.
 *
 * Narrative generation is a short, low-complexity formatting task (turn
 * already-known facts into 2-3 sentences), so this runs at effort "low" —
 * cheaper and faster than the default "high", with quality that's more
 * than sufficient for the task. Thinking is left unset, which runs Claude
 * Opus 5's default adaptive mode.
 */
export class ClaudeNarrativeProvider implements NarrativeProvider {
  private readonly client: Anthropic | null;

  /**
   * @param apiKey - defaults to `process.env.ANTHROPIC_API_KEY`. If unset,
   *   `generateNarrative` returns `null` immediately, without attempting
   *   any other credential resolution (OAuth profile, etc.) — this keeps
   *   "Claude unavailable" predictable and explicit for a demo project
   *   rather than depending on ambient machine state.
   */
  constructor(apiKey: string | undefined = process.env.ANTHROPIC_API_KEY) {
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async generateNarrative(input: RecommendationNarrativeInput): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildNarrativePrompt(input) }],
      });

      if (response.stop_reason === "refusal") {
        return null;
      }

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
      return text.length > 0 ? text : null;
    } catch (error) {
      console.error("ClaudeNarrativeProvider: narrative generation failed", error);
      return null;
    }
  }
}
