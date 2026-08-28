import { randomUUID } from "node:crypto";
import type { ArtifactStage, PipelineArtifacts, PipelineProgress, PipelineResult, PipelineStageResult } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";
import { enforceNarrativeGate } from "./quality-gate.js";

export type PipelineCheckpointHandler = (checkpoint: PipelineStageResult) => void | Promise<void>;

export async function runPipeline(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  onProgress?: (progress: PipelineProgress) => void,
  onCheckpoint?: PipelineCheckpointHandler
): Promise<PipelineResult> {
  const stageResult = await runStageRange(input, provider, "bible", "audit", {}, onProgress, onCheckpoint);
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
const repairableP1Target = /(?:\bp\d+\b|\bpanel\b|\bseq(?:uence)?[_\s-]*\d*\b|prompt|storyboard|reader|scene|分镜|画面|读者|场景|对白|旁白|道具|连续|因果|转场)/i;

function canRepairInStoryboard(issue: { severity: "P0" | "P1" | "P2"; id: string; target: string }) {
  if (issue.severity === "P0") return true;
  if (issue.severity !== "P1") return false;
  return issue.id.startsWith("gate-") || repairableP1Target.test(issue.target);
}

const stageProgress: Record<ArtifactStage, PipelineProgress> = {
  bible: { stage: "bible", percent: 5, message: "正在识别人物、地点、事件与锁定事实" },
  adaptation: { stage: "adaptation", percent: 27, message: "Story Bible 已确认，正在设计叙事改编" },
  storyboard: { stage: "storyboard", percent: 51, message: "改编方案已确认，正在设计镜头与逐格 Prompt" },
  audit: { stage: "audit", percent: 78, message: "分镜已确认，正在进行零背景读者理解测试" }
};

export async function runStageRange(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  startStage: ArtifactStage,
  endStage: ArtifactStage,
  initialArtifacts: PipelineArtifacts = {},
  onProgress?: (progress: PipelineProgress) => void,
  onCheckpoint?: PipelineCheckpointHandler
): Promise<PipelineStageResult> {
  const startIndex = stageOrder.indexOf(startStage);
  const endIndex = stageOrder.indexOf(endStage);
  if (startIndex < 0 || endIndex < startIndex) throw new Error("阶段范围无效");

  const artifacts: PipelineArtifacts = { ...initialArtifacts };
  let generatedStoryboardThisRun = false;
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
      generatedStoryboardThisRun = true;
    } else {
      if (!artifacts.storyBible || !artifacts.adaptation || !artifacts.panels) throw new Error("审核前需要 Story Bible、改编方案和分镜");
      onProgress?.({ stage: "audit", percent: 84, message: "零背景读者正在只看最终可见内容复述故事" });
      let coldRead = await provider.coldRead(input, artifacts.panels);
      let autoRevisionApplied = false;
      if (!coldRead.passed && generatedStoryboardThisRun) {
        onProgress?.({ stage: "audit", percent: 89, message: "发现叙事断点，正在自动重写分镜并保留核心事实" });
        artifacts.panels = await provider.reviseStoryboardForClarity(
          input,
          artifacts.storyBible,
          artifacts.adaptation,
          artifacts.panels,
          coldRead
        );
        autoRevisionApplied = true;
        onProgress?.({ stage: "audit", percent: 93, message: "正在对修订后的读者可见版本再次进行冷读" });
        coldRead = await provider.coldRead(input, artifacts.panels);
      }
      onProgress?.({ stage: "audit", percent: 96, message: "正在综合审核叙事、忠实度、连续性与 Prompt 可执行性" });
      let audit = await provider.audit(input, artifacts.storyBible, artifacts.adaptation, artifacts.panels, coldRead);
      let gatedAudit = enforceNarrativeGate(input, audit, coldRead, artifacts.panels, autoRevisionApplied);
      const deliveryBlockingIssues = gatedAudit.issues.filter(canRepairInStoryboard);
      if (deliveryBlockingIssues.length && generatedStoryboardThisRun && !autoRevisionApplied) {
        onProgress?.({ stage: "audit", percent: 97, message: "总审发现阻断交付的问题，正在进行一次自动修订" });
        const repairReview = {
          ...coldRead,
          passed: false,
          score: Math.min(coldRead.score, deliveryBlockingIssues.some((issue) => issue.severity === "P0") ? 59 : 79),
          missingLinks: [
            ...coldRead.missingLinks,
            ...deliveryBlockingIssues.map(
              (issue) => `[${issue.severity}] ${issue.target}：${issue.message} 修订要求：${issue.suggestion}`
            )
          ]
        };
        artifacts.panels = await provider.reviseStoryboardForClarity(
          input,
          artifacts.storyBible,
          artifacts.adaptation,
          artifacts.panels,
          repairReview
        );
        autoRevisionApplied = true;
        onProgress?.({ stage: "audit", percent: 98, message: "正在复核自动修订后的完整故事" });
        coldRead = await provider.coldRead(input, artifacts.panels);
        audit = await provider.audit(input, artifacts.storyBible, artifacts.adaptation, artifacts.panels, coldRead);
        gatedAudit = enforceNarrativeGate(input, audit, coldRead, artifacts.panels, autoRevisionApplied);
      }
      artifacts.audit = gatedAudit;
    }
    if (!completedStages.includes(stage)) completedStages.push(stage);
    await onCheckpoint?.({
      request: input,
      artifacts: { ...artifacts },
      completedStages: [...completedStages],
      provider: provider.name
    });
  }

  onProgress?.({ stage: "complete", percent: 98, message: endStage === "audit" ? "审核完成，正在整理 Prompt Pack" : "当前阶段已完成，正在整理结果" });
  return { request: input, artifacts, completedStages, provider: provider.name };
}
