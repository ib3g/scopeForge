import { describe, expect, it } from "vitest";
import { calculateTotals, validateRange } from "./estimation";
import { demoEstimateLines, demoWorkstreams } from "@/infrastructure/demo-data";
import { frenchDemoEstimateLines, frenchDemoWorkstreams } from "@/infrastructure/demo-data-fr";

describe("deterministic estimation", () => {
  const modules = demoWorkstreams.flatMap((workstream) => workstream.modules);

  it("excludes excluded modules and separates options", () => {
    const totals = calculateTotals(demoEstimateLines, modules, 0.15);
    expect(totals.base.likely).toBe(63);
    expect(totals.options.likely).toBe(10);
  });

  it("applies reserve only to the included base", () => {
    const totals = calculateTotals(demoEstimateLines, modules, 0.15);
    expect(totals.reserve.likely).toBe(9.5);
    expect(totals.proposed.likely).toBe(72.5);
  });

  it("keeps both demonstration projects below 100 person-days in the likely case", () => {
    const english = calculateTotals(demoEstimateLines, modules, 0.15);
    const french = calculateTotals(
      frenchDemoEstimateLines,
      frenchDemoWorkstreams.flatMap((workstream) => workstream.modules),
      0.15,
    );
    expect(english.proposed.likely).toBe(72.5);
    expect(french.proposed.likely).toBe(55.2);
  });

  it("validates ordered non-negative ranges", () => {
    expect(validateRange(1, 2, 3)).toBe(true);
    expect(validateRange(3, 2, 1)).toBe(false);
    expect(validateRange(-1, 2, 3)).toBe(false);
  });

  it("applies project rounding and includes reserve in options only when requested", () => {
    const totals = calculateTotals(demoEstimateLines, modules, 0.15, {
      includeReserveInOptions: true, rounding: 5,
    });
    expect(totals.reserve.likely % 5).toBe(0);
    expect(totals.options.likely).toBe(15);
  });
});
