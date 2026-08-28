import { z } from "zod";

export const pipelineRequestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceText: z.string().trim().min(20).max(50_000),
  mode: z.enum(["faithful", "adapted", "artistic"]),
  panelCount: z.number().int().min(4).max(48),
  style: z.string().trim().min(2).max(300),
  lockedFacts: z.array(z.string().trim().min(1)).max(30)
});

export type ValidPipelineRequest = z.infer<typeof pipelineRequestSchema>;

export const artifactStageSchema = z.enum(["bible", "adaptation", "storyboard", "audit"]);

export const stageJobRequestSchema = z.object({
  projectId: z.string().uuid().optional(),
  request: pipelineRequestSchema,
  startStage: artifactStageSchema,
  endStage: artifactStageSchema,
  artifacts: z.object({
    storyBible: z.unknown().optional(),
    adaptation: z.unknown().optional(),
    panels: z.unknown().optional(),
    audit: z.unknown().optional()
  }).default({})
});

export const aiEditRequestSchema = z.object({
  request: pipelineRequestSchema,
  target: z.enum(["bible", "adaptation", "storyboard"]),
  instruction: z.string().trim().min(2).max(2_000),
  artifact: z.unknown(),
  context: z.object({
    storyBible: z.unknown().optional(),
    adaptation: z.unknown().optional()
  }).default({})
});
