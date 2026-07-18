import { describe, expect, it } from "vitest";
import { formatDateFor, translate } from "./index";

describe("localized product copy and formats", () => {
  it("keeps stable keys while translating their user-facing values", () => {
    expect(translate("en", "common.included")).toBe("Included");
    expect(translate("fr", "common.included")).toBe("Inclus");
    expect(translate("fr", "analysis.introduces")).toBe("Introduit");
  });

  it("interpolates French and English plurals without leaking keys", () => {
    expect(translate("en", "analysis.supportingPlural", { count: 3 })).toContain("3 sources");
    expect(translate("fr", "analysis.supportingPlural", { count: 3 })).toContain("3 sources");
  });

  it("uses localized native date formatting", () => {
    const value = "2026-07-18T12:00:00.000Z";
    expect(formatDateFor("en", value, { month: "long", timeZone: "UTC" })).toBe("July");
    expect(formatDateFor("fr", value, { month: "long", timeZone: "UTC" })).toBe("juillet");
  });
});
