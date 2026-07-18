import { afterEach, describe, expect, it } from "vitest";
import { runStructuredAction } from "./openai";

const originalDemoMode = process.env.DEMO_MODE;
const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("OpenAI demo boundary", () => {
  it("forces the labelled fallback when DEMO_MODE is enabled even if a key exists", async () => {
    process.env.DEMO_MODE = "true";
    process.env.OPENAI_API_KEY = "test-key-that-must-not-be-called";

    const result = await runStructuredAction("analysis", { sources: [] });

    expect(result.mode).toBe("demo_fallback");
    expect(result.model).toBe("precomputed-demo");
  });

  it("uses the labelled fallback when no key exists", async () => {
    process.env.DEMO_MODE = "false";
    delete process.env.OPENAI_API_KEY;

    const result = await runStructuredAction("analysis", { sources: [] });

    expect(result.mode).toBe("demo_fallback");
  });
});
