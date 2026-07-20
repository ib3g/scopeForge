import { describe, expect, it } from "vitest";
import { evaluationScenarios, validateScenario } from "./deterministic";

describe("RC evaluation fixtures", () => {
  it("contains the required sixteen fictional scenarios with stable provenance", () => {
    expect(evaluationScenarios).toHaveLength(16);
    expect(new Set(evaluationScenarios.map((scenario) => scenario.id)).size).toBe(16);
    evaluationScenarios.forEach((scenario) => expect(() => validateScenario(scenario)).not.toThrow());
  });

  it("contains no real customer fixtures or empty source content", () => {
    const serialized = JSON.stringify(evaluationScenarios);
    expect(serialized).not.toMatch(/Morrow Ridge|Calyra|OpenAI API key/i);
    expect(evaluationScenarios.every((scenario) => scenario.sources.every((source) => source.paragraphs.every((paragraph) => paragraph.text.trim().length > 0)))).toBe(true);
  });
});

