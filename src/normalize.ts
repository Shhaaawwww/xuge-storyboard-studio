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
      decisions: array(result.adaptation.decisions)
    },
    panels: array(result.panels).map((panel) => ({
      ...panel,
      characters: strings(panel.characters),
      continuity: strings(panel.continuity),
      provenance: array(panel.provenance)
    })),
    audit: {
      ...result.audit,
      issues: array(result.audit.issues)
    }
  };
}
