import type { AIAction } from "@/domain/schemas";

const STORAGE_KEY = "scopeforge-diagnostics-v1";
const MAX_ENTRIES = 100;

export type LocalDiagnosticEntry = {
  id: string;
  projectId: string;
  operation: AIAction | "pdf" | "xlsx" | "backup" | "document_import";
  startedAt: string;
  durationMs: number;
  status: "success" | "failure";
  errorCode: string | null;
  model: string | null;
  promptVersion: string | null;
  requestId: string | null;
  sourceCount: number;
  approximateCharacters: number;
  inputTokens: number | null;
  outputTokens: number | null;
};

function readEntries(): LocalDiagnosticEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((entry): entry is LocalDiagnosticEntry => Boolean(entry && typeof entry === "object" && "operation" in entry)) : [];
  } catch {
    return [];
  }
}

export function recordLocalDiagnostic(entry: LocalDiagnosticEntry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...readEntries(), entry].slice(-MAX_ENTRIES)));
  } catch {
    // Diagnostics must never block or replace the primary project save path.
  }
}

export function createAnonymizedDiagnosticReport(projectId: string) {
  return JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries: readEntries().filter((entry) => entry.projectId === projectId).map((entry) => {
      const safeEntry: Partial<LocalDiagnosticEntry> = { ...entry };
      delete safeEntry.projectId;
      return safeEntry;
    }),
  }, null, 2);
}
