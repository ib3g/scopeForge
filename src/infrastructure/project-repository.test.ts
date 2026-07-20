import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFrenchDemoState } from "./demo-data-fr";
import { createEmptyProject, duplicateProject, normalizeWorkspaceState, projectRepository, resolvedClientLanguage } from "./project-repository";

describe("local project repository", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T10:00:00.000Z"));
  });

  it("seeds two explicit demo projects and persists project changes", () => {
    const seeded = projectRepository.list();
    expect(seeded.map((state) => state.project.id)).toEqual(["demo", "demo-fr"]);
    expect(seeded.every((state) => state.project.mode === "demo")).toBe(true);
    const french = seeded[1];
    projectRepository.save({ ...french, project: { ...french.project, name: "Calyra cadrage" } });
    expect(projectRepository.get("demo-fr")?.project.name).toBe("Calyra cadrage");
  });

  it("creates, duplicates and removes an empty project without touching demos", () => {
    const created = createEmptyProject({ name: "Atelier client", projectLanguage: "fr", clientOutputLanguage: "en", estimationUnit: "hour", currency: "EUR", contingencyRate: 0.1 });
    expect(created.project.mode).toBe("live");
    projectRepository.save(created);
    const copy = duplicateProject(created);
    projectRepository.save(copy);
    expect(projectRepository.list()).toHaveLength(4);
    expect(copy.project.id).not.toBe(created.project.id);
    projectRepository.remove(created.project.id);
    expect(projectRepository.get(created.project.id)).toBeNull();
    expect(projectRepository.get("demo")).not.toBeNull();
  });

  it("resolves client language independently from interface and project language", () => {
    const french = createFrenchDemoState();
    expect(resolvedClientLanguage(french)).toBe("fr");
    expect(resolvedClientLanguage({ ...french, project: { ...french.project, clientOutputLanguage: "en" } })).toBe("en");
  });

  it("migrates a pre-P1 workspace without discarding its sources", () => {
    const created = createEmptyProject({ name: "Legacy project", projectLanguage: "en", clientOutputLanguage: "same_as_project", estimationUnit: "day", currency: "EUR", contingencyRate: 0.15 });
    const legacy = structuredClone(created) as Record<string, unknown>;
    const project = { ...(legacy.project as Record<string, unknown>) };
    delete project.estimationMethodId;
    delete project.estimationMethodOverrides;
    delete legacy.referenceCaseIds;
    delete legacy.referenceMatches;
    delete legacy.referenceInfluences;
    const migrated = normalizeWorkspaceState({ ...legacy, project } as unknown as typeof created);
    expect(migrated.sources).toHaveLength(0);
    expect(migrated.project.estimationMethodId).toBe("web-fixed-price");
    expect(migrated.project.estimationMethodOverrides).toEqual({});
    expect(migrated.referenceCaseIds).toEqual([]);
  });

  it("keeps the latest project in memory when persistent storage fails", () => {
    const created = createEmptyProject({ name: "Volatile project", projectLanguage: "en", clientOutputLanguage: "en", estimationUnit: "day", currency: "EUR", contingencyRate: 0.1 });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    projectRepository.save(created);
    expect(projectRepository.storageStatus()).toEqual({ persistent: false, code: "STORAGE_QUOTA_EXCEEDED" });
    expect(projectRepository.get(created.project.id)?.project.name).toBe("Volatile project");
    write.mockRestore();
    projectRepository.save(created);
    expect(projectRepository.storageStatus().persistent).toBe(true);
  });
});
