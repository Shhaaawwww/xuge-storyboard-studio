import type { PipelineResult } from "./types";

function array<T>(value: T[] | T | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function strings(value: unknown): string[] {
  return array(value).map((item) => String(item).trim()).filter(Boolean);
}

/** Final browser-side guard for saved jobs and providers that return a scalar for a list field. */
export function normalizePipelineResult(result: PipelineResult): PipelineResult {
  const narrativeSpine = result.adaptation.narrativeSpine || {
    protagonist: "", setup: result.adaptation.approach || "", goal: "", obstacle: "", stakes: "",
    incitingIncident: "", turningPoint: "", resolution: "", centralQuestion: "",
    causalChain: [], indispensableFacts: []
  };
  const coldRead = result.audit.coldRead || {
    passed: false, score: 0, retelling: "", understoodCharacters: [], understoodTimeline: [], unclearPoints: [], missingLinks: []
  };
  const auditChecks = result.audit.checks || {
    narrativeComprehension: 0, causalCompleteness: 0, chronologyLegibility: 0, characterClarity: 0,
    faithfulness: 0, continuity: 0, visualClarity: 0, promptQuality: 0
  };
  return {
    ...result,
    storyBible: {
      ...result.storyBible,
      themes: strings(result.storyBible.themes),
      characters: array(result.storyBible.characters).map((character) => ({
        ...character,
        appearance: strings(character.appearance),
        personality: strings(character.personality),
        visualMotifs: strings(character.visualMotifs),
        lockedFacts: strings(character.lockedFacts)
      })),
      locations: array(result.storyBible.locations).map((location) => ({
        ...location,
        fixedElements: strings(location.fixedElements)
      })),
      timeline: array(result.storyBible.timeline).map((event) => ({
        ...event,
        participants: strings(event.participants)
      })),
      lockedFacts: strings(result.storyBible.lockedFacts),
      ambiguities: strings(result.storyBible.ambiguities)
    },
    adaptation: {
      ...result.adaptation,
      narrativeSpine: {
        ...narrativeSpine,
        causalChain: strings(narrativeSpine.causalChain),
        indispensableFacts: strings(narrativeSpine.indispensableFacts)
      },
      chronologyStrategy: result.adaptation.chronologyStrategy || "",
      sequences: array(result.adaptation.sequences).map((sequence, index) => ({
        ...sequence,
        id: sequence.id || `sequence-${index + 1}`,
        requiredInformation: strings(sequence.requiredInformation)
      })),
      decisions: array(result.adaptation.decisions)
    },
    panels: array(result.panels).map((panel, index) => ({
      ...panel,
      sequenceId: panel.sequenceId || "sequence-1",
      sequenceTitle: panel.sequenceTitle || "Main sequence",
      causeFromPrevious: panel.causeFromPrevious || "",
      readerLearns: panel.readerLearns || panel.storyPurpose || "",
      timeCard: panel.timeCard || "",
      locationCard: panel.locationCard || "",
      transitionCaption: panel.transitionCaption || "",
      order: panel.order || index + 1,
      characters: strings(panel.characters),
      continuity: strings(panel.continuity),
      provenance: array(panel.provenance)
    })),
    audit: {
      ...result.audit,
      coldRead: {
        ...coldRead,
        understoodCharacters: strings(coldRead.understoodCharacters),
        understoodTimeline: strings(coldRead.understoodTimeline),
        unclearPoints: strings(coldRead.unclearPoints),
        missingLinks: strings(coldRead.missingLinks)
      },
      autoRevisionApplied: Boolean(result.audit.autoRevisionApplied),
      checks: {
        narrativeComprehension: auditChecks.narrativeComprehension || 0,
        causalCompleteness: auditChecks.causalCompleteness || auditChecks.continuity || 0,
        chronologyLegibility: auditChecks.chronologyLegibility || auditChecks.continuity || 0,
        characterClarity: auditChecks.characterClarity || auditChecks.visualClarity || 0,
        faithfulness: auditChecks.faithfulness || 0,
        continuity: auditChecks.continuity || 0,
        visualClarity: auditChecks.visualClarity || 0,
        promptQuality: auditChecks.promptQuality || 0
      },
      issues: array(result.audit.issues)
    }
  };
}
