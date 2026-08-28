import { describe, expect, it } from "vitest";
import type { PromptCard } from "../src/types.js";
import { coldReadPrompt, storyboardPrompt } from "./prompts.js";

const request = {
  title: "Blind review",
  sourceText: "A traveler returns home and finds a letter. The letter changes what the traveler decides to do next.",
  mode: "adapted" as const,
  panelCount: 4,
  style: "watercolor comic",
  lockedFacts: []
};

const panel: PromptCard = {
  id: "panel-1",
  order: 1,
  sequenceId: "hidden-sequence-id",
  sequenceTitle: "HIDDEN_SEQUENCE_TITLE",
  sourceExcerpt: "HIDDEN_SOURCE_EXCERPT",
  storyPurpose: "HIDDEN_STORY_PURPOSE",
  causeFromPrevious: "HIDDEN_CAUSE",
  readerLearns: "HIDDEN_READER_LEARNS",
  timeCard: "Ten years later",
  locationCard: "Old house",
  transitionCaption: "",
  characters: ["HIDDEN_CHARACTER_NAME"],
  location: "HIDDEN_PRODUCTION_LOCATION",
  action: "HIDDEN_CHARACTER_NAME opens a letter",
  emotion: "hesitant",
  shotSize: "medium",
  cameraAngle: "eye level",
  composition: "one visible person beside a table",
  lighting: "soft rain light",
  continuity: ["HIDDEN_CONTINUITY"],
  prompt: "HIDDEN_T2I_PROMPT",
  negativePrompt: "",
  narration: "A traveler returns to the old house.",
  dialogue: "",
  provenance: ["SOURCE"]
};

describe("narrative prompts", () => {
  it("keeps the cold reader blind to production metadata", () => {
    const prompt = coldReadPrompt(request, [panel]);

    expect(prompt).toContain("A traveler returns to the old house.");
    expect(prompt).toContain("[visible character] opens a letter");
    expect(prompt).not.toContain("HIDDEN_SOURCE_EXCERPT");
    expect(prompt).not.toContain("HIDDEN_STORY_PURPOSE");
    expect(prompt).not.toContain("HIDDEN_CAUSE");
    expect(prompt).not.toContain("HIDDEN_READER_LEARNS");
    expect(prompt).not.toContain("HIDDEN_CONTINUITY");
    expect(prompt).not.toContain("HIDDEN_CHARACTER_NAME");
    expect(prompt).not.toContain("HIDDEN_PRODUCTION_LOCATION");
    expect(prompt).not.toContain("HIDDEN_T2I_PROMPT");
  });

  it("makes comprehension outrank artistic treatment in storyboard generation", () => {
    const prompt = storyboardPrompt(request, {}, {});
    expect(prompt).toContain("当艺术表达与可理解性冲突时");
    expect(prompt).toContain("零背景读者");
    expect(prompt).toContain("timeCard");
    expect(prompt).toContain("causeFromPrevious");
    expect(prompt).toContain("readerLearns");
    expect(prompt).toContain("对白人称");
    expect(prompt).toContain("道具位置");
    expect(prompt).toContain("positive/negative prompt 无冲突");
    expect(prompt).toContain("留给后期排字");
  });
});
