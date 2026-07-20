import { describe, expect, it } from "vitest";
import { compareEstimateRevisions } from "./estimate-revisions";
import type { EstimateSnapshot } from "./schemas";

function snapshot(overrides: Partial<EstimateSnapshot> = {}): EstimateSnapshot {
  return {
    id: "EST-1",
    createdAt: "2026-07-18T00:00:00.000Z",
    author: "Local user",
    status: "approved",
    origin: "generated",
    reason: null,
    parentSnapshotId: null,
    validatedAt: "2026-07-18T00:00:00.000Z",
    supersededAt: null,
    methodId: "method-1",
    methodOverrides: {},
    estimationUnit: "day",
    contingencyRate: 0.1,
    preferences: { teamSize: 2, productiveDaysPerMonth: 18, includeReserveInOptions: false, rounding: 0.5, showEffortInClient: false, commercialModel: "fixed_price", deliverableType: "internal_estimate" },
    totals: { base: { low: 1, likely: 2, high: 3 }, reserve: { low: 0.1, likely: 0.2, high: 0.3 }, proposed: { low: 1.1, likely: 2.2, high: 3.3 }, options: { low: 0, likely: 0, high: 0 } },
    estimateLines: [{ id: "L-1", moduleId: "M-1", low: 1, likely: 2, high: 3, rationale: "", confidence: "medium", risk: "low", manualOverride: false, updatedBy: "user" }],
    workstreams: [{ id: "W-1", name: "Core", description: "", order: 1, modules: [{ id: "M-1", name: "Search", description: "", status: "included", features: [], dependencies: [], assumptions: [], citations: [] }] }],
    assumptions: ["Responsive web"],
    decisions: [],
    referenceCaseIds: [],
    sourceVersions: [],
    sourceChecksum: "source-1",
    aiExecutions: {},
    revision: 1,
    ...overrides,
  };
}

describe("estimate revision comparison", () => {
  it("compares line changes and deterministic totals", () => {
    const before = snapshot();
    const after = snapshot({
      id: "EST-2",
      revision: 2,
      totals: { ...before.totals, proposed: { low: 2.1, likely: 4.2, high: 5.3 } },
      estimateLines: [{ ...before.estimateLines[0], likely: 4 }],
    });
    const comparison = compareEstimateRevisions(before, after);
    expect(comparison.modifiedLines).toBe(1);
    expect(comparison.totals.likely).toBe(2);
    expect(comparison.relativeLikely).toBeCloseTo(2 / 2.2);
  });
});
