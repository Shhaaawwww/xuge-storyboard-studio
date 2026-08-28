import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DemoProvider } from "./demo-provider.js";
import { runPipeline } from "./pipeline.js";
import { deleteArchivedProject, getArchivedProject, listArchivedProjects, saveArchivedProject } from "./archive.js";

describe("local project archive", () => {
  it("persists, updates, lists, restores, and deletes a generated project", async () => {
    const directory = await mkdtemp(join(tmpdir(), "storyboard-archive-"));
    const path = join(directory, "archive.json");

    try {
      const result = await runPipeline({
        title: "雨夜来信",
        sourceText: "林夏在雨夜回到故乡，发现桌上有父亲留下的信。她读完信，决定修好墙上停摆多年的挂钟。",
        mode: "adapted",
        panelCount: 6,
        style: "水彩连环画",
        lockedFacts: ["父亲不在现实场景出现"]
      }, new DemoProvider());

      await saveArchivedProject(result.projectId, {
        result,
        completedStages: ["bible", "adaptation", "storyboard", "audit"],
        revisionStage: null,
        workflowMode: "guided"
      }, path);

      const summaries = await listArchivedProjects(path);
      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toEqual(expect.objectContaining({
        id: result.projectId,
        title: "雨夜来信",
        panelCount: 6,
        auditScore: result.audit.score
      }));

      const restored = await getArchivedProject(result.projectId, path);
      expect(restored?.result.storyBible.timeline.length).toBeGreaterThan(0);
      expect(restored?.completedStages).toEqual(["bible", "adaptation", "storyboard", "audit"]);

      await saveArchivedProject(result.projectId, {
        ...restored,
        result: { ...restored!.result, request: { ...restored!.result.request, title: "雨夜来信 · 修订版" } },
        revisionStage: "storyboard"
      }, path);
      expect((await getArchivedProject(result.projectId, path))?.result.request.title).toBe("雨夜来信 · 修订版");
      expect(await readFile(path, "utf8")).toContain("雨夜来信 · 修订版");

      expect(await deleteArchivedProject(result.projectId, path)).toBe(true);
      expect(await listArchivedProjects(path)).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
