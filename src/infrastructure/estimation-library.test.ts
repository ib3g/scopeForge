import { describe, expect, it } from "vitest";
import { createInitialState } from "./demo-data";
import {
  compareEstimateWithReference,
  createReferenceFromEstimate,
  defaultEstimationMethods,
  defaultReferenceCases,
  findReferenceMatches,
  mergeMethodOverrides,
  parseReference,
  serializeReference,
} from "./estimation-library";

describe("estimation methods and reference cases", () => {
  it("ships three deterministic methods with valid overrides", () => {
    expect(defaultEstimationMethods).toHaveLength(3);
    const method = mergeMethodOverrides(defaultEstimationMethods[0], { reserveRate: 0.2, rounding: "1" });
    expect(method?.reserveRate).toBe(0.2);
    expect(method?.rounding).toBe("1");
    expect(defaultEstimationMethods.every((item) => item.lowFactor > 0 && item.highFactor > 0)).toBe(true);
  });

  it("ranks references with an explanation instead of pretending certainty", () => {
    const state = createInitialState();
    const matches = findReferenceMatches(state, defaultReferenceCases);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].explanation).toMatch(/context|Matched|match/i);
    expect(matches[0].doNotTransfer.join(" ")).toMatch(/not|Do not/i);
  });

  it("keeps comparison deterministic and separates workstream differences", () => {
    const state = createInitialState();
    const comparison = compareEstimateWithReference(state, defaultReferenceCases[0]);
    expect(comparison.currentTotals).toEqual({ low: 0, likely: 0, high: 0 });
    expect(comparison.referenceTotals.likely).toBeGreaterThan(0);
    expect(comparison.riskNotes.length).toBeGreaterThan(0);
  });

  it("round-trips a reference export and creates a case from a validated estimate", () => {
    const state = createInitialState();
    const reference = createReferenceFromEstimate(state, { title: "Reviewed portal", summary: "An internal learning case.", tags: ["portal"] });
    const parsed = parseReference(serializeReference(reference));
    expect(parsed.title).toBe("Reviewed portal");
    expect(parsed.provenance).toBe("user_decision");
  });
});
