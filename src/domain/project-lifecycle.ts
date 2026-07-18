import { calculateTotals, validateRange, type EstimateTotals } from "./estimation";
import type { ProjectStatus, WorkspaceState } from "./schemas";

export type ProjectMilestoneId =
  | "sources"
  | "analysis"
  | "questions"
  | "scope"
  | "estimate"
  | "approval"
  | "proposal";

export type MilestoneState = "complete" | "in_progress" | "todo" | "attention" | "optional";

export type ProjectMilestone = {
  id: ProjectMilestoneId;
  state: MilestoneState;
  required: boolean;
  label: string;
  description: string;
  href: string;
};

export type ValidationWarning = {
  id: string;
  severity: "blocking" | "warning";
  message: string;
  acknowledged: boolean;
};

export type ProjectReadiness = {
  milestones: ProjectMilestone[];
  completedRequired: number;
  totalRequired: number;
  progress: number;
  warnings: ValidationWarning[];
  canApproveEstimate: boolean;
  canGenerateProposal: boolean;
};

export function sourceChecksum(value: string) {
  // A synchronous, deterministic checksum is sufficient for local revision guards.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function currentSourceVersions(state: WorkspaceState) {
  return state.sources.map((source) => ({
    sourceId: source.id,
    checksum: sourceChecksum(`${source.id}\n${source.content}`),
  }));
}

export function currentSourceChecksum(state: WorkspaceState) {
  return sourceChecksum(
    currentSourceVersions(state)
      .map((item) => `${item.sourceId}:${item.checksum}`)
      .join("\n"),
  );
}

export function hasValidEstimate(state: WorkspaceState) {
  const modules = state.workstreams.flatMap((workstream) => workstream.modules);
  return (
    state.estimateLines.length > 0 &&
    state.estimateLines.every((line) => validateRange(line.low, line.likely, line.high)) &&
    state.estimateLines.every((line) => modules.some((module) => module.id === line.moduleId))
  );
}

function hasBlockingQuestions(state: WorkspaceState) {
  return state.questions.some(
    (question) => question.priority === "blocking" && question.status === "open",
  );
}

function hasUnresolvedInconsistency(state: WorkspaceState) {
  return Boolean(
    state.analysis?.inconsistencies.some(
      (inconsistency) =>
        inconsistency.severity === "high" && inconsistency.status === "open",
    ),
  );
}

export function validationWarnings(state: WorkspaceState): ValidationWarning[] {
  const acknowledged = new Set(state.acknowledgedValidationWarnings);
  const warnings: ValidationWarning[] = [];
  if (hasBlockingQuestions(state)) {
    warnings.push({
      id: "blocking-questions",
      severity: "blocking",
      message: "Blocking clarification questions still need a decision.",
      acknowledged: false,
    });
  }
  if (hasUnresolvedInconsistency(state)) {
    warnings.push({
      id: "critical-inconsistency",
      severity: "blocking",
      message: "A high-severity inconsistency must be resolved or accepted as an assumption.",
      acknowledged: false,
    });
  }
  if (state.questions.some((question) => question.status === "open")) {
    warnings.push({
      id: "open-questions",
      severity: "warning",
      message: "Some non-blocking questions remain open.",
      acknowledged: acknowledged.has("open-questions"),
    });
  }
  if ((state.analysis?.inconsistencies.length ?? 0) > 0 && !hasUnresolvedInconsistency(state)) {
    warnings.push({
      id: "recognized-inconsistencies",
      severity: "warning",
      message: "Some inconsistencies have been resolved or explicitly accepted.",
      acknowledged: acknowledged.has("recognized-inconsistencies"),
    });
  }
  if (!state.referenceCaseIds.length) {
    warnings.push({
      id: "no-reference-case",
      severity: "warning",
      message: "No historical reference case was selected. This does not block approval.",
      acknowledged: acknowledged.has("no-reference-case"),
    });
  }
  return warnings;
}

export function readinessFor(state: WorkspaceState): ProjectReadiness {
  const warnings = validationWarnings(state);
  const questionsDone = state.questions.length > 0 && !hasBlockingQuestions(state);
  const estimateDone = hasValidEstimate(state);
  const approved = Boolean(
    state.approvedEstimateSnapshotId &&
      state.estimateSnapshots.some((snapshot) => snapshot.id === state.approvedEstimateSnapshotId),
  );
  const proposalDone = Boolean(state.proposalSnapshot && approved);
  const milestones: ProjectMilestone[] = [
    {
      id: "sources",
      state: state.sources.length ? "complete" : "todo",
      required: true,
      label: "sources",
      description: "sourcesCopy",
      href: `/projects/${state.project.id}/sources`,
    },
    {
      id: "analysis",
      state: state.analysis ? "complete" : state.sources.length ? "todo" : "in_progress",
      required: true,
      label: "analysis",
      description: "analysisCopy",
      href: `/projects/${state.project.id}/analysis`,
    },
    {
      id: "questions",
      state: questionsDone ? "complete" : state.analysis ? "attention" : "todo",
      required: true,
      label: "questions",
      description: "questionsCopy",
      href: `/projects/${state.project.id}/questions`,
    },
    {
      id: "scope",
      state: state.workstreams.length ? "complete" : state.analysis ? "todo" : "in_progress",
      required: true,
      label: "scope",
      description: "scopeCopy",
      href: `/projects/${state.project.id}/estimate`,
    },
    {
      id: "estimate",
      state: estimateDone ? "complete" : state.workstreams.length ? "todo" : "in_progress",
      required: true,
      label: "estimate",
      description: "estimateCopy",
      href: `/projects/${state.project.id}/estimate`,
    },
    {
      id: "approval",
      state: approved ? "complete" : estimateDone ? "todo" : "in_progress",
      required: true,
      label: "approval",
      description: "approvalCopy",
      href: `/projects/${state.project.id}/estimate`,
    },
    {
      id: "proposal",
      state: proposalDone ? "complete" : "todo",
      required: true,
      label: "proposal",
      description: "proposalCopy",
      href: `/projects/${state.project.id}/preview`,
    },
  ];
  const required = milestones.filter((milestone) => milestone.required);
  const completedRequired = required.filter((milestone) => milestone.state === "complete").length;
  const blockingWarnings = warnings.some((warning) => warning.severity === "blocking");
  const unacknowledgedWarnings = warnings.some(
    (warning) => warning.severity === "warning" && !warning.acknowledged,
  );
  const canApproveEstimate = estimateDone && !blockingWarnings && !unacknowledgedWarnings;
  return {
    milestones,
    completedRequired,
    totalRequired: required.length,
    progress: Math.round((completedRequired / required.length) * 100),
    warnings,
    canApproveEstimate,
    canGenerateProposal: approved,
  };
}

export function estimateTotalsForSnapshot(state: WorkspaceState): EstimateTotals {
  return calculateTotals(
    state.estimateLines,
    state.workstreams.flatMap((workstream) => workstream.modules),
    state.project.contingencyRate,
    state.project.preferences,
  );
}

export function lifecycleStatusFor(state: WorkspaceState): ProjectStatus {
  if (state.project.archivedAt) return "archived";
  const readiness = readinessFor(state);
  if (readiness.progress === 100) return "proposal_ready";
  if (state.approvedEstimateSnapshotId) return "internally_approved";
  if (hasValidEstimate(state)) return "in_review";
  if (state.workstreams.length) return "scope_ready";
  if (state.analysis) return "scope_ready";
  if (state.sources.length) return "draft";
  return "draft";
}
