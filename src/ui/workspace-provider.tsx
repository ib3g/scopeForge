"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { EstimateLine, ProjectAnalysis, ProjectSource, Question, WorkspaceState, Workstream } from "@/domain/schemas";
import { createInitialState, demoAnalysis, demoEstimateLines, demoQuestions, demoWorkstreams, makeDemoChangeProposal } from "@/infrastructure/demo-data";
import { answerQuestion, createProposal, resolveChangeProposal, updateEstimateLine, updateModuleStatus, updateQuestionStatus } from "@/use-cases/workspace";
import { normalizeSource } from "@/domain/source";
import { validateRange } from "@/domain/estimation";

const STORAGE_KEY = "scopeforge-morrow-ridge-v2";
type AIAction = "analysis" | "questions" | "scope" | "estimate" | "review";

type WorkspaceContextValue = {
  state: WorkspaceState;
  busy?: AIAction;
  error?: string;
  reset: () => void;
  addSource: (title: string, content: string, kind: ProjectSource["kind"]) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, content: string) => void;
  runAnalysis: () => Promise<void>;
  generateQuestions: () => Promise<void>;
  respond: (id: string, answer: string) => void;
  setQuestionStatus: (id: string, status: Question["status"]) => void;
  buildScope: () => Promise<void>;
  generateEstimate: () => Promise<void>;
  changeModuleStatus: (id: string, status: Workstream["modules"][number]["status"]) => void;
  editEstimate: (id: string, patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>) => boolean;
  setContingency: (rate: number) => void;
  reviewLine: (line: EstimateLine) => Promise<void>;
  resolveProposal: (accepted: boolean) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<AIAction>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try { setState(JSON.parse(stored) as WorkspaceState); } catch { localStorage.removeItem(STORAGE_KEY); }
      }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [hydrated, state]);

  const callAI = useCallback(async <T,>(action: AIAction, payload: unknown, fallback: T): Promise<{ data: T; mode: "openai" | "demo_fallback"; model: string }> => {
    setBusy(action); setError(undefined);
    try {
      const response = await fetch(`/api/ai/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "AI request failed");
      return await response.json() as { data: T; mode: "openai" | "demo_fallback"; model: string };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI request failed");
      return { data: fallback, mode: "demo_fallback", model: "precomputed-demo" };
    } finally { setBusy(undefined); }
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => ({
    state, busy, error,
    reset: () => { localStorage.removeItem(STORAGE_KEY); setState(createInitialState()); setError(undefined); },
    addSource: (title, content, kind) => setState((current) => {
      const nextNumber = Math.max(0, ...current.sources.map((source) => Number(source.id.replace("SRC-", "")) || 0)) + 1;
      const id = `SRC-${String(nextNumber).padStart(2, "0")}`;
      const source = { ...normalizeSource(id, title, `Imported ${kind === "markdown" ? "Markdown" : "text"}`, content), kind };
      return { ...current, sources: [...current.sources, source], analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: "sources_ready" }, activity: [...current.activity, { id: `A-${Date.now()}`, label: `${title} imported`, createdAt: new Date().toISOString() }] };
    }),
    removeSource: (id) => setState((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== id), analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: "sources_ready" } })),
    updateSource: (id, content) => setState((current) => ({ ...current, sources: current.sources.map((source) => source.id === id ? { ...normalizeSource(source.id, source.title, source.origin, content), kind: source.kind } : source), analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: "sources_ready" } })),
    runAnalysis: async () => { const result = await callAI<ProjectAnalysis>("analysis", { sources: state.sources }, demoAnalysis); setState((current) => ({ ...current, analysis: result.data, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "analyzed" }, activity: [...current.activity, { id: `A-${Date.now()}`, label: "Multi-source analysis completed", createdAt: new Date().toISOString() }] })); },
    generateQuestions: async () => { const result = await callAI<{ questions: Question[] }>("questions", { analysis: state.analysis, sources: state.sources }, { questions: demoQuestions }); setState((current) => ({ ...current, questions: result.data.questions, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "clarifying" } })); },
    respond: (id, answer) => setState((current) => answerQuestion(current, id, answer)),
    setQuestionStatus: (id, status) => setState((current) => updateQuestionStatus(current, id, status)),
    buildScope: async () => { const result = await callAI<{ workstreams: Workstream[] }>("scope", { analysis: state.analysis, decisions: state.decisions, sources: state.sources }, { workstreams: demoWorkstreams }); setState((current) => ({ ...current, workstreams: result.data.workstreams, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "scoped" } })); },
    generateEstimate: async () => { const result = await callAI<{ lines: EstimateLine[] }>("estimate", { workstreams: state.workstreams, sources: state.sources }, { lines: demoEstimateLines }); setState((current) => ({ ...current, estimateLines: result.data.lines, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "estimated" } })); },
    changeModuleStatus: (id, status) => setState((current) => updateModuleStatus(current, id, status)),
    editEstimate: (id, patch) => {
      const line = state.estimateLines.find((item) => item.id === id);
      if (!line) return false;
      const candidate = { ...line, ...patch };
      if (!validateRange(candidate.low, candidate.likely, candidate.high)) { setError("Values must satisfy low ≤ likely ≤ high."); return false; }
      setError(undefined); setState((current) => updateEstimateLine(current, id, patch)); return true;
    },
    setContingency: (rate) => setState((current) => ({ ...current, project: { ...current.project, contingencyRate: rate } })),
    reviewLine: async (line) => { const fallback = makeDemoChangeProposal(line); const result = await callAI("review", { line, workstreams: state.workstreams, sources: state.sources }, fallback); setState((current) => createProposal({ ...current, aiExecution: { mode: result.mode, model: result.model } }, result.data as typeof fallback)); },
    resolveProposal: (accepted) => setState((current) => resolveChangeProposal(current, accepted)),
  }), [state, busy, error, callAI]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
