import { describe, expect, it } from "vitest";
import type { AuditReport, ColdReadReport, PromptCard } from "../src/types.js";
import { enforceNarrativeGate } from "./quality-gate.js";

const input = {
  title: "断裂的故事",
  sourceText: "林夏回到故乡，因为发现父亲留下的信，所以决定修好停摆的挂钟。",
  mode: "adapted" as const,
  panelCount: 2,
  style: "水彩连环画",
  lockedFacts: []
};

function panel(order: number): PromptCard {
  return {
    id: "panel-" + order,
    order,
    sequenceId: "sequence-1",
    sequenceTitle: "主线",
    sourceExcerpt: "",
    storyPurpose: "推进故事",
    causeFromPrevious: order === 1 ? "" : "发现信后采取行动",
    readerLearns: "主角采取了下一步行动",
    timeCard: order === 1 ? "十年后" : "",
    locationCard: order === 1 ? "故乡老屋" : "",
    transitionCaption: "",
    characters: ["林夏"],
    location: "老屋",
    action: "林夏看着信和挂钟",
    emotion: "犹豫",
    shotSize: "中景",
    cameraAngle: "平视",
    composition: "人物与信件形成前后景",
    lighting: "傍晚柔光",
    continuity: ["服装连续"],
    prompt: "水彩连环画，林夏看着信和挂钟，无文字",
    negativePrompt: "文字，水印",
    narration: "林夏发现父亲留下的信。",
    dialogue: "",
    provenance: ["SOURCE"]
  };
}

const audit: AuditReport = {
  score: 95,
  summary: "制作字段完整",
  coldRead: {
    passed: true,
    score: 95,
    retelling: "",
    understoodCharacters: [],
    understoodTimeline: [],
    unclearPoints: [],
    missingLinks: []
  },
  autoRevisionApplied: false,
  issues: [],
  checks: {
    narrativeComprehension: 95,
    causalCompleteness: 95,
    chronologyLegibility: 95,
    characterClarity: 95,
    faithfulness: 95,
    continuity: 95,
    visualClarity: 95,
    promptQuality: 95
  }
};

describe("narrative quality gate", () => {
  it("prevents a high score when a zero-context reader cannot retell the story", () => {
    const coldRead: ColdReadReport = {
      passed: false,
      score: 35,
      retelling: "一个人在看信，但不知道前因后果。",
      understoodCharacters: ["林夏"],
      understoodTimeline: [],
      unclearPoints: ["不知道父亲与信的关系"],
      missingLinks: ["不知道为什么要修挂钟"]
    };

    const result = enforceNarrativeGate(input, audit, coldRead, [panel(1), panel(2)], false);

    expect(result.score).toBeLessThanOrEqual(59);
    expect(result.issues.some((issue) => issue.severity === "P0")).toBe(true);
    expect(result.checks.narrativeComprehension).toBe(35);
    expect(result.summary).toContain("未通过叙事质量门槛");
  });

  it("blocks a T2I pack whose negative prompt bans a required object", () => {
    const contradictory = panel(1);
    contradictory.prompt = "当代车站内，主角站在一辆汽车旁查看手机";
    contradictory.negativePrompt = "避免现代汽车、畸形手指、水印";

    const result = enforceNarrativeGate(
      { ...input, panelCount: 1 },
      audit,
      audit.coldRead,
      [contradictory],
      false
    );

    expect(result.score).toBeLessThanOrEqual(79);
    expect(result.issues).toContainEqual(expect.objectContaining({
      id: "gate-prompt-contradiction",
      severity: "P1"
    }));
  });
});
