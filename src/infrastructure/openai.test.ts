import type OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectAnalysisSchema } from "@/domain/schemas";
import {
  AIConfigurationError,
  getAIConfiguration,
  runStructuredAction,
} from "./openai";

const originalDemoMode = process.env.DEMO_MODE;
const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.OPENAI_PRIMARY_MODEL;

afterEach(() => {
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.OPENAI_PRIMARY_MODEL;
  else process.env.OPENAI_PRIMARY_MODEL = originalModel;
  vi.restoreAllMocks();
});

const liveSources = [
  {
    id: "LIVE-SRC-01",
    title: "Live discovery notes",
    content: "A live project needs a searchable service catalogue.",
    paragraphs: [
      {
        id: "LIVE-SRC-01-P001",
        text: "A live project needs a searchable service catalogue.",
      },
    ],
  },
];

const liveAnalysis = ProjectAnalysisSchema.parse({
  executiveSummary: "The project needs a searchable service catalogue.",
  coverageScore: 75,
  findings: [
    {
      id: "LIVE-F-01",
      category: "requirement",
      statement: "Provide a searchable service catalogue.",
      confidence: 1,
      evidenceType: "explicit",
      citations: [
        {
          sourceId: "LIVE-SRC-01",
          paragraphId: "LIVE-SRC-01-P001",
          excerpt: "searchable service catalogue",
          excerptLocale: "en",
          translatedExcerpt: null,
        },
      ],
    },
  ],
  sourceContributions: [
    {
      id: "LIVE-SC-01",
      sourceId: "LIVE-SRC-01",
      topic: "Catalogue",
      contribution: "Introduces catalogue search.",
      relation: "introduces",
      relatedFindingIds: ["LIVE-F-01"],
      citations: [
        {
          sourceId: "LIVE-SRC-01",
          paragraphId: "LIVE-SRC-01-P001",
          excerpt: "searchable service catalogue",
          excerptLocale: "en",
          translatedExcerpt: null,
        },
      ],
    },
  ],
  duplicatesMerged: [],
  inconsistencies: [],
  suggestedNextStep: "Clarify catalogue filters.",
  referenceInfluences: [],
});

function clientReturning(output: unknown, id = "resp_live_123") {
  return {
    responses: {
      parse: vi.fn().mockResolvedValue({ id, output_parsed: output }),
    },
  } as unknown as OpenAI;
}

describe("OpenAI live/demo boundary", () => {
  it("uses a labelled precomputed result for a demo project without a key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.DEMO_MODE = "false";
    const result = await runStructuredAction(
      "analysis",
      { sources: [] },
      { projectMode: "demo" },
    );
    expect(result.execution).toMatchObject({
      executionMode: "demo_precomputed",
      model: null,
      promptVersion: "scopeforge-editorial-v2",
    });
  });

  it("never injects a demo result into a live project without a key", async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.DEMO_MODE = "true";
    await expect(
      runStructuredAction(
        "analysis",
        { sources: liveSources },
        { projectMode: "live" },
      ),
    ).rejects.toBeInstanceOf(AIConfigurationError);
  });

  it("does not let DEMO_MODE force a live project away from the live route", async () => {
    process.env.DEMO_MODE = "true";
    process.env.OPENAI_PRIMARY_MODEL = "gpt-5.6";
    const client = clientReturning(liveAnalysis);
    const result = await runStructuredAction(
      "analysis",
      { sources: liveSources },
      { projectMode: "live", client },
    );
    expect(result.execution.executionMode).toBe("live");
  });

  it("can replay a demo project with the live model when demo mode is disabled", async () => {
    process.env.OPENAI_API_KEY = "test-only-key";
    process.env.DEMO_MODE = "false";
    process.env.OPENAI_PRIMARY_MODEL = "gpt-5.6";
    const result = await runStructuredAction(
      "analysis",
      { sources: liveSources },
      { projectMode: "demo", client: clientReturning(liveAnalysis) },
    );
    expect(result.execution).toMatchObject({
      executionMode: "live",
      model: "gpt-5.6",
    });
  });

  it("exposes configuration status without exposing the server key", () => {
    process.env.OPENAI_API_KEY = "test-only-secret";
    process.env.OPENAI_PRIMARY_MODEL = "gpt-5.6";
    const configuration = getAIConfiguration();
    expect(configuration).toEqual({
      configured: true,
      primaryModel: "gpt-5.6",
      deploymentProfile: "local",
      liveAvailable: true,
      componentLabEnabled: true,
      diagnosticsEnabled: true,
    });
    expect(JSON.stringify(configuration)).not.toContain("test-only-secret");
  });

  it("uses only submitted live sources and preserves proof metadata", async () => {
    process.env.OPENAI_PRIMARY_MODEL = "gpt-5.6";
    const client = clientReturning(liveAnalysis);
    const result = await runStructuredAction(
      "analysis",
      { sources: liveSources, languageContext: { projectLanguage: "en" } },
      { projectMode: "live", client },
    );
    const parse = client.responses.parse as ReturnType<typeof vi.fn>;
    const request = parse.mock.calls[0][0];
    const serializedInput = JSON.stringify(request.input);
    expect(serializedInput).toContain("LIVE-SRC-01");
    expect(serializedInput).not.toContain("Morrow Ridge");
    expect(serializedInput).not.toContain("Calyra");
    expect(result.execution).toMatchObject({
      executionMode: "live",
      model: "gpt-5.6",
      requestId: "resp_live_123",
    });
    expect(result.execution.sourceChecksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes a model coverage ratio to the UI percentage scale", async () => {
    const client = clientReturning({ ...liveAnalysis, coverageScore: 0.92 });
    const result = await runStructuredAction(
      "analysis",
      { sources: liveSources, languageContext: { projectLanguage: "en" } },
      { projectMode: "live", client },
    );

    expect(result.data).toMatchObject({ coverageScore: 92 });
    const request = (client.responses.parse as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.stringify(request.input)).toContain("use 92 for 92%, never 0.92");
  });

  it("propagates an API failure without returning precomputed data", async () => {
    const client = {
      responses: {
        parse: vi.fn().mockRejectedValue(new Error("provider unavailable")),
      },
    } as unknown as OpenAI;
    await expect(
      runStructuredAction(
        "analysis",
        { sources: liveSources },
        { projectMode: "live", client },
      ),
    ).rejects.toThrow("provider unavailable");
  });
});
