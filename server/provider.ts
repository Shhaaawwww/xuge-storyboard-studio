import type { ValidPipelineRequest } from "./schemas.js";
import type { AdaptationPlan, AiEditProposal, AuditReport, PromptCard, StoryBible } from "../src/types.js";
import { adaptationPrompt, aiEditPrompt, auditPrompt, storyboardPrompt, storyBiblePrompt } from "./prompts.js";
import type { LlmSettings } from "./settings.js";
import { normalizeAdaptation, normalizeAiEditProposal, normalizeAudit, normalizePanels, normalizeStoryBible } from "./normalize.js";

export interface NarrativeProvider {
  readonly name: string;
  buildStoryBible(input: ValidPipelineRequest): Promise<StoryBible>;
  buildAdaptation(input: ValidPipelineRequest, bible: StoryBible): Promise<AdaptationPlan>;
  buildStoryboard(input: ValidPipelineRequest, bible: StoryBible, plan: AdaptationPlan): Promise<PromptCard[]>;
  audit(input: ValidPipelineRequest, bible: StoryBible, panels: PromptCard[]): Promise<AuditReport>;
  proposeEdit(
    input: ValidPipelineRequest,
    target: AiEditProposal["target"],
    instruction: string,
    artifact: unknown,
    context: unknown
  ): Promise<AiEditProposal>;
}

function parseJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

export class OpenAICompatibleProvider implements NarrativeProvider {
  readonly name: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(settings?: LlmSettings) {
    this.baseUrl = (settings?.baseUrl || process.env.LLM_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
    this.apiKey = settings?.apiKey || process.env.LLM_API_KEY || "ollama";
    this.model = settings?.model || process.env.LLM_MODEL || "qwen3:8b";
    this.name = `openai-compatible/${this.model}`;
  }

  private async complete(prompt: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是专业的视觉叙事制作系统。只返回合法 JSON，不要使用 Markdown。" },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`模型请求失败：${response.status} ${await response.text()}`);
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("模型没有返回内容");
    return parseJson(content);
  }

  async buildStoryBible(input: ValidPipelineRequest) {
    return normalizeStoryBible(await this.complete(storyBiblePrompt(input)));
  }

  async buildAdaptation(input: ValidPipelineRequest, bible: StoryBible) {
    return normalizeAdaptation(await this.complete(adaptationPrompt(input, bible)));
  }

  async buildStoryboard(input: ValidPipelineRequest, bible: StoryBible, plan: AdaptationPlan) {
    return normalizePanels(await this.complete(storyboardPrompt(input, bible, plan)));
  }

  async audit(input: ValidPipelineRequest, bible: StoryBible, panels: PromptCard[]) {
    return normalizeAudit(await this.complete(auditPrompt(input, bible, panels)));
  }

  async proposeEdit(
    input: ValidPipelineRequest,
    target: AiEditProposal["target"],
    instruction: string,
    artifact: unknown,
    context: unknown
  ) {
    return normalizeAiEditProposal(target, await this.complete(aiEditPrompt(input, target, instruction, artifact, context)));
  }
}
