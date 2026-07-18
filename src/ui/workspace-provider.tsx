"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { EstimateLine, EstimationPreferences, ProjectAnalysis, ProjectSource, Question, SourceLanguage, WorkspaceState, Workstream } from "@/domain/schemas";
import { determineDominantLanguage } from "@/domain/language";
import { createInitialState, demoAnalysis, demoEstimateLines, demoQuestions, demoWorkstreams, makeDemoChangeProposal } from "@/infrastructure/demo-data";
import { createFrenchDemoState, frenchDemoAnalysis, frenchDemoEstimateLines, frenchDemoQuestions, frenchDemoWorkstreams, makeFrenchDemoChangeProposal } from "@/infrastructure/demo-data-fr";
import { normalizeWorkspaceState, projectRepository, resolvedClientLanguage } from "@/infrastructure/project-repository";
import { answerQuestion, createProposal, resolveChangeProposal, updateChangeProposalAfter, updateEstimateLine, updateModuleStatus, updateQuestionStatus } from "@/use-cases/workspace";
import { normalizeSource } from "@/domain/source";
import { validateRange } from "@/domain/estimation";
import { useI18n } from "@/i18n";

type AIAction = "analysis" | "questions" | "scope" | "estimate" | "review";
type ProjectSettingsPatch = Partial<Pick<WorkspaceState["project"], "name" | "clientName" | "sector" | "projectLanguage" | "clientOutputLanguage" | "estimationUnit" | "currency" | "contingencyRate">>;

type WorkspaceContextValue = {
  state: WorkspaceState;
  hydrated: boolean;
  busy?: AIAction;
  error?: string;
  reset: () => void;
  addSource: (title: string, content: string, kind: ProjectSource["kind"]) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, content: string) => void;
  updateSourceLanguage: (id: string, override: string | null) => void;
  runAnalysis: () => Promise<void>;
  generateQuestions: () => Promise<void>;
  respond: (id: string, answer: string) => void;
  setQuestionStatus: (id: string, status: Question["status"]) => void;
  buildScope: () => Promise<void>;
  generateEstimate: () => Promise<void>;
  changeModuleStatus: (id: string, status: Workstream["modules"][number]["status"]) => void;
  editEstimate: (id: string, patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>) => boolean;
  setContingency: (rate: number) => void;
  updateProjectSettings: (patch: ProjectSettingsPatch) => void;
  updateEstimationPreferences: (patch: Partial<EstimationPreferences>) => void;
  reviewLine: (line: EstimateLine) => Promise<void>;
  editProposalAfter: (patch: Partial<Pick<EstimateLine, "low" | "likely" | "high">>) => boolean;
  resolveProposal: (accepted: boolean) => void;
  recordExport: (kind: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const templateFor = (projectId: string) => projectId === "demo-fr" ? createFrenchDemoState() : createInitialState();

export function WorkspaceProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const { locale: interfaceLocale, t } = useI18n();
  const [state, setState] = useState<WorkspaceState>(() => {
    const template = templateFor(projectId);
    return projectId === template.project.id ? template : normalizeWorkspaceState({ ...template, project: { ...template.project, id: projectId, name: "Untitled project", status: "draft" }, sources: [] }, projectId);
  });
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState<AIAction>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = projectRepository.get(projectId);
      if (stored) setState(stored);
      else projectRepository.save(state);
      setHydrated(true);
    });
    return () => { cancelled = true; };
    // state is intentionally the initial template only during hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => { if (hydrated) projectRepository.save(state); }, [hydrated, state]);

  const resolveWorkingLanguage = useCallback((current: WorkspaceState) => {
    if (current.project.projectLanguage !== "auto") return current.project.projectLanguage;
    if (current.project.projectLanguageConfirmed && current.project.resolvedProjectLanguage) return current.project.resolvedProjectLanguage;
    return determineDominantLanguage(current.sources, current.decisions.map((decision) => decision.statement)) ?? current.project.resolvedProjectLanguage ?? interfaceLocale;
  }, [interfaceLocale]);

  const languageContext = useCallback((current: WorkspaceState, resolved = resolveWorkingLanguage(current)) => ({
    interfaceLocale,
    projectLanguage: resolved,
    clientOutputLanguage: resolvedClientLanguage({ ...current, project: { ...current.project, resolvedProjectLanguage: resolved } }),
    sources: current.sources.map((source) => ({ id: source.id, detectedLocale: source.language.detectedLocale, userOverride: source.language.userOverride, isMultilingual: source.language.isMultilingual, confidence: source.language.confidence })),
  }), [interfaceLocale, resolveWorkingLanguage]);

  const callAI = useCallback(async <T,>(action: AIAction, payload: Record<string, unknown>, fallback: T, current: WorkspaceState, resolved?: string): Promise<{ data: T; mode: "openai" | "demo_fallback"; model: string }> => {
    setBusy(action); setError(undefined);
    try {
      const response = await fetch(`/api/ai/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, languageContext: languageContext(current, resolved) }) });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "AI request failed");
      return await response.json() as { data: T; mode: "openai" | "demo_fallback"; model: string };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI request failed");
      return { data: fallback, mode: "demo_fallback", model: "precomputed-demo" };
    } finally { setBusy(undefined); }
  }, [languageContext]);

  const addActivity = (current: WorkspaceState, label: string, kind: NonNullable<WorkspaceState["activity"][number]["kind"]>, before: string | null = null, after: string | null = null) => [...current.activity, { id: `A-${Date.now()}`, label, kind, before, after, createdAt: new Date().toISOString() }];

  const value = useMemo<WorkspaceContextValue>(() => ({
    state, hydrated, busy, error,
    reset: () => { const next = templateFor(projectId); projectRepository.save(next); setState(next); setError(undefined); },
    addSource: (title, content, kind) => setState((current) => {
      const nextNumber = Math.max(0, ...current.sources.map((source) => Number(source.id.replace("SRC-", "")) || 0)) + 1;
      const id = `SRC-${String(nextNumber).padStart(2, "0")}`;
      const source = { ...normalizeSource(id, title, `Imported ${kind === "markdown" ? "Markdown" : "text"}`, content), kind };
      return { ...current, sources: [...current.sources, source], analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: "sources_ready" }, activity: addActivity(current, `${title} imported`, "source") };
    }),
    removeSource: (id) => setState((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== id), analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: current.sources.length <= 1 ? "draft" : "sources_ready" }, activity: addActivity(current, "Source removed", "source") })),
    updateSource: (id, content) => setState((current) => ({ ...current, sources: current.sources.map((source) => {
      if (source.id !== id) return source;
      const normalized = normalizeSource(source.id, source.title, source.origin, content);
      return { ...normalized, kind: source.kind, language: { ...normalized.language, userOverride: source.language.userOverride, method: source.language.userOverride ? "manual" : normalized.language.method } as SourceLanguage };
    }), analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, project: { ...current.project, status: "sources_ready" } })),
    updateSourceLanguage: (id, override) => setState((current) => ({ ...current, sources: current.sources.map((source) => source.id === id ? { ...source, language: { ...source.language, userOverride: override, method: override ? "manual" : source.language.detectedLocale ? "local_heuristic" : "unknown" } } : source), activity: addActivity(current, `Source language ${override ?? "auto"}`, "language", null, override) })),
    runAnalysis: async () => {
      const resolved = resolveWorkingLanguage(state);
      const fallback = resolved === "fr" ? frenchDemoAnalysis : demoAnalysis;
      const result = await callAI<ProjectAnalysis>("analysis", { sources: state.sources }, fallback, state, resolved);
      setState((current) => ({ ...current, analysis: result.data, analysisVersions: current.analysis ? [...current.analysisVersions, { id: `AV-${Date.now()}`, locale: current.project.resolvedProjectLanguage ?? resolved, analysis: current.analysis, createdAt: new Date().toISOString() }] : current.analysisVersions, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "analyzed", resolvedProjectLanguage: resolved, projectLanguageConfirmed: true }, activity: addActivity(current, resolved === "fr" ? "Analyse multi-source terminée" : "Multi-source analysis completed", "language", current.project.resolvedProjectLanguage, resolved) }));
    },
    generateQuestions: async () => { const resolved = resolveWorkingLanguage(state); const fallback = { questions: resolved === "fr" ? frenchDemoQuestions : demoQuestions }; const result = await callAI<{ questions: Question[] }>("questions", { analysis: state.analysis, sources: state.sources }, fallback, state, resolved); setState((current) => ({ ...current, questions: result.data.questions, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "clarifying" } })); },
    respond: (id, answer) => setState((current) => answerQuestion(current, id, answer)),
    setQuestionStatus: (id, status) => setState((current) => updateQuestionStatus(current, id, status)),
    buildScope: async () => { const resolved = resolveWorkingLanguage(state); const fallback = { workstreams: resolved === "fr" ? frenchDemoWorkstreams : demoWorkstreams }; const result = await callAI<{ workstreams: Workstream[] }>("scope", { analysis: state.analysis, decisions: state.decisions, sources: state.sources }, fallback, state, resolved); setState((current) => ({ ...current, workstreams: result.data.workstreams, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "scoped" } })); },
    generateEstimate: async () => { const resolved = resolveWorkingLanguage(state); const fallback = { lines: resolved === "fr" ? frenchDemoEstimateLines : demoEstimateLines }; const result = await callAI<{ lines: EstimateLine[] }>("estimate", { workstreams: state.workstreams, sources: state.sources, estimationUnit: state.project.estimationUnit }, fallback, state, resolved); setState((current) => ({ ...current, estimateLines: result.data.lines, aiExecution: { mode: result.mode, model: result.model }, project: { ...current.project, status: "estimated" }, activity: addActivity(current, "Estimate generated", "estimate") })); },
    changeModuleStatus: (id, status) => setState((current) => updateModuleStatus(current, id, status)),
    editEstimate: (id, patch) => {
      const line = state.estimateLines.find((item) => item.id === id);
      if (!line) return false;
      const candidate = { ...line, ...patch };
      if (!validateRange(candidate.low, candidate.likely, candidate.high)) { setError(t("errors.invalidRange")); return false; }
      setError(undefined); setState((current) => updateEstimateLine(current, id, patch)); return true;
    },
    setContingency: (rate) => setState((current) => ({ ...current, project: { ...current.project, contingencyRate: rate }, activity: addActivity(current, "Reserve changed", "estimate", String(current.project.contingencyRate), String(rate)) })),
    updateProjectSettings: (patch) => setState((current) => {
      const beforeLanguage = current.project.projectLanguage;
      const explicit = patch.projectLanguage && patch.projectLanguage !== "auto" ? patch.projectLanguage : null;
      return { ...current, project: { ...current.project, ...patch, resolvedProjectLanguage: explicit ?? current.project.resolvedProjectLanguage, projectLanguageConfirmed: explicit ? true : patch.projectLanguage === "auto" ? false : current.project.projectLanguageConfirmed }, activity: patch.projectLanguage && patch.projectLanguage !== beforeLanguage ? addActivity(current, `Project language changed to ${patch.projectLanguage}`, "language", beforeLanguage, patch.projectLanguage) : current.activity };
    }),
    updateEstimationPreferences: (patch) => setState((current) => ({ ...current, project: { ...current.project, preferences: { ...current.project.preferences, ...patch } }, activity: addActivity(current, "Estimation preferences updated", "estimate") })),
    reviewLine: async (line) => { const resolved = resolveWorkingLanguage(state); const fallback = resolved === "fr" ? makeFrenchDemoChangeProposal(line) : makeDemoChangeProposal(line); const result = await callAI("review", { line, workstreams: state.workstreams, sources: state.sources }, fallback, state, resolved); setState((current) => createProposal({ ...current, aiExecution: { mode: result.mode, model: result.model } }, result.data as typeof fallback)); },
    editProposalAfter: (patch) => {
      if (!state.changeProposal) return false;
      const candidate = { ...state.changeProposal.after, ...patch };
      if (!validateRange(candidate.low, candidate.likely, candidate.high)) { setError(t("errors.invalidProposalRange")); return false; }
      setError(undefined); setState((current) => updateChangeProposalAfter(current, patch)); return true;
    },
    resolveProposal: (accepted) => setState((current) => resolveChangeProposal(current, accepted)),
    recordExport: (kind) => setState((current) => ({ ...current, activity: addActivity(current, `${kind} export generated`, "export") })),
  }), [state, hydrated, busy, error, projectId, callAI, resolveWorkingLanguage, t]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
