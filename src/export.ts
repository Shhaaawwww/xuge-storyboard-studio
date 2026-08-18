import type { PipelineResult } from "./types";

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportJson(result: PipelineResult) {
  download(`${result.request.title || "prompt-pack"}.json`, JSON.stringify(result, null, 2), "application/json");
}

export function toMarkdown(result: PipelineResult) {
  const characters = result.storyBible.characters.map((character) =>
    `### ${character.name}\n\n- 身份：${character.role}\n- 外观：${character.appearance.join("；")}\n- 性格：${character.personality.join("；")}\n- 视觉母题：${character.visualMotifs.join("；")}`
  ).join("\n\n");

  const panels = result.panels.map((panel) => `## ${String(panel.order).padStart(2, "0")} · ${panel.storyPurpose}

**原文映射**：${panel.sourceExcerpt}

- **镜头**：${panel.shotSize} / ${panel.cameraAngle}
- **人物**：${panel.characters.join("、") || "无"}
- **地点**：${panel.location}
- **动作**：${panel.action}
- **情绪**：${panel.emotion}
- **构图**：${panel.composition}
- **光线**：${panel.lighting}

**Prompt**

${panel.prompt}

**Negative Prompt**

${panel.negativePrompt}

**连续性约束**

${panel.continuity.map((item) => `- ${item}`).join("\n")}

**后期文字**

- 旁白：${panel.narration || "无"}
- 对白：${panel.dialogue || "无"}
`).join("\n---\n\n");

  return `# ${result.request.title}\n\n> 由叙格生成 · ${new Date(result.createdAt).toLocaleString("zh-CN")} · ${result.provider}\n\n## 项目摘要\n\n${result.storyBible.logline}\n\n- 改编模式：${result.request.mode}\n- 目标格数：${result.request.panelCount}\n- 视觉风格：${result.request.style}\n- 主题：${result.storyBible.themes.join("、")}\n\n# Story Bible\n\n${characters}\n\n# 改编方案\n\n${result.adaptation.approach}\n\n**节奏**：${result.adaptation.pacing}\n\n**视觉策略**：${result.adaptation.visualStrategy}\n\n# Prompt Cards\n\n${panels}\n\n# 审核\n\n总分：${result.audit.score}/100\n\n${result.audit.summary}\n\n${result.audit.issues.map((issue) => `- **${issue.severity} ${issue.target}**：${issue.message} 建议：${issue.suggestion}`).join("\n") || "- 未发现明确问题"}\n`;
}

export function exportMarkdown(result: PipelineResult) {
  download(`${result.request.title || "prompt-pack"}.md`, toMarkdown(result), "text/markdown;charset=utf-8");
}
