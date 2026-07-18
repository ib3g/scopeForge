import { describe, expect, it } from "vitest";
import { createFrenchDemoState, frenchDemoAnalysis } from "@/infrastructure/demo-data-fr";
import { ProjectAnalysisSchema } from "./schemas";
import { toClientProposal } from "./proposal";

describe("French multilingual demonstration", () => {
  it("consolidates complementary FR/EN evidence without manufacturing conflict", () => {
    const state = createFrenchDemoState();
    expect(state.sources).toHaveLength(3);
    expect(state.sources.some((source) => source.language.isMultilingual || source.language.detectedLocale === "en")).toBe(true);
    expect(frenchDemoAnalysis.inconsistencies).toEqual([]);
    expect(ProjectAnalysisSchema.parse(frenchDemoAnalysis).findings.length).toBeGreaterThan(3);
  });

  it("keeps original English citations and stores translations separately", () => {
    const citations = frenchDemoAnalysis.findings.flatMap((finding) => finding.citations);
    const english = citations.find((citation) => citation.excerptLocale === "en");
    expect(english?.excerpt).toMatch(/[A-Za-z]/);
    expect(english?.translatedExcerpt).toMatch(/[àâçéèêëîïôùûüœ]|\b(le|la|les|des|une)\b/i);
    expect(english?.excerpt).not.toBe(english?.translatedExcerpt);
  });

  it("keeps internal evidence out of French client data", () => {
    const serialized = JSON.stringify(toClientProposal(createFrenchDemoState()));
    expect(serialized).not.toContain("citations");
    expect(serialized).not.toContain("rationale");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("contingency");
  });
});
