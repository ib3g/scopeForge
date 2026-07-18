import { z } from "zod";

export const CitationSchema = z.object({
  sourceId: z.string(),
  paragraphId: z.string(),
  excerpt: z.string(),
  excerptLocale: z.string().nullable(),
  translatedExcerpt: z.string().nullable(),
});

export const FindingSchema = z.object({
  id: z.string(),
  category: z.enum(["goal", "user", "requirement", "constraint", "inclusion", "exclusion", "assumption", "unknown"]),
  statement: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceType: z.enum(["explicit", "inferred", "confirmed", "complementary", "conflicting"]),
  citations: z.array(CitationSchema).min(1),
});

export const SourceContributionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  topic: z.string(),
  contribution: z.string(),
  relation: z.enum(["introduces", "complements", "confirms", "duplicates", "refines", "conflicts"]),
  relatedFindingIds: z.array(z.string()),
  citations: z.array(CitationSchema).min(1),
});

export const InconsistencySchema = z.object({
  id: z.string(),
  topic: z.string(),
  description: z.string(),
  sides: z.array(z.object({ statement: z.string(), citations: z.array(CitationSchema) })).min(2),
  severity: z.enum(["high", "medium", "low"]),
  status: z.enum(["open", "resolved", "accepted_as_assumption"]),
  resolution: z.string().nullable(),
});

export const ProjectAnalysisSchema = z.object({
  executiveSummary: z.string(),
  coverageScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  sourceContributions: z.array(SourceContributionSchema),
  duplicatesMerged: z.array(z.object({ statement: z.string(), citationCount: z.number().int().positive() })),
  inconsistencies: z.array(InconsistencySchema),
  suggestedNextStep: z.string(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  priority: z.enum(["blocking", "framing", "optional"]),
  rationale: z.string(),
  estimationImpact: z.string(),
  citations: z.array(CitationSchema),
  status: z.enum(["open", "answered", "deferred", "ignored"]),
  answer: z.string().nullable(),
});
export const QuestionsSchema = z.object({ questions: z.array(QuestionSchema).max(8) });

export const ScopeModuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["included", "optional", "excluded", "deferred"]),
  features: z.array(z.string()),
  dependencies: z.array(z.string()),
  assumptions: z.array(z.string()),
  citations: z.array(CitationSchema),
});
export const WorkstreamSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  order: z.number().int(),
  modules: z.array(ScopeModuleSchema),
});
export const ScopeSchema = z.object({ workstreams: z.array(WorkstreamSchema) });

export const EstimateLineSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  low: z.number().nonnegative(),
  likely: z.number().nonnegative(),
  high: z.number().nonnegative(),
  confidence: z.enum(["high", "medium", "low"]),
  risk: z.enum(["high", "medium", "low"]),
  rationale: z.string(),
  manualOverride: z.boolean(),
  updatedBy: z.enum(["ai", "user"]),
}).refine((line) => line.low <= line.likely && line.likely <= line.high, {
  message: "Effort must satisfy low ≤ likely ≤ high",
});
export const EstimateProposalSchema = z.object({ lines: z.array(EstimateLineSchema) });

export const ChangeProposalSchema = z.object({
  id: z.string(),
  targetType: z.literal("estimate_line"),
  targetId: z.string(),
  before: EstimateLineSchema,
  after: EstimateLineSchema,
  explanation: z.string(),
  status: z.enum(["pending", "accepted", "rejected"]),
});

export type Citation = z.infer<typeof CitationSchema>;
export type ProjectAnalysis = z.infer<typeof ProjectAnalysisSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type ScopeModule = z.infer<typeof ScopeModuleSchema>;
export type Workstream = z.infer<typeof WorkstreamSchema>;
export type EstimateLine = z.infer<typeof EstimateLineSchema>;
export type ChangeProposal = z.infer<typeof ChangeProposalSchema>;

export type SourceParagraph = { id: string; text: string };
export type SourceLanguage = {
  detectedLocale: string | null;
  confidence: number | null;
  isMultilingual: boolean;
  userOverride: string | null;
  method: "local_heuristic" | "manual" | "unknown";
};
export type ProjectSource = {
  id: string;
  title: string;
  kind: "pasted_text" | "markdown";
  origin: string;
  content: string;
  paragraphs: SourceParagraph[];
  language: SourceLanguage;
};
export type Decision = {
  id: string;
  sourceQuestionId?: string;
  statement: string;
  kind: "client_answer" | "internal_assumption" | "manual_override";
  createdAt: string;
};
export type ProjectStatus = "draft" | "sources_ready" | "analyzed" | "clarifying" | "scoped" | "estimated" | "ready_to_export";
export type ProjectLanguage = "auto" | "en" | "fr" | (string & {});
export type ClientOutputLanguage = "same_as_project" | "en" | "fr" | (string & {});
export type DeliverableType = "internal_estimate" | "client_summary" | "commercial_proposal" | "functional_appendix" | "raw_export";
export type EstimationPreferences = {
  teamSize: number;
  productiveDaysPerMonth: number;
  includeReserveInOptions: boolean;
  rounding: 0.5 | 1 | 5;
  showEffortInClient: boolean;
  commercialModel: "fixed_price" | "time_and_materials";
  deliverableType: DeliverableType;
};
export type Activity = { id: string; label: string; createdAt: string; kind?: "decision" | "language" | "estimate" | "ai_proposal" | "export" | "project" | "source"; before?: string | null; after?: string | null };
export type AIExecution = { mode: "openai" | "demo_fallback"; model: string };
export type AnalysisVersion = { id: string; locale: string; analysis: ProjectAnalysis; createdAt: string };

export type WorkspaceState = {
  project: {
    id: string;
    name: string;
    clientName: string;
    sector: string;
    description: string;
    status: ProjectStatus;
    estimationUnit: "day" | "hour";
    currency: string;
    contingencyRate: number;
    projectLanguage: ProjectLanguage;
    resolvedProjectLanguage: string | null;
    projectLanguageConfirmed: boolean;
    clientOutputLanguage: ClientOutputLanguage;
    preferences: EstimationPreferences;
    createdAt: string;
    updatedAt: string;
    archivedAt: string | null;
  };
  sources: ProjectSource[];
  analysis?: ProjectAnalysis;
  questions: Question[];
  decisions: Decision[];
  workstreams: Workstream[];
  estimateLines: EstimateLine[];
  changeProposal?: ChangeProposal;
  activity: Activity[];
  analysisVersions: AnalysisVersion[];
  aiExecution?: AIExecution;
};
