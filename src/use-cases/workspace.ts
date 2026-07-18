import type { ChangeProposal, Decision, EstimateLine, Question, WorkspaceState, Workstream } from "@/domain/schemas";
import { EstimateLineSchema } from "@/domain/schemas";

export function answerQuestion(state: WorkspaceState, questionId: string, answer: string): WorkspaceState {
  const question = state.questions.find((item) => item.id === questionId);
  if (!question || !answer.trim()) return state;
  const decision: Decision = { id: `D-${Date.now()}`, sourceQuestionId: questionId, statement: answer.trim(), kind: "client_answer", createdAt: new Date().toISOString() };
  return { ...state, project: { ...state.project, status: "scope_ready" }, questions: state.questions.map((item) => item.id === questionId ? { ...item, status: "answered", answer: answer.trim() } : item), decisions: [...state.decisions, decision], activity: addActivity(state, "Clarification recorded as a decision", "decision", null, answer.trim()) };
}

export function updateQuestionStatus(state: WorkspaceState, questionId: string, status: Question["status"]): WorkspaceState {
  const before = state.questions.find((item) => item.id === questionId)?.status ?? null;
  return { ...state, questions: state.questions.map((item) => item.id === questionId ? { ...item, status } : item), activity: addActivity(state, `Question ${status}`, "decision", before, status) };
}

export function updateModuleStatus(state: WorkspaceState, moduleId: string, status: Workstream["modules"][number]["status"]): WorkspaceState {
  const before = state.workstreams.flatMap((workstream) => workstream.modules).find((module) => module.id === moduleId)?.status ?? null;
  return { ...state, workstreams: state.workstreams.map((workstream) => ({ ...workstream, modules: workstream.modules.map((module) => module.id === moduleId ? { ...module, status } : module) })), activity: addActivity(state, "Module status changed", "estimate", before, status) };
}

export function updateEstimateLine(state: WorkspaceState, id: string, patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>): WorkspaceState {
  const lines = state.estimateLines.map((line) => line.id === id ? EstimateLineSchema.parse({ ...line, ...patch, manualOverride: true, updatedBy: "user" }) : line);
  const before = state.estimateLines.find((line) => line.id === id);
  const after = lines.find((line) => line.id === id);
  return { ...state, estimateLines: lines, activity: addActivity(state, "Estimate manually updated", "estimate", before ? `${before.low}/${before.likely}/${before.high}` : null, after ? `${after.low}/${after.likely}/${after.high}` : null) };
}

export function resolveChangeProposal(state: WorkspaceState, accepted: boolean): WorkspaceState {
  const proposal = state.changeProposal;
  if (!proposal) return state;
  return { ...state, estimateLines: accepted ? state.estimateLines.map((line) => line.id === proposal.targetId ? { ...proposal.after, manualOverride: true, updatedBy: "user" } : line) : state.estimateLines, changeProposal: { ...proposal, status: accepted ? "accepted" : "rejected" }, activity: addActivity(state, `AI suggestion ${accepted ? "accepted" : "rejected"}`, "ai_proposal", `${proposal.before.low}/${proposal.before.likely}/${proposal.before.high}`, accepted ? `${proposal.after.low}/${proposal.after.likely}/${proposal.after.high}` : "rejected") };
}

export function createProposal(state: WorkspaceState, proposal: ChangeProposal): WorkspaceState {
  return { ...state, changeProposal: proposal, activity: addActivity(state, "AI estimate review proposed", "ai_proposal", `${proposal.before.low}/${proposal.before.likely}/${proposal.before.high}`, `${proposal.after.low}/${proposal.after.likely}/${proposal.after.high}`) };
}

export function updateChangeProposalAfter(state: WorkspaceState, patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>): WorkspaceState {
  if (!state.changeProposal || state.changeProposal.status !== "pending") return state;
  const after = EstimateLineSchema.parse({ ...state.changeProposal.after, ...patch, manualOverride: true, updatedBy: "user" });
  return { ...state, changeProposal: { ...state.changeProposal, after }, activity: addActivity(state, "AI proposal values edited") };
}

function addActivity(state: WorkspaceState, label: string, kind: NonNullable<WorkspaceState["activity"][number]["kind"]> = "project", before: string | null = null, after: string | null = null) {
  return [...state.activity, { id: `A-${Date.now()}`, label, kind, before, after, createdAt: new Date().toISOString() }];
}
