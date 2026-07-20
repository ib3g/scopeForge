import { describe, expect, it } from "vitest";
import {
  currentSourceChecksum,
  readinessFor,
  validationWarnings,
} from "./project-lifecycle";
import {
  createInitialState,
  demoAnalysis,
  demoEstimateLines,
  demoQuestions,
  demoWorkstreams,
} from "@/infrastructure/demo-data";
import type { EstimateSnapshot, WorkspaceState } from "./schemas";

function readyState(): WorkspaceState {
  const base = createInitialState();
  const state: WorkspaceState = {
    ...base,
    analysis: demoAnalysis,
    questions: demoQuestions.map((question) => ({ ...question, status: "deferred", answer: null })),
    decisions: [{ id: "D-1", statement: "Launch assumptions are recorded.", kind: "internal_assumption", createdAt: new Date().toISOString() }],
    workstreams: demoWorkstreams,
    estimateLines: demoEstimateLines,
    acknowledgedValidationWarnings: [],
    estimateSnapshots: [],
    approvedEstimateSnapshotId: null,
    proposalSnapshot: null,
  };
  return state;
}

describe("project lifecycle readiness", () => {
  it("replaces the unreachable 80% state with an explicit approval milestone", () => {
    const state = readyState();
    const readiness = readinessFor(state);
    expect(readiness.progress).toBeLessThan(100);
    expect(readiness.milestones.find((item) => item.id === "approval")?.state).toBe("todo");
    expect(readiness.canApproveEstimate).toBe(true);
  });

  it("reaches 100% only after approval and proposal generation", () => {
    const state = readyState();
    const snapshot: EstimateSnapshot = {
      id: "EST-1",
      createdAt: new Date().toISOString(),
      author: "Local user",
      status: "approved",
      origin: "generated",
      reason: null,
      parentSnapshotId: null,
      validatedAt: new Date().toISOString(),
      supersededAt: null,
      methodId: state.project.estimationMethodId,
      methodOverrides: {},
      estimationUnit: state.project.estimationUnit,
      contingencyRate: state.project.contingencyRate,
      preferences: state.project.preferences,
      totals: {
        base: { low: 1, likely: 2, high: 3 },
        reserve: { low: 0, likely: 0, high: 0 },
        proposed: { low: 1, likely: 2, high: 3 },
        options: { low: 0, likely: 0, high: 0 },
      },
      estimateLines: state.estimateLines,
      workstreams: state.workstreams,
      assumptions: [],
      decisions: state.decisions,
      referenceCaseIds: [],
      sourceVersions: [],
      sourceChecksum: currentSourceChecksum(state),
      aiExecutions: {},
      revision: 1,
    };
    const approved = {
      ...state,
      approvedEstimateSnapshotId: snapshot.id,
      estimateSnapshots: [snapshot],
      proposalSnapshot: { id: "PROP-1", estimateSnapshotId: snapshot.id, generatedAt: snapshot.createdAt, clientOutputLanguage: "en" },
    };
    expect(readinessFor(approved).progress).toBe(100);
    expect(readinessFor(approved).canGenerateProposal).toBe(true);
  });

  it("keeps blocking questions actionable while allowing acknowledged warnings", () => {
    const state = readyState();
    state.questions = state.questions.map((question, index) => index === 0 ? { ...question, status: "open" } : question);
    expect(validationWarnings(state).some((warning) => warning.id === "blocking-questions" && warning.severity === "blocking")).toBe(true);
    const acknowledged = { ...state, questions: state.questions.map((question) => ({ ...question, status: "deferred" as const })), acknowledgedValidationWarnings: ["no-reference-case"] };
    expect(readinessFor(acknowledged).canApproveEstimate).toBe(true);
  });
});
