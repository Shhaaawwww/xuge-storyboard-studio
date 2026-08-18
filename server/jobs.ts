import { randomUUID } from "node:crypto";
import type { ArtifactStage, PipelineArtifacts, PipelineJob, PipelineProgress, PipelineResult } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";
import { runPipeline, runStageRange } from "./pipeline.js";

const jobs = new Map<string, PipelineJob>();
const JOB_TTL_MS = 30 * 60 * 1000;

function updateJob(id: string, update: Partial<PipelineJob>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, { ...current, ...update, updatedAt: new Date().toISOString() });
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function createPipelineJob(input: ValidPipelineRequest, provider: NarrativeProvider) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const initialProgress: PipelineProgress = {
    stage: "bible",
    percent: 2,
    message: "正在读取原文并准备故事分析"
  };

  jobs.set(id, {
    id,
    status: "queued",
    progress: initialProgress,
    provider: provider.name,
    createdAt: now,
    startedAt: now,
    updatedAt: now
  });

  void (async () => {
    updateJob(id, { status: "running" });
    try {
      const result: PipelineResult = await runPipeline(input, provider, (progress) => {
        updateJob(id, { progress });
      });
      updateJob(id, {
        status: "completed",
        progress: { stage: "complete", percent: 100, message: "Prompt Pack 已生成" },
        result
      });
    } catch (error) {
      updateJob(id, {
        status: "failed",
        error: error instanceof Error ? error.message : "生成失败"
      });
    }
  })();

  setTimeout(() => jobs.delete(id), JOB_TTL_MS).unref();
  return jobs.get(id)!;
}

export function createStageJob(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  startStage: ArtifactStage,
  endStage: ArtifactStage,
  artifacts: PipelineArtifacts
) {
  const id = randomUUID();
  const now = new Date().toISOString();
  jobs.set(id, {
    id,
    status: "queued",
    progress: { stage: startStage, percent: 2, message: "正在准备阶段任务" },
    provider: provider.name,
    createdAt: now,
    startedAt: now,
    updatedAt: now
  });

  void (async () => {
    updateJob(id, { status: "running" });
    try {
      const stageResult = await runStageRange(input, provider, startStage, endStage, artifacts, (progress) => {
        updateJob(id, { progress });
      });
      updateJob(id, {
        status: "completed",
        progress: { stage: "complete", percent: 100, message: "阶段产物已生成" },
        stageResult
      });
    } catch (error) {
      updateJob(id, { status: "failed", error: error instanceof Error ? error.message : "阶段生成失败" });
    }
  })();

  setTimeout(() => jobs.delete(id), JOB_TTL_MS).unref();
  return jobs.get(id)!;
}
