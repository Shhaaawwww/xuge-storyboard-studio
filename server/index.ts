import "dotenv/config";
import cors from "cors";
import express from "express";
import { DemoProvider } from "./demo-provider.js";
import { runPipeline } from "./pipeline.js";
import { OpenAICompatibleProvider } from "./provider.js";
import { aiEditRequestSchema, pipelineRequestSchema, stageJobRequestSchema } from "./schemas.js";
import { llmSettingsSchema, loadSettings, saveSettings } from "./settings.js";
import { createPipelineJob, createStageJob, getJob } from "./jobs.js";
import { normalizeAdaptation, normalizeAudit, normalizePanels, normalizeStoryBible } from "./normalize.js";

const app = express();
const port = Number(process.env.PORT || 4317);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const configuredProvider = async () => {
  const settings = await loadSettings();
  return settings.provider === "openai-compatible"
    ? new OpenAICompatibleProvider(settings)
    : new DemoProvider();
};

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/config", async (_request, response) => {
  try {
    const settings = await loadSettings();
    const provider = await configuredProvider();
    response.json({
      ...settings,
      model: provider.name,
      selectedModel: settings.model,
      ready: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取设置失败";
    response.status(500).json({ error: message });
  }
});

app.post("/api/config", async (request, response) => {
  const parsed = llmSettingsSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "API 设置不完整", details: parsed.error.flatten() });
    return;
  }

  try {
    const settings = await saveSettings(parsed.data);
    const provider = settings.provider === "openai-compatible"
      ? new OpenAICompatibleProvider(settings)
      : new DemoProvider();
    response.json({ ...settings, model: provider.name, selectedModel: settings.model, ready: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存设置失败";
    response.status(500).json({ error: message });
  }
});

app.post("/api/pipeline/generate", async (request, response) => {
  const parsed = pipelineRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "输入不完整", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await runPipeline(parsed.data, await configuredProvider());
    response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    response.status(500).json({ error: message });
  }
});

app.post("/api/pipeline/jobs", async (request, response) => {
  const parsed = pipelineRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "输入不完整", details: parsed.error.flatten() });
    return;
  }

  try {
    const job = createPipelineJob(parsed.data, await configuredProvider());
    response.status(202).json({ jobId: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    response.status(500).json({ error: message });
  }
});

app.post("/api/pipeline/stage-jobs", async (request, response) => {
  const parsed = stageJobRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "阶段任务输入不完整", details: parsed.error.flatten() });
    return;
  }
  try {
    const rawArtifacts = parsed.data.artifacts;
    const artifacts = {
      ...(rawArtifacts.storyBible !== undefined ? { storyBible: normalizeStoryBible(rawArtifacts.storyBible) } : {}),
      ...(rawArtifacts.adaptation !== undefined ? { adaptation: normalizeAdaptation(rawArtifacts.adaptation) } : {}),
      ...(rawArtifacts.panels !== undefined ? { panels: normalizePanels(rawArtifacts.panels) } : {}),
      ...(rawArtifacts.audit !== undefined ? { audit: normalizeAudit(rawArtifacts.audit) } : {})
    };
    const job = createStageJob(
      parsed.data.request,
      await configuredProvider(),
      parsed.data.startStage,
      parsed.data.endStage,
      artifacts
    );
    response.status(202).json({ jobId: job.id });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "创建阶段任务失败" });
  }
});

app.post("/api/assistant/propose", async (request, response) => {
  const parsed = aiEditRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "AI 编辑请求不完整", details: parsed.error.flatten() });
    return;
  }
  try {
    const provider = await configuredProvider();
    const proposal = await provider.proposeEdit(
      parsed.data.request,
      parsed.data.target,
      parsed.data.instruction,
      parsed.data.artifact,
      parsed.data.context
    );
    response.json(proposal);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "AI 编辑建议生成失败" });
  }
});

app.get("/api/pipeline/jobs/:id", (request, response) => {
  const job = getJob(request.params.id);
  if (!job) {
    response.status(404).json({ error: "任务不存在或已经过期" });
    return;
  }
  response.json(job);
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Narrative API listening on http://localhost:${port}`);
});
