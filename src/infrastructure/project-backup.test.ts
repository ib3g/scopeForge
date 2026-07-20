import { describe, expect, it } from "vitest";
import { createInitialState } from "./demo-data";
import { createProjectBackup, parseProjectBackup, restoreProjectBackupAsNewProject, serializeProjectBackup } from "./project-backup";

describe("project backup", () => {
  it("round-trips a complete project without keeping the original id", () => {
    const state = createInitialState();
    const backup = parseProjectBackup(serializeProjectBackup(state));
    const restored = restoreProjectBackupAsNewProject(backup);
    expect(restored.project.id).not.toBe(state.project.id);
    expect(restored.sources.length).toBe(state.sources.length);
    expect(restored.analysis?.findings.length).toBe(state.analysis?.findings.length);
    expect(restored.activity.at(-1)?.label).toContain("restored");
  });

  it("rejects a future backup version", () => {
    const backup = createProjectBackup(createInitialState());
    expect(() => parseProjectBackup(JSON.stringify({ ...backup, version: 99 }))).toThrow(/Unsupported project backup version/);
  });
});
