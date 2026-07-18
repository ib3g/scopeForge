import type { ClientOutputLanguage, ProjectLanguage, WorkspaceState } from "@/domain/schemas";
import { detectSourceLanguage } from "@/domain/language";
import { createInitialState } from "./demo-data";
import { createFrenchDemoState } from "./demo-data-fr";

const STORAGE_KEY = "scopeforge-projects-v3";
const LEGACY_KEY = "scopeforge-morrow-ridge-v2";

export type ProjectSummary = Pick<WorkspaceState["project"], "id" | "name" | "clientName" | "sector" | "status" | "projectLanguage" | "resolvedProjectLanguage" | "createdAt" | "updatedAt" | "archivedAt"> & { progress: number; sourceCount: number };

export interface ProjectRepository {
  list(): WorkspaceState[];
  get(id: string): WorkspaceState | null;
  save(state: WorkspaceState): void;
  remove(id: string): void;
}

function enhanceCitations(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(enhanceCitations);
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.sourceId === "string" && typeof record.paragraphId === "string" && typeof record.excerpt === "string") {
    if (!("excerptLocale" in record)) record.excerptLocale = null;
    if (!("translatedExcerpt" in record)) record.translatedExcerpt = null;
  }
  Object.values(record).forEach(enhanceCitations);
}

export function normalizeWorkspaceState(input: WorkspaceState, fallbackId?: string): WorkspaceState {
  const raw = structuredClone(input) as WorkspaceState;
  const template = fallbackId === "demo-fr" || raw.project?.id === "demo-fr" ? createFrenchDemoState() : createInitialState();
  const now = new Date().toISOString();
  raw.project = {
    ...template.project,
    ...raw.project,
    id: raw.project?.id || fallbackId || template.project.id,
    preferences: { ...template.project.preferences, ...(raw.project?.preferences ?? {}) },
    projectLanguage: raw.project?.projectLanguage ?? template.project.projectLanguage,
    resolvedProjectLanguage: raw.project?.resolvedProjectLanguage ?? template.project.resolvedProjectLanguage,
    projectLanguageConfirmed: raw.project?.projectLanguageConfirmed ?? template.project.projectLanguageConfirmed,
    clientOutputLanguage: raw.project?.clientOutputLanguage ?? template.project.clientOutputLanguage,
    createdAt: raw.project?.createdAt ?? now,
    updatedAt: raw.project?.updatedAt ?? now,
    archivedAt: raw.project?.archivedAt ?? null,
  };
  raw.sources = (raw.sources ?? []).map((source) => ({ ...source, language: source.language ?? detectSourceLanguage(source.content) }));
  raw.questions ??= [];
  raw.decisions ??= [];
  raw.workstreams ??= [];
  raw.estimateLines ??= [];
  raw.activity ??= [];
  raw.analysisVersions ??= [];
  enhanceCitations(raw);
  return raw;
}

class LocalProjectRepository implements ProjectRepository {
  private read(): WorkspaceState[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return (JSON.parse(stored) as WorkspaceState[]).map((state) => normalizeWorkspaceState(state)); }
      catch { localStorage.removeItem(STORAGE_KEY); }
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    let english = createInitialState();
    if (legacy) {
      try { english = normalizeWorkspaceState(JSON.parse(legacy) as WorkspaceState, "demo"); } catch { localStorage.removeItem(LEGACY_KEY); }
    }
    const seeded = [english, createFrenchDemoState()];
    this.write(seeded);
    return seeded;
  }
  private write(states: WorkspaceState[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(states)); }
  list() { return this.read(); }
  get(id: string) { return this.read().find((state) => state.project.id === id) ?? null; }
  save(state: WorkspaceState) {
    const normalized = normalizeWorkspaceState({ ...state, project: { ...state.project, updatedAt: new Date().toISOString() } });
    const states = this.read();
    const index = states.findIndex((item) => item.project.id === normalized.project.id);
    if (index >= 0) states[index] = normalized; else states.unshift(normalized);
    this.write(states);
  }
  remove(id: string) { this.write(this.read().filter((state) => state.project.id !== id)); }
}

export const projectRepository: ProjectRepository = new LocalProjectRepository();

function newProjectId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `project-${Date.now().toString(36)}-${suffix}`;
}

export function projectSummary(state: WorkspaceState): ProjectSummary {
  const complete = [state.sources.length > 0, !!state.analysis, state.decisions.length > 0, state.estimateLines.length > 0, state.project.status === "ready_to_export"].filter(Boolean).length;
  return { ...state.project, progress: Math.round(complete / 5 * 100), sourceCount: state.sources.length };
}

export function createEmptyProject(input: { name: string; clientName?: string; sector?: string; projectLanguage: ProjectLanguage; clientOutputLanguage: ClientOutputLanguage; estimationUnit: "day" | "hour"; currency: string; contingencyRate: number }): WorkspaceState {
  const now = new Date().toISOString();
  const id = newProjectId();
  const base = createInitialState();
  return normalizeWorkspaceState({
    ...base,
    project: { ...base.project, id, name: input.name.trim(), clientName: input.clientName?.trim() ?? "", sector: input.sector?.trim() ?? "", description: "", status: "draft", estimationUnit: input.estimationUnit, currency: input.currency, contingencyRate: input.contingencyRate, projectLanguage: input.projectLanguage, resolvedProjectLanguage: input.projectLanguage === "auto" ? null : input.projectLanguage, projectLanguageConfirmed: input.projectLanguage !== "auto", clientOutputLanguage: input.clientOutputLanguage, createdAt: now, updatedAt: now, archivedAt: null },
    sources: [], analysis: undefined, questions: [], decisions: [], workstreams: [], estimateLines: [], changeProposal: undefined, activity: [{ id: `A-${Date.now()}`, label: "Project created", createdAt: now, kind: "project" }], analysisVersions: [], aiExecution: undefined,
  });
}

export function duplicateProject(state: WorkspaceState): WorkspaceState {
  const now = new Date().toISOString();
  const id = newProjectId();
  return normalizeWorkspaceState({ ...structuredClone(state), project: { ...state.project, id, name: `${state.project.name} — Copy`, createdAt: now, updatedAt: now, archivedAt: null }, activity: [...state.activity, { id: `A-${Date.now()}`, label: "Project duplicated", createdAt: now, kind: "project" }] });
}

export function resolvedClientLanguage(state: WorkspaceState) {
  return state.project.clientOutputLanguage === "same_as_project" ? (state.project.resolvedProjectLanguage ?? (state.project.projectLanguage === "auto" ? "en" : state.project.projectLanguage)) : state.project.clientOutputLanguage;
}
