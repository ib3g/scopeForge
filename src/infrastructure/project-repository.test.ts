import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFrenchDemoState } from "./demo-data-fr";
import { createEmptyProject, duplicateProject, projectRepository, resolvedClientLanguage } from "./project-repository";

describe("local project repository", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T10:00:00.000Z"));
  });

  it("seeds two distinct fictional demos and persists project changes", () => {
    const seeded = projectRepository.list();
    expect(seeded.map((state) => state.project.id)).toEqual(["demo", "demo-fr"]);
    const french = seeded[1];
    projectRepository.save({ ...french, project: { ...french.project, name: "Calyra cadrage" } });
    expect(projectRepository.get("demo-fr")?.project.name).toBe("Calyra cadrage");
  });

  it("creates, duplicates and removes an empty project without touching demos", () => {
    const created = createEmptyProject({ name: "Atelier fictif", projectLanguage: "fr", clientOutputLanguage: "en", estimationUnit: "hour", currency: "EUR", contingencyRate: 0.1 });
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
});
