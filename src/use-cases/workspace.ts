import type { ChangeProposal, Decision, EstimateLine, Question, WorkspaceState, Workstream } from "@/domain/schemas";
import { EstimateLineSchema } from "@/domain/schemas";

export function answerQuestion(state: WorkspaceState, questionId: string, answer: string): WorkspaceState {
  const question = state.questions.find((item) => item.id === questionId);
  if (!question || !answer.trim()) return state;
  const decision: Decision = { id: `D-${Date.now()}`, sourceQuestionId: questionId, statement: answer.trim(), kind: "client_answer", createdAt: new Date().toISOString() };
  return { ...state, project: { ...state.project, status: "clarifying" }, questions: state.questions.map((item) => item.id === questionId ? { ...item, status: "answered", answer: answer.trim() } : item), decisions: [...state.decisions, decision], activity: addActivity(state, "Clarification recorded as a decision") };
}

export function updateQuestionStatus(state: WorkspaceState, questionId: string, status: Question["status"]): WorkspaceState {
  return { ...state, questions: state.questions.map((item) => item.id === questionId ? { ...item, status } : item), activity: addActivity(state, `Question ${status}`) };
}

export function updateModuleStatus(state: WorkspaceState, moduleId: string, status: Workstream["modules"][number]["status"]): WorkspaceState {
  return { ...state, workstreams: state.workstreams.map((workstream) => ({ ...workstream, modules: workstream.modules.map((module) => module.id === moduleId ? { ...module, status } : module) })), activity: addActivity(state, "Module status changed") };
}

export function updateEstimateLine(state: WorkspaceState, id: string, patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>): WorkspaceState {
  const lines = state.estimateLines.map((line) => line.id === id ? EstimateLineSchema.parse({ ...line, ...patch, manualOverride: true, updatedBy: "user" }) : line);
  return { ...state, estimateLines: lines, activity: addActivity(state, "Estimate manually updated") };
}

export function resolveChangeProposal(state: WorkspaceState, accepted: boolean): WorkspaceState {
  const proposal = state.changeProposal;
  if (!proposal) return state;
  return { ...state, estimateLines: accepted ? state.estimateLines.map((line) => line.id === proposal.targetId ? { ...proposal.after, manualOverride: true, updatedBy: "user" } : line) : state.estimateLines, changeProposal: { ...proposal, status: accepted ? "accepted" : "rejected" }, activity: addActivity(state, `AI suggestion ${accepted ? "accepted" : "rejected"}`) };
}

export function createProposal(state: WorkspaceState, proposal: ChangeProposal): WorkspaceState {
  return { ...state, changeProposal: proposal, activity: addActivity(state, "AI estimate review proposed") };
}

function addActivity(state: WorkspaceState, label: string) {
  return [...state.activity, { id: `A-${Date.now()}`, label, createdAt: new Date().toISOString() }];
}
