import { z } from "zod";
import type { WorkspaceState } from "@/domain/schemas";
import { normalizeWorkspaceState } from "./project-repository";

export const PROJECT_BACKUP_VERSION = 1;
export const ProjectBackupSchema = z.object({
  format: z.literal("scopeforge-project"),
  version: z.number().int().positive(),
  exportedAt: z.string().datetime(),
  project: z.record(z.string(), z.unknown()),
  summary: z.object({
    sourceCount: z.number().int().nonnegative(),
    decisionCount: z.number().int().nonnegative(),
    revisionCount: z.number().int().nonnegative(),
  }),
});
const ProjectPayloadSchema = z.object({
  project: z.object({ id: z.string(), name: z.string() }).passthrough(),
  sources: z.array(z.unknown()),
  decisions: z.array(z.unknown()),
  estimateSnapshots: z.array(z.unknown()),
}).passthrough();
export type ProjectBackup = z.infer<typeof ProjectBackupSchema>;

export function createProjectBackup(state: WorkspaceState): ProjectBackup {
  return {
    format: "scopeforge-project",
    version: PROJECT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: structuredClone(state) as unknown as Record<string, unknown>,
    summary: {
      sourceCount: state.sources.length,
      decisionCount: state.decisions.length,
      revisionCount: state.estimateSnapshots.length,
    },
  };
}

export function serializeProjectBackup(state: WorkspaceState) {
  return JSON.stringify(createProjectBackup(state), null, 2);
}

export function parseProjectBackup(value: string): ProjectBackup {
  const parsed = ProjectBackupSchema.parse(JSON.parse(value));
  if (parsed.version > PROJECT_BACKUP_VERSION) throw new Error(`Unsupported project backup version: ${parsed.version}`);
  ProjectPayloadSchema.parse(parsed.project);
  return parsed;
}

function newProjectId() {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `restored-${Date.now().toString(36)}-${suffix}`;
}

export function restoreProjectBackupAsNewProject(backup: ProjectBackup): WorkspaceState {
  const raw = structuredClone(backup.project) as unknown as WorkspaceState;
  const now = new Date().toISOString();
  const project = {
    ...raw.project,
    id: newProjectId(),
    name: `${raw.project.name || "Restored project"} — restored`,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
  return normalizeWorkspaceState({
    ...raw,
    project,
    activity: [
      ...(raw.activity ?? []),
      { id: `A-${Date.now()}`, label: "Project restored from backup", createdAt: now, kind: "project" },
    ],
  });
}
