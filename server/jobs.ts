import { randomUUID } from "node:crypto";
import type { ArtifactStage, PipelineArtifacts, PipelineJob, PipelineProgress, PipelineResult, PipelineStageResult } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";
import type { NarrativeProvider } from "./provider.js";
import { runPipeline, runStageRange } from "./pipeline.js";
import { PersistentJobStore } from "./job-store.js";

const store = new PersistentJobStore();
const cleanupTimers = new Map<string, NodeJS.Timeout>();
const parsedRetention = Number(process.env.JOB_RETENTION_MS || 7 * 24 * 60 * 60 * 1000);
const JOB_RETENTION_MS = Number.isFinite(parsedRetention) && parsedRetention >= 60_000
  ? parsedRetention
  : 7 * 24 * 60 * 60 * 1000;

const terminalStatuses = new Set<PipelineJob["status"]>(["completed", "failed", "interrupted"]);

function initialCompletedStages(artifacts: PipelineArtifacts) {
  const completed: ArtifactStage[] = [];
  if (artifacts.storyBible) completed.push("bible");
  if (artifacts.adaptation) completed.push("adaptation");
  if (artifacts.panels) completed.push("storyboard");
  if (artifacts.audit) completed.push("audit");
  return completed;
}

function initialStageResult(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  artifacts: PipelineArtifacts
): PipelineStageResult {
  return {
    request: input,
    artifacts,
    completedStages: initialCompletedStages(artifacts),
    provider: provider.name
  };
}

function scheduleCleanup(job: PipelineJob) {
  const existing = cleanupTimers.get(job.id);
  if (existing) clearTimeout(existing);
  if (!terminalStatuses.has(job.status)) {
    cleanupTimers.delete(job.id);
    return;
  }

  const age = Math.max(0, Date.now() - Date.parse(job.updatedAt));
  const timer = setTimeout(() => {
    cleanupTimers.delete(job.id);
    const current = store.get(job.id);
    if (current && terminalStatuses.has(current.status)) void store.delete(job.id);
  }, Math.max(1_000, JOB_RETENTION_MS - age));
  timer.unref();
  cleanupTimers.set(job.id, timer);
}

async function updateJob(id: string, update: Partial<PipelineJob>) {
  const job = await store.update(id, update);
  if (job && terminalStatuses.has(job.status)) scheduleCleanup(job);
  return job;
}

export async function initializeJobs() {
  const jobs = await store.initialize();
  jobs.forEach(scheduleCleanup);
  return jobs;
}

export function getJob(id: string) {
  return store.get(id);
}

export async function createPipelineJob(input: ValidPipelineRequest, provider: NarrativeProvider) {
  const id = randomUUID();
  const projectId = randomUUID();
  const now = new Date().toISOString();
  const initialProgress: PipelineProgress = {
    stage: "bible",
    percent: 2,
    message: "正在读取原文并准备故事分析"
  };
  const job: PipelineJob = {
    id,
    projectId,
    kind: "full",
    startStage: "bible",
    endStage: "audit",
    status: "queued",
    progress: initialProgress,
    provider: provider.name,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    stageResult: initialStageResult(input, provider, {})
  };

  await store.set(job);
  void (async () => {
    await updateJob(id, { status: "running" });
    try {
      const generated = await runPipeline(
        input,
        provider,
        (progress) => { void updateJob(id, { progress }); },
        async (checkpoint) => { await updateJob(id, { stageResult: checkpoint }); }
      );
      const result: PipelineResult = { ...generated, projectId };
      await updateJob(id, {
        status: "completed",
        progress: { stage: "complete", percent: 100, message: "Prompt Pack 已生成" },
        result
      });
    } catch (error) {
      await updateJob(id, {
        status: "failed",
        error: error instanceof Error ? error.message : "生成失败"
      });
    }
  })();

  return job;
}

export async function createStageJob(
  input: ValidPipelineRequest,
  provider: NarrativeProvider,
  startStage: ArtifactStage,
  endStage: ArtifactStage,
  artifacts: PipelineArtifacts,
  existingProjectId?: string
) {
  const id = randomUUID();
  const projectId = existingProjectId || randomUUID();
  const now = new Date().toISOString();
  const job: PipelineJob = {
    id,
    projectId,
    kind: "stage",
    startStage,
    endStage,
    status: "queued",
    progress: { stage: startStage, percent: 2, message: "正在准备阶段任务" },
    provider: provider.name,
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    stageResult: initialStageResult(input, provider, artifacts)
  };

  await store.set(job);
  void (async () => {
    await updateJob(id, { status: "running" });
    try {
      const stageResult = await runStageRange(
        input,
        provider,
        startStage,
        endStage,
        artifacts,
        (progress) => { void updateJob(id, { progress }); },
        async (checkpoint) => { await updateJob(id, { stageResult: checkpoint }); }
      );
      await updateJob(id, {
        status: "completed",
        progress: { stage: "complete", percent: 100, message: "阶段产物已生成" },
        stageResult
      });
    } catch (error) {
      await updateJob(id, {
        status: "failed",
        error: error instanceof Error ? error.message : "阶段生成失败"
      });
    }
  })();

  return job;
}
