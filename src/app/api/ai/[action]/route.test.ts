import { afterEach, describe, expect, it } from "vitest";
import { resetServerEnvironmentForTests } from "@/infrastructure/server-env";
import { POST } from "./route";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  resetServerEnvironmentForTests();
});

function request(projectMode: "live" | "demo", body: unknown = {}) {
  return new Request("http://localhost/api/ai/analysis", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectMode, payload: body }),
  });
}

describe("public demonstration AI boundary", () => {
  it("refuses every live project before a provider call", async () => {
    process.env.DEPLOYMENT_PROFILE = "public_demo";
    process.env.OPENAI_API_KEY = "must-not-be-used";
    resetServerEnvironmentForTests();

    const response = await POST(request("live"), {
      params: Promise.resolve({ action: "analysis" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "PUBLIC_LIVE_DISABLED" });
  });

  it("serves the explicit precomputed result for a demo project", async () => {
    process.env.DEPLOYMENT_PROFILE = "public_demo";
    delete process.env.OPENAI_API_KEY;
    resetServerEnvironmentForTests();

    const response = await POST(request("demo", { sources: [] }), {
      params: Promise.resolve({ action: "analysis" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.execution.executionMode).toBe("demo_precomputed");
  });

  it("rejects a request above the configured payload limit", async () => {
    process.env.DEPLOYMENT_PROFILE = "public_demo";
    process.env.MAX_AI_PAYLOAD_BYTES = "10000";
    resetServerEnvironmentForTests();

    const response = await POST(request("demo", { text: "x".repeat(12000) }), {
      params: Promise.resolve({ action: "analysis" }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: "AI_PAYLOAD_TOO_LARGE" });
  });
});
