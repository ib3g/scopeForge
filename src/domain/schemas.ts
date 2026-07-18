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

export const ProvenanceKindSchema = z.enum([
  "project_source",
  "user_decision",
  "estimation_method",
  "reference_case",
  "ai_inference",
  "system_calculation",
]);

export const EstimationMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  primaryUnit: z.enum(["person_days", "hours", "fixed_price", "hybrid"]),
  workstreams: z.array(z.string()),
  roles: z.array(z.string()),
  referenceRate: z.number().nonnegative().nullable(),
  reserveRate: z.number().min(0).max(1),
  rounding: z.enum(["0.5", "1", "5"]),
  lowFactor: z.number().positive(),
  highFactor: z.number().positive(),
  assumptions: z.array(z.string()),
  includedPatterns: z.array(z.string()),
  optionalPatterns: z.array(z.string()),
  excludedPatterns: z.array(z.string()),
  language: z.string(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReferenceEstimateSchema = z.object({
  workstream: z.string(),
  low: z.number().nonnegative(),
  likely: z.number().nonnegative(),
  high: z.number().nonnegative(),
  unit: z.enum(["person_days", "hours", "fixed_price", "hybrid"]),
});

export const ReferenceCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  projectType: z.string(),
  sector: z.string(),
  summary: z.string(),
  features: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  estimates: z.array(ReferenceEstimateSchema),
  methodId: z.string(),
  decisions: z.array(z.string()),
  outcomes: z.array(z.string()),
  tags: z.array(z.string()),
  language: z.string(),
  date: z.string(),
  provenance: z.enum(["reference_case", "user_decision"]),
  status: z.enum(["active", "archived"]),
});

export const ReferenceMatchSchema = z.object({
  referenceId: z.string(),
  score: z.number().min(0).max(100),
  commonCriteria: z.array(z.string()),
  importantDifferences: z.array(z.string()),
  reusableLearning: z.array(z.string()),
  doNotTransfer: z.array(z.string()),
  explanation: z.string(),
});

export const ReferenceInfluenceSchema = z.object({
  id: z.string(),
  referenceId: z.string(),
  area: z.enum(["analysis", "scope", "estimate"]),
  statement: z.string(),
  provenance: z.literal("reference_case"),
  confidence: z.enum(["high", "medium", "low"]),
});

export const EstimationComparisonSchema = z.object({
  referenceId: z.string(),
  commonWorkstreams: z.array(z.string()),
  currentOnlyWorkstreams: z.array(z.string()),
  referenceOnlyWorkstreams: z.array(z.string()),
  currentTotals: z.object({ low: z.number(), likely: z.number(), high: z.number() }),
  referenceTotals: z.object({ low: z.number(), likely: z.number(), high: z.number() }),
  differences: z.array(z.string()),
  methodDifference: z.string().nullable(),
  riskNotes: z.array(z.string()),
});

export const ProjectAnalysisSchema = z.object({
  executiveSummary: z.string(),
  coverageScore: z.number().min(0).max(100),
  findings: z.array(FindingSchema),
  sourceContributions: z.array(SourceContributionSchema),
  duplicatesMerged: z.array(z.object({ statement: z.string(), citationCount: z.number().int().positive() })),
  inconsistencies: z.array(InconsistencySchema),
  suggestedNextStep: z.string(),
  referenceInfluences: z.array(ReferenceInfluenceSchema),
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
export type ProvenanceKind = z.infer<typeof ProvenanceKindSchema>;
export type EstimationMethod = z.infer<typeof EstimationMethodSchema>;
export type ReferenceEstimate = z.infer<typeof ReferenceEstimateSchema>;
export type ReferenceCase = z.infer<typeof ReferenceCaseSchema>;
export type ReferenceMatch = z.infer<typeof ReferenceMatchSchema>;
export type ReferenceInfluence = z.infer<typeof ReferenceInfluenceSchema>;
export type EstimationComparison = z.infer<typeof EstimationComparisonSchema>;

export type SourceParagraph = { id: string; text: string; page?: number };
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
  kind: "pasted_text" | "markdown" | "pdf" | "docx";
  origin: string;
  content: string;
  paragraphs: SourceParagraph[];
  language: SourceLanguage;
  document?: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    pages: number | null;
    sections: number | null;
    checksum: string;
    importedAt: string;
  };
};
export type Decision = {
  id: string;
  sourceQuestionId?: string;
  statement: string;
  kind: "client_answer" | "internal_assumption" | "manual_override";
  createdAt: string;
};
export type ProjectStatus =
  | "draft"
  | "analyzing"
  | "scope_ready"
  | "estimate_ready"
  | "in_review"
  | "internally_approved"
  | "proposal_ready"
  | "archived";
export type ProjectMode = "live" | "demo";
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
export type EstimationMethodOverrides = Partial<Pick<EstimationMethod, "primaryUnit" | "referenceRate" | "reserveRate" | "rounding" | "lowFactor" | "highFactor">>;
export type Activity = { id: string; label: string; createdAt: string; kind?: "decision" | "language" | "estimate" | "ai_proposal" | "export" | "project" | "source"; before?: string | null; after?: string | null };
export type AIAction = "analysis" | "questions" | "scope" | "estimate" | "review";
export type AiExecutionMode = "live" | "demo_precomputed" | "not_configured" | "requesting" | "error";
export type AiExecutionMetadata = {
  executionMode: "live" | "demo_precomputed";
  model: string | null;
  generatedAt: string;
  promptVersion: string;
  sourceChecksum: string;
  requestId?: string | null;
};
export type AIExecution = AiExecutionMetadata & { action: AIAction };
export type AnalysisVersion = { id: string; locale: string; analysis: ProjectAnalysis; execution?: AiExecutionMetadata; createdAt: string };
export type EstimateTotalsSnapshot = {
  base: { low: number; likely: number; high: number };
  reserve: { low: number; likely: number; high: number };
  proposed: { low: number; likely: number; high: number };
  options: { low: number; likely: number; high: number };
};
export type EstimateSnapshot = {
  id: string;
  createdAt: string;
  author: string;
  methodId: string | null;
  methodOverrides: EstimationMethodOverrides;
  totals: EstimateTotalsSnapshot;
  estimateLines: EstimateLine[];
  assumptions: string[];
  decisions: Decision[];
  sourceVersions: Array<{ sourceId: string; checksum: string }>;
  sourceChecksum: string;
  revision: number;
};
export type ProposalSnapshot = {
  id: string;
  estimateSnapshotId: string;
  generatedAt: string;
  clientOutputLanguage: string;
};

export type WorkspaceState = {
  project: {
    id: string;
    mode: ProjectMode;
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
    estimationMethodId: string | null;
    estimationMethodOverrides: EstimationMethodOverrides;
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
  aiExecutions: Partial<Record<AIAction, AiExecutionMetadata>>;
  referenceCaseIds: string[];
  referenceMatches: ReferenceMatch[];
  referenceInfluences: ReferenceInfluence[];
  estimationComparison?: EstimationComparison;
  estimateSnapshots: EstimateSnapshot[];
  approvedEstimateSnapshotId: string | null;
  proposalSnapshot: ProposalSnapshot | null;
  acknowledgedValidationWarnings: string[];
};
