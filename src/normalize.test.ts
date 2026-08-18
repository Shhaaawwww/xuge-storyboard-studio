import { describe, expect, it } from "vitest";
import { normalizePipelineResult } from "./normalize";
import type { PipelineResult } from "./types";

describe("browser result normalization", () => {
  it("accepts scalar list fields from a compatible model", () => {
    const result = {
      storyBible: {
        themes: "归属",
        characters: [{ appearance: "黑色风衣", personality: [], visualMotifs: "旧信", lockedFacts: [] }],
        locations: [],
        timeline: [],
        lockedFacts: [],
        ambiguities: []
      },
      adaptation: { decisions: [] },
      panels: [{ characters: "林夏", continuity: "挂钟停在六点十五分", provenance: "SOURCE" }],
      audit: { issues: [] }
    } as unknown as PipelineResult;

    const normalized = normalizePipelineResult(result);
    expect(normalized.storyBible.characters[0].appearance).toEqual(["黑色风衣"]);
    expect(normalized.panels[0].continuity).toEqual(["挂钟停在六点十五分"]);
  });
});
