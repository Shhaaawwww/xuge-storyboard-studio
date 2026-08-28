import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ArchivedProject, ArchivedProjectSummary, ArtifactStage, PipelineResult } from "../src/types.js";
import { normalizeAdaptation, normalizeAudit, normalizePanels, normalizeStoryBible } from "./normalize.js";
import { pipelineRequestSchema } from "./schemas.js";

type UnknownRecord = Record<string, unknown>;

interface ArchiveStore {
  version: 1;
  projects: Record<string, ArchivedProject>;
}

const artifactStages: ArtifactStage[] = ["bible", "adaptation", "storyboard", "audit"];
const archiveIdPattern = /^[A-Za-z0-9_-]{1,100}$/;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function timestamp(value: unknown, fallback: string) {
  const candidate = text(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : fallback;
}

function completedStages(value: unknown): ArtifactStage[] {
  if (!Array.isArray(value)) return [];
  return artifactStages.filter((stage) => value.includes(stage));
}

function normalizeArchivedProject(projectId: string, value: unknown): ArchivedProject {
  if (!archiveIdPattern.test(projectId)) throw new Error("存档 ID 无效");
  const source = record(value);
  const rawResult = record(source.result);
  const now = new Date().toISOString();
  const createdAt = timestamp(source.createdAt, timestamp(rawResult.createdAt, now));
  const stages = completedStages(source.completedStages);
  const revision = source.revisionStage === "bible" || source.revisionStage === "adaptation" || source.revisionStage === "storyboard"
    ? source.revisionStage
    : null;
  const result: PipelineResult = {
    projectId,
    createdAt,
    request: pipelineRequestSchema.parse(rawResult.request),
    storyBible: normalizeStoryBible(rawResult.storyBible),
    adaptation: normalizeAdaptation(rawResult.adaptation),
    panels: normalizePanels(rawResult.panels),
    audit: normalizeAudit(rawResult.audit),
    provider: text(rawResult.provider, "unknown")
  };

  return {
    id: projectId,
    createdAt,
    updatedAt: timestamp(source.updatedAt, now),
    completedStages: stages,
    revisionStage: revision,
    workflowMode: source.workflowMode === "auto" ? "auto" : "guided",
    result
  };
}

function emptyStore(): ArchiveStore {
  return { version: 1, projects: {} };
}

export const archiveFilePath = () => resolve(
  process.env.ARCHIVE_PATH || join(process.cwd(), "data", "archive.json")
);

async function loadStore(path = archiveFilePath()): Promise<ArchiveStore> {
  try {
    const parsed = record(JSON.parse(await readFile(path, "utf8")));
    const rawProjects = record(parsed.projects);
    const projects: Record<string, ArchivedProject> = {};
    for (const [id, value] of Object.entries(rawProjects)) {
      try {
        projects[id] = normalizeArchivedProject(id, value);
      } catch {
        // One malformed local entry must not make every other project inaccessible.
      }
    }
    return { version: 1, projects };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return emptyStore();
    throw error;
  }
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function updateStore(
  update: (store: ArchiveStore) => void,
  path = archiveFilePath()
) {
  const operation = writeQueue.then(async () => {
    const store = await loadStore(path);
    update(store);
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    await rename(temporaryPath, path);
  });
  writeQueue = operation.catch(() => undefined);
  await operation;
}

function toSummary(project: ArchivedProject): ArchivedProjectSummary {
  return {
    id: project.id,
    title: project.result.request.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    completedStages: project.completedStages,
    panelCount: project.result.panels.length,
    requestedPanelCount: project.result.request.panelCount,
    auditScore: project.completedStages.includes("audit") ? project.result.audit.score : null,
    provider: project.result.provider
  };
}

export async function listArchivedProjects(path = archiveFilePath()) {
  const store = await loadStore(path);
  return Object.values(store.projects)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map(toSummary);
}

export async function getArchivedProject(projectId: string, path = archiveFilePath()) {
  const store = await loadStore(path);
  return store.projects[projectId] || null;
}

export async function saveArchivedProject(projectId: string, value: unknown, path = archiveFilePath()) {
  const project = normalizeArchivedProject(projectId, {
    ...record(value),
    updatedAt: new Date().toISOString()
  });
  await updateStore((store) => {
    const existing = store.projects[projectId];
    store.projects[projectId] = {
      ...project,
      createdAt: existing?.createdAt || project.createdAt,
      result: {
        ...project.result,
        createdAt: existing?.result.createdAt || project.result.createdAt
      }
    };
  }, path);
  return getArchivedProject(projectId, path);
}

export async function deleteArchivedProject(projectId: string, path = archiveFilePath()) {
  let deleted = false;
  await updateStore((store) => {
    deleted = Boolean(store.projects[projectId]);
    delete store.projects[projectId];
  }, path);
  return deleted;
}
