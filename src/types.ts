export type CreativeMode = "faithful" | "adapted" | "artistic";

export interface PipelineRequest {
  title: string;
  sourceText: string;
  mode: CreativeMode;
  panelCount: number;
  style: string;
  lockedFacts: string[];
}

export interface Character {
  id: string;
  name: string;
  role: string;
  appearance: string[];
  personality: string[];
  visualMotifs: string[];
  lockedFacts: string[];
}

export interface Location {
  id: string;
  name: string;
  description: string;
  fixedElements: string[];
}

export interface TimelineEvent {
  id: string;
  summary: string;
  sourceExcerpt: string;
  participants: string[];
}

export interface StoryBible {
  logline: string;
  themes: string[];
  narrativeVoice: string;
  characters: Character[];
  locations: Location[];
  timeline: TimelineEvent[];
  lockedFacts: string[];
  ambiguities: string[];
}

export interface AdaptationDecision {
  id: string;
  source: string;
  decision: string;
  reason: string;
  provenance: "SOURCE" | "INFERENCE" | "CREATIVE";
}

export interface AdaptationPlan {
  approach: string;
  pacing: string;
  visualStrategy: string;
  decisions: AdaptationDecision[];
}

export interface PromptCard {
  id: string;
  order: number;
  sourceExcerpt: string;
  storyPurpose: string;
  characters: string[];
  location: string;
  action: string;
  emotion: string;
  shotSize: string;
  cameraAngle: string;
  composition: string;
  lighting: string;
  continuity: string[];
  prompt: string;
  negativePrompt: string;
  narration: string;
  dialogue: string;
  provenance: Array<"SOURCE" | "INFERENCE" | "CREATIVE">;
}

export interface AuditIssue {
  id: string;
  severity: "P0" | "P1" | "P2";
  target: string;
  message: string;
  suggestion: string;
}

export interface AuditReport {
  score: number;
  summary: string;
  issues: AuditIssue[];
  checks: {
    faithfulness: number;
    continuity: number;
    visualClarity: number;
    promptQuality: number;
  };
}

export interface PipelineResult {
  projectId: string;
  createdAt: string;
  request: PipelineRequest;
  storyBible: StoryBible;
  adaptation: AdaptationPlan;
  panels: PromptCard[];
  audit: AuditReport;
  provider: string;
}

export type PipelineStage = "bible" | "adaptation" | "storyboard" | "audit" | "complete";
export type ArtifactStage = Exclude<PipelineStage, "complete">;

export interface PipelineArtifacts {
  storyBible?: StoryBible;
  adaptation?: AdaptationPlan;
  panels?: PromptCard[];
  audit?: AuditReport;
}

export interface PipelineStageResult {
  request: PipelineRequest;
  artifacts: PipelineArtifacts;
  completedStages: ArtifactStage[];
  provider: string;
}

export interface PipelineProgress {
  stage: PipelineStage;
  percent: number;
  message: string;
}

export interface PipelineJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: PipelineProgress;
  provider: string;
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  result?: PipelineResult;
  stageResult?: PipelineStageResult;
  error?: string;
}

export interface AiEditChange {
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface AiEditProposal {
  target: "bible" | "adaptation" | "storyboard";
  summary: string;
  rationale: string;
  changes: AiEditChange[];
  revisedArtifact: StoryBible | AdaptationPlan | PromptCard[];
}

export interface ProviderConfig {
  provider: "demo" | "openai-compatible";
  model: string;
  selectedModel: string;
  baseUrl: string;
  apiKey: string;
  ready: boolean;
}
