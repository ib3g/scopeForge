import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAnonymizedDiagnosticReport, recordLocalDiagnostic } from "./local-diagnostics";

describe("local diagnostics", () => {
  beforeEach(() => localStorage.clear());

  it("exports operation metadata without project identifiers or source content", () => {
    vi.setSystemTime(new Date("2026-07-18T20:00:00.000Z"));
    recordLocalDiagnostic({ id: "D-1", projectId: "private-project", operation: "analysis", startedAt: "2026-07-18T19:59:58.000Z", durationMs: 2000, status: "success", errorCode: null, model: "gpt-5.6", promptVersion: "analysis-v1", requestId: "req-safe", sourceCount: 2, approximateCharacters: 4200, inputTokens: 100, outputTokens: 50 });
    const report = createAnonymizedDiagnosticReport("private-project");
    expect(report).toContain("analysis-v1");
    expect(report).not.toContain("private-project");
    expect(report).not.toContain("source content");
  });
});
