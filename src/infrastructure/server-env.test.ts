import { afterEach, describe, expect, it } from "vitest";
import { getServerEnvironment, resetServerEnvironmentForTests } from "./server-env";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
  resetServerEnvironmentForTests();
});

describe("server environment", () => {
  it("uses safe local defaults", () => {
    delete process.env.DEPLOYMENT_PROFILE;
    delete process.env.ALLOW_PUBLIC_LIVE_AI;
    resetServerEnvironmentForTests();
    expect(getServerEnvironment().DEPLOYMENT_PROFILE).toBe("local");
    expect(getServerEnvironment().ALLOW_PUBLIC_LIVE_AI).toBe(false);
  });

  it("rejects public Live AI in the frozen public profile", () => {
    process.env.DEPLOYMENT_PROFILE = "public_demo";
    process.env.ALLOW_PUBLIC_LIVE_AI = "true";
    resetServerEnvironmentForTests();
    expect(() => getServerEnvironment()).toThrow(/not supported/i);
  });
});
