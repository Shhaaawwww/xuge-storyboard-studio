import { describe, expect, it } from "vitest";
import { normalizePanels, normalizeStoryBible } from "./normalize.js";

describe("LLM output normalization", () => {
  it("wraps model strings where the UI expects arrays", () => {
    const bible = normalizeStoryBible({
      logline: "回乡",
      themes: "归属",
      characters: [{ name: "林夏", appearance: "黑色风衣", visualMotifs: "旧信" }]
    });
    const panels = normalizePanels({ panels: [{ order: 1, characters: "林夏", continuity: "挂钟停在六点十五分", prompt: "雨中的老屋" }] });

    expect(bible.themes).toEqual(["归属"]);
    expect(bible.characters[0].appearance).toEqual(["黑色风衣"]);
    expect(bible.characters[0].visualMotifs).toEqual(["旧信"]);
    expect(panels[0].characters).toEqual(["林夏"]);
    expect(panels[0].continuity).toEqual(["挂钟停在六点十五分"]);
  });
});
