import type {
  AdaptationPlan,
  AiEditProposal,
  AuditIssue,
  AuditReport,
  Character,
  ColdReadReport,
  Location,
  PromptCard,
  StoryBible,
  TimelineEvent
} from "../src/types.js";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function text(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function textList(value: unknown): string[] {
  return list(value).map((item) => text(item)).filter(Boolean);
}

function concreteTextList(value: unknown): string[] {
  return textList(value).filter((item) => !/^(?:true|false|yes|no|是|否)$/i.test(item));
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function score(value: unknown, fallback = 0): number {
  return Math.round(Math.min(100, Math.max(0, number(value, fallback))));
}

function boolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function id(value: unknown, prefix: string, index: number): string {
  return text(value, `${prefix}-${index + 1}`);
}

function provenance(value: unknown): "SOURCE" | "INFERENCE" | "CREATIVE" {
  const normalized = text(value).toUpperCase();
  return normalized === "INFERENCE" || normalized === "CREATIVE" ? normalized : "SOURCE";
}

export function normalizeStoryBible(value: unknown): StoryBible {
  const source = record(value);
  return {
    logline: text(source.logline, "尚未生成故事梗概"),
    themes: textList(source.themes),
    narrativeVoice: text(source.narrativeVoice, "原文叙事视角"),
    characters: list(source.characters).map((item, index): Character => {
      const character = record(item);
      return {
        id: id(character.id, "character", index),
        name: text(character.name, `人物 ${index + 1}`),
        role: text(character.role, "角色"),
        appearance: textList(character.appearance),
        personality: textList(character.personality),
        visualMotifs: textList(character.visualMotifs),
        lockedFacts: textList(character.lockedFacts)
      };
    }),
    locations: list(source.locations).map((item, index): Location => {
      const location = record(item);
      return {
        id: id(location.id, "location", index),
        name: text(location.name, `地点 ${index + 1}`),
        description: text(location.description),
        fixedElements: textList(location.fixedElements)
      };
    }),
    timeline: list(source.timeline).map((item, index): TimelineEvent => {
      const event = record(item);
      return {
        id: id(event.id, "event", index),
        summary: text(event.summary, `事件 ${index + 1}`),
        sourceExcerpt: text(event.sourceExcerpt),
        participants: textList(event.participants)
      };
    }),
    lockedFacts: textList(source.lockedFacts),
    ambiguities: textList(source.ambiguities)
  };
}

export function normalizeAdaptation(value: unknown): AdaptationPlan {
  const source = record(value);
  const spine = record(source.narrativeSpine);
  return {
    narrativeSpine: {
      protagonist: text(spine.protagonist),
      setup: text(spine.setup, text(source.approach)),
      goal: text(spine.goal),
      obstacle: text(spine.obstacle),
      stakes: text(spine.stakes),
      incitingIncident: text(spine.incitingIncident),
      turningPoint: text(spine.turningPoint),
      resolution: text(spine.resolution),
      centralQuestion: text(spine.centralQuestion),
      causalChain: textList(spine.causalChain),
      indispensableFacts: textList(spine.indispensableFacts)
    },
    approach: text(source.approach, "忠于原文的视觉改编"),
    pacing: text(source.pacing),
    visualStrategy: text(source.visualStrategy),
    chronologyStrategy: text(source.chronologyStrategy, "按读者可识别的时间顺序推进"),
    sequences: list(source.sequences).map((item, index) => {
      const sequence = record(item);
      return {
        id: id(sequence.id, "sequence", index),
        title: text(sequence.title, `段落 ${index + 1}`),
        purpose: text(sequence.purpose),
        time: text(sequence.time),
        location: text(sequence.location),
        transitionIn: text(sequence.transitionIn),
        panelBudget: Math.max(0, Math.round(number(sequence.panelBudget))),
        requiredInformation: textList(sequence.requiredInformation)
      };
    }),
    decisions: list(source.decisions).map((item, index) => {
      const decision = record(item);
      return {
        id: id(decision.id, "decision", index),
        source: text(decision.source),
        decision: text(decision.decision),
        reason: text(decision.reason),
        provenance: provenance(decision.provenance)
      };
    })
  };
}

export function normalizePanels(value: unknown): PromptCard[] {
  const source = Array.isArray(value) ? value : list(record(value).panels);
  return source.map((item, index): PromptCard => {
    const panel = record(item);
    return {
      id: id(panel.id, "panel", index),
      order: number(panel.order, index + 1),
      sequenceId: text(panel.sequenceId, "sequence-1"),
      sequenceTitle: text(panel.sequenceTitle, "Main sequence"),
      sourceExcerpt: text(panel.sourceExcerpt),
      storyPurpose: text(panel.storyPurpose),
      causeFromPrevious: text(panel.causeFromPrevious),
      readerLearns: text(panel.readerLearns, text(panel.storyPurpose)),
      timeCard: text(panel.timeCard),
      locationCard: text(panel.locationCard),
      transitionCaption: text(panel.transitionCaption),
      characters: textList(panel.characters),
      location: text(panel.location),
      action: text(panel.action),
      emotion: text(panel.emotion),
      shotSize: text(panel.shotSize),
      cameraAngle: text(panel.cameraAngle),
      composition: text(panel.composition),
      lighting: text(panel.lighting),
      continuity: textList(panel.continuity),
      prompt: text(panel.prompt),
      negativePrompt: text(panel.negativePrompt),
      narration: text(panel.narration),
      dialogue: text(panel.dialogue),
      provenance: textList(panel.provenance).map(provenance)
    };
  }).sort((left, right) => left.order - right.order);
}

export function normalizeColdRead(value: unknown): ColdReadReport {
  const source = record(value);
  return {
    passed: boolean(source.passed),
    score: score(source.score),
    retelling: text(source.retelling),
    understoodCharacters: concreteTextList(source.understoodCharacters),
    understoodTimeline: concreteTextList(source.understoodTimeline),
    unclearPoints: textList(source.unclearPoints),
    missingLinks: textList(source.missingLinks)
  };
}

export function normalizeAudit(value: unknown): AuditReport {
  const source = record(value);
  const checks = record(source.checks);
  return {
    score: score(source.score),
    summary: text(source.summary, "审核已完成"),
    coldRead: normalizeColdRead(source.coldRead),
    autoRevisionApplied: boolean(source.autoRevisionApplied),
    issues: list(source.issues).map((item, index): AuditIssue => {
      const issue = record(item);
      const rawSeverity = text(issue.severity).toUpperCase();
      const severity: AuditIssue["severity"] = rawSeverity === "P0" || rawSeverity === "P1" ? rawSeverity : "P2";
      return {
        id: id(issue.id, "issue", index),
        severity,
        target: text(issue.target, "Prompt Pack"),
        message: text(issue.message),
        suggestion: text(issue.suggestion)
      };
    }),
    checks: {
      narrativeComprehension: score(checks.narrativeComprehension),
      causalCompleteness: score(checks.causalCompleteness, score(checks.continuity)),
      chronologyLegibility: score(checks.chronologyLegibility, score(checks.continuity)),
      characterClarity: score(checks.characterClarity, score(checks.visualClarity)),
      faithfulness: score(checks.faithfulness),
      continuity: score(checks.continuity),
      visualClarity: score(checks.visualClarity),
      promptQuality: score(checks.promptQuality)
    }
  };
}

export function normalizeAiEditProposal(
  target: AiEditProposal["target"],
  value: unknown
): AiEditProposal {
  const source = record(value);
  const revised = source.revisedArtifact;
  return {
    target,
    summary: text(source.summary, "AI 已生成修改建议"),
    rationale: text(source.rationale),
    changes: list(source.changes).map((item) => {
      const change = record(item);
      return {
        field: text(change.field, "未指定字段"),
        before: text(change.before),
        after: text(change.after),
        reason: text(change.reason)
      };
    }),
    revisedArtifact: target === "bible"
      ? normalizeStoryBible(revised)
      : target === "adaptation"
        ? normalizeAdaptation(revised)
        : normalizePanels(revised)
  };
}
