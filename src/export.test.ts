import { describe, expect, it } from "vitest";
import { DemoProvider } from "../server/demo-provider.js";
import { runPipeline } from "../server/pipeline.js";
import { toMarkdown } from "./export";
import { sampleLockedFacts, sampleStory } from "./sample";

describe("Prompt Pack export", () => {
  it("includes narrative logic, reader-visible text, and the cold-read report", async () => {
    const result = await runPipeline({
      title: "回乡",
      sourceText: sampleStory,
      mode: "adapted",
      panelCount: 8,
      style: "低饱和水彩连环画",
      lockedFacts: sampleLockedFacts
    }, new DemoProvider());

    const markdown = toMarkdown(result, "zh-CN");
    expect(markdown).toContain("叙事主干 Narrative Spine");
    expect(markdown).toContain("承接上一格");
    expect(markdown).toContain("读者可见层");
    expect(markdown).toContain("别因为走得太远");
    expect(markdown).toContain("零背景读者");
  });
});
