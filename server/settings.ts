import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export const llmSettingsSchema = z.object({
  provider: z.enum(["demo", "openai-compatible"]),
  baseUrl: z.string().trim().min(1),
  apiKey: z.string(),
  model: z.string().trim().min(1)
});

export type LlmSettings = z.infer<typeof llmSettingsSchema>;

const defaultSettings = (): LlmSettings => ({
  provider: process.env.LLM_PROVIDER === "openai-compatible" ? "openai-compatible" : "demo",
  baseUrl: process.env.LLM_BASE_URL || "http://localhost:11434/v1",
  apiKey: process.env.LLM_API_KEY || "",
  model: process.env.LLM_MODEL || "qwen3:8b"
});

export const settingsFilePath = () => resolve(
  process.env.SETTINGS_PATH || join(process.cwd(), "data", "settings.json")
);

export async function loadSettings(path = settingsFilePath()): Promise<LlmSettings> {
  try {
    const stored = JSON.parse(await readFile(path, "utf8"));
    return llmSettingsSchema.parse({ ...defaultSettings(), ...stored });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code === "ENOENT") return defaultSettings();
    throw error;
  }
}

export async function saveSettings(settings: LlmSettings, path = settingsFilePath()) {
  const validated = llmSettingsSchema.parse(settings);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return validated;
}
