import type { AIAction } from "./schemas";

export type AiOperationStatus =
  | "idle"
  | "preparing"
  | "sending"
  | "processing"
  | "validating"
  | "applying"
  | "completed"
  | "failed"
  | "cancelled";

export type AiOperation = {
  id: string;
  type: AIAction;
  projectId: string;
  status: AiOperationStatus;
  label: string;
  startedAt: string;
  elapsedMs: number;
  finishedAt: string | null;
  model: string | null;
  requestId: string | null;
  errorMessage: string | null;
  sourceRevision: string;
  retryable: boolean;
};

export const activeAiOperationStatuses: AiOperationStatus[] = [
  "preparing",
  "sending",
  "processing",
  "validating",
  "applying",
];

export function isAiOperationActive(operation: AiOperation | null) {
  return Boolean(operation && activeAiOperationStatuses.includes(operation.status));
}

export function operationElapsedMs(operation: Pick<AiOperation, "startedAt" | "finishedAt">, now = Date.now()) {
  const start = Date.parse(operation.startedAt);
  const end = operation.finishedAt ? Date.parse(operation.finishedAt) : now;
  return Math.max(0, end - start);
}

export function canApplyAiResult(operation: Pick<AiOperation, "projectId" | "sourceRevision">, projectId: string, sourceRevision: string) {
  return operation.projectId === projectId && operation.sourceRevision === sourceRevision;
}

export function transitionAiOperation(operation: AiOperation, status: AiOperationStatus, patch: Partial<Pick<AiOperation, "errorMessage" | "requestId" | "model" | "retryable">> = {}): AiOperation {
  const finishedAt = ["completed", "failed", "cancelled"].includes(status) ? new Date().toISOString() : operation.finishedAt;
  return { ...operation, ...patch, status, finishedAt, elapsedMs: operationElapsedMs({ ...operation, finishedAt }, Date.now()) };
}
