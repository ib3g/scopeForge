import { describe, expect, it } from "vitest";
import { createInitialState } from "./demo-data";
import { createFrenchDemoState } from "./demo-data-fr";
import { createXlsxWorkbook } from "./xlsx-export";

describe("xlsx export", () => {
  it("creates a real OOXML workbook with internal sheets and formulas", () => {
    const state = createFrenchDemoState();
    const workbook = createXlsxWorkbook(state, null, "internal", "en");
    const text = new TextDecoder().decode(workbook);
    expect(workbook[0]).toBe(0x50);
    expect(workbook[1]).toBe(0x4b);
    expect(text).toContain("xl/workbook.xml");
    expect(text).toContain("Estimate");
    expect(text).toContain("Decisions");
    // The demo may not yet have estimate lines; summary cells still contain
    // deterministic formula references to the estimate sheet.
    expect(text).toContain("<f>Estimate!H2</f>");
  });

  it("keeps internal references out of the client workbook", () => {
    const state = createInitialState();
    const workbook = createXlsxWorkbook(state, null, "client", "en");
    const text = new TextDecoder().decode(workbook);
    expect(text).toContain("Scope");
    expect(text).not.toContain("References");
    expect(text).not.toContain("Request:");
    expect(text).not.toContain("Version");
    expect(text).not.toContain("Confidence");
    expect(text).not.toContain("Checksum");
  });
});
