import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ArtifactStage, PipelineJob, PipelineJobStatus, PipelineStage } from "../src/types.js";

interface JobStoreFile {
  version: 1;
  jobs: Record<string, PipelineJob>;
}

const jobIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
const jobStatuses = new Set<PipelineJobStatus>(["queued", "running", "completed", "failed", "interrupted"]);
const artifactStages = new Set<ArtifactStage>(["bible", "adaptation", "storyboard", "audit"]);
const pipelineStages = new Set<PipelineStage>(["bible", "adaptation", "storyboard", "audit", "complete"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStoredJob(value: unknown): value is PipelineJob {
  if (!isRecord(value) || !isRecord(value.progress)) return false;
  return typeof value.id === "string"
    && jobIdPattern.test(value.id)
    && typeof value.projectId === "string"
    && (value.kind === "full" || value.kind === "stage")
    && typeof value.status === "string"
    && jobStatuses.has(value.status as PipelineJobStatus)
    && typeof value.startStage === "string"
    && artifactStages.has(value.startStage as ArtifactStage)
    && typeof value.endStage === "string"
    && artifactStages.has(value.endStage as ArtifactStage)
    && typeof value.progress.stage === "string"
    && pipelineStages.has(value.progress.stage as PipelineStage)
    && typeof value.progress.percent === "number"
    && typeof value.progress.message === "string"
    && typeof value.provider === "string"
    && typeof value.createdAt === "string"
    && typeof value.startedAt === "string"
    && typeof value.updatedAt === "string";
}

export const jobsFilePath = () => resolve(
  process.env.JOBS_PATH || join(process.cwd(), "data", "jobs.json")
);

export class PersistentJobStore {
  private readonly jobs = new Map<string, PipelineJob>();
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path = jobsFilePath()) {}

  async initialize() {
    let changed = false;
    try {
      const parsed = JSON.parse(await readFile(this.path, "utf8")) as unknown;
      if (!isRecord(parsed) || !isRecord(parsed.jobs)) throw new Error("任务存储格式无效");
      for (const value of Object.values(parsed.jobs)) {
        if (!isStoredJob(value)) continue;
        let job = value;
        if (job.status === "queued" || job.status === "running") {
          const interruptedAt = new Date().toISOString();
          job = {
            ...job,
            status: "interrupted",
            interruptedAt,
            updatedAt: interruptedAt,
            error: "应用上次运行时意外停止，已恢复到最后一个完成阶段。"
          };
          changed = true;
        }
        this.jobs.set(job.id, job);
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code !== "ENOENT") throw error;
    }

    if (changed) await this.persist();
    return this.list();
  }

  get(id: string) {
    return this.jobs.get(id);
  }

  list() {
    return [...this.jobs.values()];
  }

  async set(job: PipelineJob) {
    if (!jobIdPattern.test(job.id)) throw new Error("任务 ID 无效");
    this.jobs.set(job.id, job);
    await this.persist();
    return job;
  }

  async update(id: string, update: Partial<PipelineJob>) {
    const current = this.jobs.get(id);
    if (!current) return undefined;
    const job: PipelineJob = {
      ...current,
      ...update,
      id: current.id,
      updatedAt: update.updatedAt || new Date().toISOString()
    };
    this.jobs.set(id, job);
    await this.persist();
    return job;
  }

  async delete(id: string) {
    const deleted = this.jobs.delete(id);
    if (deleted) await this.persist();
    return deleted;
  }

  private persist() {
    const operation = this.writeQueue.then(async () => {
      const file: JobStoreFile = {
        version: 1,
        jobs: Object.fromEntries(this.jobs)
      };
      await mkdir(dirname(this.path), { recursive: true });
      const temporaryPath = `${this.path}.${process.pid}.tmp`;
      await writeFile(temporaryPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
      await rename(temporaryPath, this.path);
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }
}
