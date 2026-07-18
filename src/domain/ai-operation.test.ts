import { describe, expect, it } from "vitest";
import { canApplyAiResult, isAiOperationActive, operationElapsedMs, transitionAiOperation, type AiOperation } from "./ai-operation";

const operation: AiOperation = {
  id: "op-1",
  type: "analysis",
  projectId: "project-1",
  status: "processing",
  label: "Analysis",
  startedAt: "2026-07-18T10:00:00.000Z",
  elapsedMs: 0,
  finishedAt: null,
  model: "gpt-5.6",
  requestId: null,
  errorMessage: null,
  sourceRevision: "rev-1",
  retryable: false,
};

describe("AI operation state", () => {
  it("recognizes active and terminal states", () => {
    expect(isAiOperationActive(operation)).toBe(true);
    expect(isAiOperationActive({ ...operation, status: "completed" })).toBe(false);
  });

  it("computes elapsed time from timestamps", () => {
    expect(operationElapsedMs(operation, Date.parse("2026-07-18T10:00:42.000Z"))).toBe(42_000);
    expect(operationElapsedMs({ ...operation, finishedAt: "2026-07-18T10:00:12.000Z" }, Date.parse("2026-07-18T10:00:42.000Z"))).toBe(12_000);
  });

  it("guards result application by project and source revision", () => {
    expect(canApplyAiResult(operation, "project-1", "rev-1")).toBe(true);
    expect(canApplyAiResult(operation, "project-2", "rev-1")).toBe(false);
    expect(canApplyAiResult(operation, "project-1", "rev-2")).toBe(false);
  });

  it("transitions to a retryable failure without losing the operation identity", () => {
    const failed = transitionAiOperation(operation, "failed", { errorMessage: "Network error", retryable: true });
    expect(failed.id).toBe(operation.id);
    expect(failed.status).toBe("failed");
    expect(failed.retryable).toBe(true);
    expect(failed.finishedAt).not.toBeNull();
  });

  it("supports an explicit cancelled terminal state", () => {
    expect(transitionAiOperation(operation, "cancelled").status).toBe("cancelled");
  });
});
