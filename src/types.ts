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

export interface NarrativeSpine {
  protagonist: string;
  setup: string;
  goal: string;
  obstacle: string;
  stakes: string;
  incitingIncident: string;
  turningPoint: string;
  resolution: string;
  centralQuestion: string;
  causalChain: string[];
  indispensableFacts: string[];
}

export interface AdaptationSequence {
  id: string;
  title: string;
  purpose: string;
  time: string;
  location: string;
  transitionIn: string;
  panelBudget: number;
  requiredInformation: string[];
}

export interface AdaptationPlan {
  narrativeSpine: NarrativeSpine;
  approach: string;
  pacing: string;
  visualStrategy: string;
  chronologyStrategy: string;
  sequences: AdaptationSequence[];
  decisions: AdaptationDecision[];
}

export interface PromptCard {
  id: string;
  order: number;
  sequenceId: string;
  sequenceTitle: string;
  sourceExcerpt: string;
  storyPurpose: string;
  causeFromPrevious: string;
  readerLearns: string;
  timeCard: string;
  locationCard: string;
  transitionCaption: string;
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

export interface ColdReadReport {
  passed: boolean;
  score: number;
  retelling: string;
  understoodCharacters: string[];
  understoodTimeline: string[];
  unclearPoints: string[];
  missingLinks: string[];
}

export interface AuditReport {
  score: number;
  summary: string;
  coldRead: ColdReadReport;
  autoRevisionApplied: boolean;
  issues: AuditIssue[];
  checks: {
    narrativeComprehension: number;
    causalCompleteness: number;
    chronologyLegibility: number;
    characterClarity: number;
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

export type PipelineJobStatus = "queued" | "running" | "completed" | "failed" | "interrupted";

export interface PipelineJob {
  id: string;
  projectId: string;
  kind: "full" | "stage";
  startStage: ArtifactStage;
  endStage: ArtifactStage;
  status: PipelineJobStatus;
  progress: PipelineProgress;
  provider: string;
  createdAt: string;
  startedAt: string;
  updatedAt: string;
  interruptedAt?: string;
  result?: PipelineResult;
  stageResult?: PipelineStageResult;
  error?: string;
}

export interface ArchivedProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedStages: ArtifactStage[];
  revisionStage: Exclude<ArtifactStage, "audit"> | null;
  workflowMode: "auto" | "guided";
  result: PipelineResult;
}

export interface ArchivedProjectSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  completedStages: ArtifactStage[];
  panelCount: number;
  requestedPanelCount: number;
  auditScore: number | null;
  provider: string;
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
