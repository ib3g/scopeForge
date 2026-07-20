import { describe, expect, it } from "vitest";
import { buildClientDocument, defaultClientProposalSettings } from "./client-document";
import type { EstimateSnapshot } from "./schemas";
import { calculateTotals } from "./estimation";
import { createInitialState, demoEstimateLines, demoWorkstreams } from "@/infrastructure/demo-data";
import { defaultEstimationMethods } from "@/infrastructure/estimation-library";

function approvedFixture() {
  const state = createInitialState();
  state.workstreams = structuredClone(demoWorkstreams);
  state.estimateLines = structuredClone(demoEstimateLines);
  state.analysis = {
    executiveSummary: "A client-safe summary.",
    coverageScore: 80,
    findings: [],
    sourceContributions: [],
    duplicatesMerged: [],
    inconsistencies: [],
    suggestedNextStep: "Review the estimate.",
    referenceInfluences: [],
  };
  const modules = state.workstreams.flatMap((workstream) => workstream.modules);
  const now = "2026-07-18T12:00:00.000Z";
  const snapshot: EstimateSnapshot = {
    id: "EST-V1",
    createdAt: now,
    author: "Local user",
    status: "approved",
    origin: "generated",
    reason: null,
    parentSnapshotId: null,
    validatedAt: now,
    supersededAt: null,
    methodId: "web-fixed-price",
    methodOverrides: {},
    estimationUnit: "day",
    contingencyRate: state.project.contingencyRate,
    preferences: structuredClone(state.project.preferences),
    totals: calculateTotals(state.estimateLines, modules, state.project.contingencyRate, state.project.preferences),
    estimateLines: structuredClone(state.estimateLines),
    workstreams: structuredClone(state.workstreams),
    assumptions: ["Client supplies approved content."],
    decisions: [{ id: "D-1", statement: "Launch in English.", kind: "client_answer", createdAt: now }],
    referenceCaseIds: ["internal-reference"],
    sourceVersions: [{ sourceId: "SRC-1", checksum: "secret-checksum" }],
    sourceChecksum: "secret-source-checksum",
    aiExecutions: { analysis: { executionMode: "live", model: "gpt-5.6", generatedAt: now, promptVersion: "analysis-v1", sourceChecksum: "secret", requestId: "req-secret" } },
    revision: 1,
  };
  return { state, snapshot };
}

describe("client document projection", () => {
  it("requires an approved estimate snapshot", () => {
    const { state, snapshot } = approvedFixture();
    expect(() => buildClientDocument({ state, snapshot: { ...snapshot, status: "in_review" }, settings: defaultClientProposalSettings(state), method: defaultEstimationMethods[0], proposalId: "PROP-1", generatedAt: snapshot.createdAt })).toThrow(/validated estimate/);
  });

  it("calculates commercial totals and excludes internal metadata", () => {
    const { state, snapshot } = approvedFixture();
    const settings = { ...defaultClientProposalSettings(state), showTaxes: true, taxRate: 0.2, discountRate: 0.1 };
    const document = buildClientDocument({ state, snapshot, settings, method: defaultEstimationMethods[0], proposalId: "PROP-1", generatedAt: snapshot.createdAt });
    expect(document.totals.subtotal).toBe(snapshot.totals.proposed.likely * 850);
    expect(document.totals.discount).toBe((document.totals.subtotal ?? 0) * 0.1);
    expect(document.totals.tax).toBe((document.totals.totalExcludingTax ?? 0) * 0.2);
    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain("req-secret");
    expect(serialized).not.toContain("secret-checksum");
    expect(serialized).not.toContain("internal-reference");
    expect(serialized).not.toContain('"confidence"');
    expect(serialized).not.toContain('"risk"');
  });

  it("supports effort-only documents without prices", () => {
    const { state, snapshot } = approvedFixture();
    const settings = { ...defaultClientProposalSettings(state), pricingMode: "effort_only" as const };
    const document = buildClientDocument({ state, snapshot, settings, method: defaultEstimationMethods[0], proposalId: "PROP-1", generatedAt: snapshot.createdAt });
    expect(document.totals.subtotal).toBeNull();
    expect(document.included.every((line) => line.amount === null && line.rate === null)).toBe(true);
  });
});

