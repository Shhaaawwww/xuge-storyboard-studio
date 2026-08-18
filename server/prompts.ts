import type { ValidPipelineRequest } from "./schemas.js";

const modePolicy = {
  faithful: "忠于原文：不得添加新事件、改变因果、人物关系或结局；只允许补充画面必需的环境与动作。",
  adapted: "漫画改编：允许压缩、拆分、合并段落，补充过渡动作和视觉象征，但不得改变核心事实与结局。",
  artistic: "艺术创作：允许非线性叙事、视觉隐喻和主观镜头；任何新增内容必须标记为 CREATIVE，且不得违反锁定事实。"
} as const;

export function storyBiblePrompt(input: ValidPipelineRequest) {
  return `你是视觉叙事项目的 Canon Keeper。只分析原文，不做艺术化改写。
请从原文提取故事圣经，并严格返回 JSON。

标题：${input.title}
锁定事实：${input.lockedFacts.join("；") || "无"}
原文：
${input.sourceText}

JSON 字段：logline, themes, narrativeVoice, characters, locations, timeline, lockedFacts, ambiguities。
characters 每项包含 id,name,role,appearance,personality,visualMotifs,lockedFacts。
locations 每项包含 id,name,description,fixedElements。
timeline 每项包含 id,summary,sourceExcerpt,participants。
没有依据的外貌不要当作事实，放入 ambiguities。`;
}

export function adaptationPrompt(input: ValidPipelineRequest, bible: unknown) {
  return `你是漫画改编编辑。根据原文和 Story Bible 制定可执行的改编方案。
改编政策：${modePolicy[input.mode]}
目标格数：${input.panelCount}
视觉风格：${input.style}

Story Bible：${JSON.stringify(bible)}
原文：${input.sourceText}

严格返回 JSON：approach,pacing,visualStrategy,decisions。
decisions 每项包含 id,source,decision,reason,provenance；provenance 只能是 SOURCE、INFERENCE、CREATIVE。`;
}

export function storyboardPrompt(input: ValidPipelineRequest, bible: unknown, adaptation: unknown) {
  return `你是分镜导演和 Prompt Compiler。生成恰好 ${input.panelCount} 个连续漫画分镜。
每格只表达一个主要动作，镜头需要有节奏变化。所有人物、场景和物品必须遵守 Story Bible。
画面风格：${input.style}
改编政策：${modePolicy[input.mode]}

Story Bible：${JSON.stringify(bible)}
改编方案：${JSON.stringify(adaptation)}

严格返回 JSON 对象 {"panels": [...]}。
每格字段：id,order,sourceExcerpt,storyPurpose,characters,location,action,emotion,shotSize,cameraAngle,composition,lighting,continuity,prompt,negativePrompt,narration,dialogue,provenance。
prompt 必须自足，包含稳定的人物描述、动作、环境、镜头、构图、光照和统一风格；不要把对白或画中文字写入 prompt。
negativePrompt 只写需要避免的视觉问题。provenance 是 SOURCE/INFERENCE/CREATIVE 数组。`;
}

export function auditPrompt(input: ValidPipelineRequest, bible: unknown, panels: unknown) {
  return `你是严格的漫画制作审核员。审核忠实度、连续性、视觉清晰度和 Prompt 可执行性。
模式：${input.mode}
锁定事实：${input.lockedFacts.join("；") || "无"}
Story Bible：${JSON.stringify(bible)}
Panels：${JSON.stringify(panels)}

严格返回 JSON：score,summary,issues,checks。
issues 每项包含 id,severity,target,message,suggestion，severity 只能是 P0/P1/P2。
checks 包含 faithfulness,continuity,visualClarity,promptQuality，均为 0-100。不要因为缺少生成图片而惩罚。`;
}

export function aiEditPrompt(
  input: ValidPipelineRequest,
  target: "bible" | "adaptation" | "storyboard",
  instruction: string,
  artifact: unknown,
  context: unknown
) {
  const targetName = { bible: "Story Bible", adaptation: "Adaptation Plan", storyboard: "Storyboard Prompts" }[target];
  return `你是视觉叙事项目的 AI 编辑助手。用户希望修改 ${targetName}。
你必须提出最小、可解释、可应用的修改，不得擅自改变用户没有要求的事实。
锁定事实始终优先：${input.lockedFacts.join("；") || "无"}

用户要求：${instruction}
当前产物：${JSON.stringify(artifact)}
上游上下文：${JSON.stringify(context)}

严格返回 JSON：summary,rationale,changes,revisedArtifact。
changes 每项包含 field,before,after,reason，便于用户确认。
revisedArtifact 必须是完整修改后的 ${targetName}，结构与当前产物完全一致，不能只返回差异。
如果要求违反锁定事实，不要应用该冲突；在 rationale 中明确解释。`;
}
