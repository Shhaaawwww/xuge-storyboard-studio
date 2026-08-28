import type { AuditIssue, AuditReport, ColdReadReport, PromptCard } from "../src/types.js";
import type { ValidPipelineRequest } from "./schemas.js";

function prefersEnglish(text: string) {
  const latin = text.match(/[A-Za-z]/g)?.length || 0;
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  return latin > cjk * 2;
}

function contradictsPositivePrompt(panel: PromptCard) {
  const positive = panel.prompt.toLowerCase();
  const negative = panel.negativePrompt.toLowerCase();
  const segments = negative.split(/[、,，;；。]/).map((item) => item.trim()).filter(Boolean);

  const modernSceneMarkers = [
    "手机", "智能手机", "车站", "校服", "插座", "电闸", "汽车", "雷达", "屏幕",
    "smartphone", "mobile phone", "station", "school uniform", "electrical outlet", "circuit breaker", "car", "radar", "screen"
  ];
  const bansModernScene = segments.some((segment) => /^(?:(?:不要|避免|禁止)(?:出现|使用)?(?:任何)?)?现代(?:元素|物品|设备|交通工具)$/.test(segment)
    || /^(?:no|avoid)(?: any)? modern (?:elements|objects|equipment|technology|transport)$/.test(segment));
  if (bansModernScene && modernSceneMarkers.some((marker) => positive.includes(marker))) return true;

  const concreteObjects = [
    "汽车", "车辆", "手机", "相机", "车站", "校服", "插座", "电闸", "雷达", "发电机",
    "car", "vehicle", "phone", "camera", "station", "school uniform", "outlet", "circuit breaker", "radar", "generator"
  ];
  return concreteObjects.some((object) => positive.includes(object) && segments.some((segment) => {
    const escaped = object.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^(?:(?:不要|避免|禁止)(?:出现|使用)?(?:任何)?)?现代${escaped}$`).test(segment)
      || new RegExp(`^(?:no|avoid)(?: any)? modern ${escaped}$`).test(segment);
  }));
}

export function enforceNarrativeGate(
  input: ValidPipelineRequest,
  audit: AuditReport,
  coldRead: ColdReadReport,
  panels: PromptCard[],
  autoRevisionApplied: boolean
): AuditReport {
  const english = prefersEnglish(input.sourceText);
  const issues: AuditIssue[] = [...audit.issues];
  const hasIssue = (id: string) => issues.some((issue) => issue.id === id);

  if (!coldRead.passed && !issues.some((issue) => issue.severity === "P0")) {
    issues.unshift({
      id: "gate-cold-read",
      severity: "P0",
      target: english ? "Reader-visible comic" : "读者可见连环画",
      message: english
        ? "A zero-context reader could not reconstruct the story" + (coldRead.missingLinks.length ? ": " + coldRead.missingLinks.join("; ") : ".")
        : "零背景读者无法完整复述故事" + (coldRead.missingLinks.length ? "：" + coldRead.missingLinks.join("；") : "。"),
      suggestion: english
        ? "Restore the missing premise, causal links, identities, time anchors, or ending in visible images and captions."
        : "把缺失的前提、因果、人物身份、时间锚点或结局补回画面与读者文字。"
    });
  }

  const missingCause = panels.filter((panel, index) => index > 0 && !panel.causeFromPrevious.trim());
  if (missingCause.length && !hasIssue("gate-causal-metadata")) {
    issues.push({
      id: "gate-causal-metadata",
      severity: "P1",
      target: english ? "Causal chain" : "分镜因果链",
      message: english
        ? missingCause.length + " panels do not explain why they follow the previous panel."
        : missingCause.length + " 格没有说明它为何承接上一格。",
      suggestion: english
        ? "Add causeFromPrevious, then make that connection visible through action, narration, dialogue, or a transition caption."
        : "补充 causeFromPrevious，并通过动作、旁白、对白或转场字幕把承接关系呈现给读者。"
    });
  }

  const missingLearning = panels.filter((panel) => !panel.readerLearns.trim());
  if (missingLearning.length && !hasIssue("gate-reader-learning")) {
    issues.push({
      id: "gate-reader-learning",
      severity: "P1",
      target: english ? "Panel information design" : "单格信息设计",
      message: english
        ? missingLearning.length + " panels have no explicit reader-learning goal."
        : missingLearning.length + " 格没有明确的读者新增信息。",
      suggestion: english
        ? "Give every panel one new fact, action consequence, or emotional change that advances the story."
        : "让每格至少增加一个推动故事的事实、行动结果或情绪变化。"
    });
  }

  const unmarkedBoundaries = panels.filter((panel, index) => {
    if (index === 0 || panel.sequenceId === panels[index - 1].sequenceId) return false;
    return !panel.timeCard.trim() && !panel.locationCard.trim() && !panel.transitionCaption.trim();
  });
  if (unmarkedBoundaries.length && !hasIssue("gate-sequence-transition")) {
    issues.push({
      id: "gate-sequence-transition",
      severity: "P1",
      target: english ? "Scene transitions" : "场景转场",
      message: english
        ? unmarkedBoundaries.length + " sequence boundaries have no reader-visible transition."
        : unmarkedBoundaries.length + " 个段落切换没有读者可见的转场说明。",
      suggestion: english
        ? "Add a time card, location card, or short transition caption at each boundary."
        : "在每个边界增加时间卡、地点卡或简短转场字幕。"
    });
  }

  if (panels.some((panel) => !panel.prompt.trim()) && !hasIssue("gate-empty-prompt")) {
    issues.push({
      id: "gate-empty-prompt",
      severity: "P0",
      target: "T2I Prompt",
      message: english ? "One or more panels have no image-generation prompt." : "一个或多个分镜缺少文生图 Prompt。",
      suggestion: english ? "Provide a self-contained visual prompt for every panel." : "为每格补充可独立执行的完整画面 Prompt。"
    });
  }

  const contradictoryPrompts = panels.filter(contradictsPositivePrompt);
  if (contradictoryPrompts.length && !hasIssue("gate-prompt-contradiction")) {
    const panelOrders = contradictoryPrompts.map((panel) => panel.order).join(", ");
    issues.push({
      id: "gate-prompt-contradiction",
      severity: "P1",
      target: english ? `T2I prompts: panels ${panelOrders}` : `文生图 Prompt：第 ${panelOrders} 格`,
      message: english
        ? "The positive and negative prompts contradict each other about a required modern scene element or object."
        : "正向 Prompt 与 Negative Prompt 对画面所需的现代场景或道具提出了互相矛盾的要求。",
      suggestion: english
        ? "Keep the required object in the positive prompt and remove only the conflicting negative phrase. Negative prompts should describe defects, not ban requested content."
        : "保留正向 Prompt 所需道具，只删除冲突的负面短语；Negative Prompt 应描述视觉缺陷，不能否定已要求内容。"
    });
  }

  if (panels.length !== input.panelCount && !hasIssue("gate-panel-count")) {
    issues.push({
      id: "gate-panel-count",
      severity: "P0",
      target: english ? "Prompt Pack structure" : "Prompt Pack 结构",
      message: english
        ? "Expected " + input.panelCount + " panels but received " + panels.length + "."
        : `要求 ${input.panelCount} 格，但实际生成 ${panels.length} 格。`,
      suggestion: english ? "Regenerate the storyboard with the exact requested panel count." : "按目标格数重新生成完整分镜。"
    });
  }

  const checks = {
    ...audit.checks,
    narrativeComprehension: coldRead.score,
    causalCompleteness: Math.min(audit.checks.causalCompleteness, coldRead.score),
    chronologyLegibility: Math.min(audit.checks.chronologyLegibility, coldRead.score),
    characterClarity: Math.min(audit.checks.characterClarity, coldRead.score)
  };
  const values = Object.values(checks);
  const average = Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  const hasP0 = issues.some((issue) => issue.severity === "P0");
  const hasP1 = issues.some((issue) => issue.severity === "P1");
  const cap = hasP0 || !coldRead.passed ? 59 : hasP1 ? 79 : 100;

  return {
    ...audit,
    score: Math.min(audit.score, average, cap),
    summary: hasP0
      ? (english
          ? "The Prompt Pack failed the narrative quality gate. Fix story completeness and clarity before visual polish."
          : "Prompt Pack 未通过叙事质量门槛；必须先修复故事完整性与可理解性，再优化画面。")
      : audit.summary,
    coldRead,
    autoRevisionApplied,
    issues,
    checks
  };
}
