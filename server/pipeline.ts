import { randomUUID } from "node:crypto";
import type { ArtifactStage, PipelineArtifacts, PipelineProgress, PipelineResult, PipelineStageResult } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";

export async function runPipeline(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
  const stageResult = await runStageRange(input, provider, "bible", "audit", {}, onProgress);
  const { storyBible, adaptation, panels, audit } = stageResult.artifacts;
  if (!storyBible || !adaptation || !panels || !audit) throw new Error("完整流水线没有生成全部产物");

  return {
    projectId: randomUUID(),
    createdAt: new Date().toISOString(),
    request: input,
    storyBible,
    adaptation,
    panels,
    audit,
    provider: provider.name
  };
}

const stageOrder: ArtifactStage[] = ["bible", "adaptation", "storyboard", "audit"];
const stageProgress: Record<ArtifactStage, PipelineProgress> = {
  bible: { stage: "bible", percent: 5, message: "正在识别人物、地点、事件与锁定事实" },
  adaptation: { stage: "adaptation", percent: 27, message: "Story Bible 已确认，正在设计叙事改编" },
  storyboard: { stage: "storyboard", percent: 51, message: "改编方案已确认，正在设计镜头与逐格 Prompt" },
  audit: { stage: "audit", percent: 78, message: "分镜已确认，正在检查忠实度与连续性" }
};

export async function runStageRange(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  startStage: ArtifactStage,
  endStage: ArtifactStage,
  initialArtifacts: PipelineArtifacts = {},
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineStageResult> {
  const startIndex = stageOrder.indexOf(startStage);
  const endIndex = stageOrder.indexOf(endStage);
  if (startIndex < 0 || endIndex < startIndex) throw new Error("阶段范围无效");

  const artifacts: PipelineArtifacts = { ...initialArtifacts };
  const completedStages = stageOrder.slice(0, startIndex).filter((stage) => {
    if (stage === "bible") return Boolean(artifacts.storyBible);
    if (stage === "adaptation") return Boolean(artifacts.adaptation);
    if (stage === "storyboard") return Boolean(artifacts.panels);
    return Boolean(artifacts.audit);
  });

  for (const stage of stageOrder.slice(startIndex, endIndex + 1)) {
    onProgress?.(stageProgress[stage]);
    if (stage === "bible") {
      artifacts.storyBible = await provider.buildStoryBible(input);
    } else if (stage === "adaptation") {
      if (!artifacts.storyBible) throw new Error("生成改编方案前需要 Story Bible");
      artifacts.adaptation = await provider.buildAdaptation(input, artifacts.storyBible);
    } else if (stage === "storyboard") {
      if (!artifacts.storyBible || !artifacts.adaptation) throw new Error("生成分镜前需要 Story Bible 和改编方案");
      artifacts.panels = await provider.buildStoryboard(input, artifacts.storyBible, artifacts.adaptation);
    } else {
      if (!artifacts.storyBible || !artifacts.panels) throw new Error("审核前需要 Story Bible 和分镜");
      artifacts.audit = await provider.audit(input, artifacts.storyBible, artifacts.panels);
    }
    if (!completedStages.includes(stage)) completedStages.push(stage);
  }

  onProgress?.({ stage: "complete", percent: 98, message: endStage === "audit" ? "审核完成，正在整理 Prompt Pack" : "当前阶段已完成，正在整理结果" });
  return { request: input, artifacts, completedStages, provider: provider.name };
}
