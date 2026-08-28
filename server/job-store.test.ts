import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PipelineJob } from "../src/types.js";
import { PersistentJobStore } from "./job-store.js";

function runningJob(): PipelineJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    projectId: randomUUID(),
    kind: "stage",
    startStage: "adaptation",
    endStage: "audit",
    status: "running",
    progress: { stage: "adaptation", percent: 27, message: "正在生成改编方案" },
    provider: "demo/heuristic",
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    stageResult: {
      request: {
        title: "恢复测试",
        sourceText: "这是一个用于验证中断恢复的完整故事片段，长度足以通过输入校验。",
        mode: "adapted",
        panelCount: 6,
        style: "水彩连环画",
        lockedFacts: []
      },
      artifacts: {
        storyBible: {
          logline: "一段可以恢复的故事",
          themes: [],
          narrativeVoice: "第三人称",
          characters: [],
          locations: [],
          timeline: [],
          lockedFacts: [],
          ambiguities: []
        }
      },
      completedStages: ["bible"],
      provider: "demo/heuristic"
    }
  };
}

describe("persistent pipeline job store", () => {
  it("marks an active job interrupted after restart and retains its last checkpoint", async () => {
    const directory = await mkdtemp(join(tmpdir(), "storyboard-jobs-"));
    const path = join(directory, "jobs.json");
    try {
      const beforeRestart = new PersistentJobStore(path);
      const job = runningJob();
      await beforeRestart.set(job);

      const afterRestart = new PersistentJobStore(path);
      await afterRestart.initialize();
      const recovered = afterRestart.get(job.id);

      expect(recovered?.status).toBe("interrupted");
      expect(recovered?.stageResult?.completedStages).toEqual(["bible"]);
      expect(recovered?.stageResult?.artifacts.storyBible?.logline).toBe("一段可以恢复的故事");
      expect(recovered?.error).toContain("最后一个完成阶段");
      expect(await readFile(path, "utf8")).toContain('"status": "interrupted"');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("updates and deletes terminal jobs without losing the store", async () => {
    const directory = await mkdtemp(join(tmpdir(), "storyboard-jobs-"));
    const path = join(directory, "jobs.json");
    try {
      const store = new PersistentJobStore(path);
      const job = runningJob();
      await store.set(job);
      await store.update(job.id, { status: "completed", progress: { stage: "complete", percent: 100, message: "完成" } });
      expect(store.get(job.id)?.status).toBe("completed");
      expect(await store.delete(job.id)).toBe(true);

      const reloaded = new PersistentJobStore(path);
      expect(await reloaded.initialize()).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
