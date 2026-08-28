import { describe, expect, it } from "vitest";
import { DemoProvider } from "./demo-provider.js";
import { runPipeline, runStageRange } from "./pipeline.js";
import { sampleLockedFacts, sampleStory } from "../src/sample.js";

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
    expect(result.adaptation.narrativeSpine.causalChain.length).toBeGreaterThan(0);
    expect(result.adaptation.sequences.reduce((total, sequence) => total + sequence.panelBudget, 0)).toBe(6);
    expect(result.panels.every((panel, index) => index === 0 || Boolean(panel.causeFromPrevious))).toBe(true);
    expect(result.panels.every((panel) => Boolean(panel.readerLearns))).toBe(true);
    expect(result.panels[0].timeCard).toBeTruthy();
    expect(result.panels[0].locationCard).toBeTruthy();
    expect(result.panels[0].prompt).toContain("无文字");
    expect(result.storyBible.lockedFacts).toContain("父亲没有出现在现实场景中");
    expect(result.panels.every((panel) => !panel.characters.includes("父亲"))).toBe(true);
    expect(result.panels.at(-1)?.sourceExcerpt).toContain("挂钟重新上紧");
    expect(result.audit.score).toBeGreaterThan(0);
    expect(result.audit.coldRead.passed).toBe(true);
    expect(result.audit.checks.narrativeComprehension).toBeGreaterThan(80);
    expect(progress).toEqual([5, 27, 51, 78, 84, 96, 98]);
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

  it("emits a durable checkpoint after every completed stage", async () => {
    const checkpoints: Array<{ completedStages: string[]; hasBible: boolean; hasAdaptation: boolean }> = [];
    await runStageRange(input, new DemoProvider(), "bible", "adaptation", {}, undefined, (checkpoint) => {
      checkpoints.push({
        completedStages: checkpoint.completedStages,
        hasBible: Boolean(checkpoint.artifacts.storyBible),
        hasAdaptation: Boolean(checkpoint.artifacts.adaptation)
      });
    });

    expect(checkpoints).toEqual([
      { completedStages: ["bible"], hasBible: true, hasAdaptation: false },
      { completedStages: ["bible", "adaptation"], hasBible: true, hasAdaptation: true }
    ]);
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

  it("automatically revises once when final audit finds a blocking story gap", async () => {
    class RecoveringProvider extends DemoProvider {
      auditCalls = 0;
      revisionCalls = 0;

      override async audit(...args: Parameters<DemoProvider["audit"]>) {
        const report = await super.audit(...args);
        this.auditCalls += 1;
        return this.auditCalls === 1 ? {
          ...report,
          score: 45,
          issues: [{
            id: "forced-p0",
            severity: "P0" as const,
            target: "读者可见故事",
            message: "缺少关键结果",
            suggestion: "补回结局"
          }]
        } : report;
      }

      override async reviseStoryboardForClarity(...args: Parameters<DemoProvider["reviseStoryboardForClarity"]>) {
        this.revisionCalls += 1;
        return super.reviseStoryboardForClarity(...args);
      }
    }

    const provider = new RecoveringProvider();
    const result = await runPipeline(input, provider);
    expect(provider.revisionCalls).toBe(1);
    expect(provider.auditCalls).toBe(2);
    expect(result.audit.autoRevisionApplied).toBe(true);
    expect(result.audit.issues.some((issue) => issue.severity === "P0")).toBe(false);
  });

  it("automatically revises once when final audit finds a P1 delivery issue", async () => {
    class P1RecoveringProvider extends DemoProvider {
      auditCalls = 0;
      revisionCalls = 0;

      override async audit(...args: Parameters<DemoProvider["audit"]>) {
        const report = await super.audit(...args);
        this.auditCalls += 1;
        return this.auditCalls === 1 ? {
          ...report,
          score: 74,
          issues: [{
            id: "forced-p1",
            severity: "P1" as const,
            target: "道具连续性",
            message: "信件在相邻画格无过渡地更换位置",
            suggestion: "补充拿起并放入背包的动作"
          }]
        } : report;
      }

      override async reviseStoryboardForClarity(...args: Parameters<DemoProvider["reviseStoryboardForClarity"]>) {
        this.revisionCalls += 1;
        return super.reviseStoryboardForClarity(...args);
      }
    }

    const provider = new P1RecoveringProvider();
    const result = await runPipeline(input, provider);
    expect(provider.revisionCalls).toBe(1);
    expect(provider.auditCalls).toBe(2);
    expect(result.audit.autoRevisionApplied).toBe(true);
    expect(result.audit.issues.some((issue) => issue.id === "forced-p1")).toBe(false);
  });

  it("keeps indispensable dialogue and the actual resolution when panels are compressed", async () => {
    const result = await runPipeline({
      title: "回乡",
      sourceText: sampleStory,
      mode: "adapted" as const,
      panelCount: 8,
      style: "低饱和水彩连环画",
      lockedFacts: sampleLockedFacts
    }, new DemoProvider());
    const readerVisibleText = result.panels.map((panel) => [panel.narration, panel.dialogue, panel.transitionCaption].join(" ")).join(" ");

    expect(readerVisibleText).toContain("别因为走得太远");
    expect(result.adaptation.narrativeSpine.resolution).toContain("挂钟重新上紧");
    expect(result.audit.issues.some((issue) => issue.severity === "P0")).toBe(false);
  });
});
