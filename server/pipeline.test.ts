import { describe, expect, it } from "vitest";
import { DemoProvider } from "./demo-provider.js";
import { runPipeline, runStageRange } from "./pipeline.js";

const input = {
  title: "回乡",
  sourceText: "林夏在一个雨天回到故乡。她推开老屋的门，看见墙上的挂钟已经停了。桌上放着父亲留下的一封信。林夏读完后把挂钟重新上紧。",
  mode: "adapted" as const,
  panelCount: 6,
  style: "低饱和水彩连环画",
  lockedFacts: ["父亲没有出现在现实场景中"]
};

describe("narrative pipeline", () => {
  it("creates a complete prompt pack in demo mode", async () => {
    const progress: number[] = [];
    const result = await runPipeline(input, new DemoProvider(), (update) => progress.push(update.percent));

    expect(result.storyBible.timeline.length).toBeGreaterThan(0);
    expect(result.panels).toHaveLength(6);
    expect(result.panels[0].prompt).toContain("无文字");
    expect(result.storyBible.lockedFacts).toContain("父亲没有出现在现实场景中");
    expect(result.panels.every((panel) => !panel.characters.includes("父亲"))).toBe(true);
    expect(result.panels.at(-1)?.sourceExcerpt).toContain("挂钟重新上紧");
    expect(result.audit.score).toBeGreaterThan(0);
    expect(progress).toEqual([5, 27, 51, 78, 98]);
  });

  it("can pause after Story Bible and resume only the requested next stage", async () => {
    const provider = new DemoProvider();
    const bibleResult = await runStageRange(input, provider, "bible", "bible");
    expect(bibleResult.completedStages).toEqual(["bible"]);
    expect(bibleResult.artifacts.storyBible).toBeDefined();
    expect(bibleResult.artifacts.adaptation).toBeUndefined();

    const adaptationResult = await runStageRange(input, provider, "adaptation", "adaptation", bibleResult.artifacts);
    expect(adaptationResult.completedStages).toEqual(["bible", "adaptation"]);
    expect(adaptationResult.artifacts.adaptation?.decisions.length).toBeGreaterThan(0);
    expect(adaptationResult.artifacts.panels).toBeUndefined();
  });

  it("returns an inspectable AI edit proposal without mutating the original", async () => {
    const provider = new DemoProvider();
    const bible = await provider.buildStoryBible(input);
    const ambiguityCount = bible.ambiguities.length;
    const proposal = await provider.proposeEdit(input, "bible", "不要设定主角年龄", bible, {});

    expect(proposal.changes).toHaveLength(1);
    expect((proposal.revisedArtifact as typeof bible).ambiguities).toHaveLength(ambiguityCount + 1);
    expect(bible.ambiguities).toHaveLength(ambiguityCount);
  });

  it("keeps demo artifacts in English when the source is English", async () => {
    const englishInput = {
      title: "Homecoming",
      sourceText: "Lin Xia returned to the old family house after ten years away. Lin Xia found a letter beside the silent clock and finally wound it again.",
      mode: "adapted" as const,
      panelCount: 4,
      style: "restrained watercolor comic",
      lockedFacts: ["The clock initially reads six fifteen"]
    };

    const result = await runPipeline(englishInput, new DemoProvider());

    expect(result.storyBible.characters[0].name).toBe("Lin Xia");
    expect(result.storyBible.narrativeVoice).toBe("Third person");
    expect(result.storyBible.timeline.length).toBeGreaterThan(1);
    expect(result.adaptation.approach).toContain("core events");
    expect(result.panels[0].prompt).toContain("no text");
    expect(result.audit.summary).toContain("storyboard");
  });
});
