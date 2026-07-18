import { describe, expect, it } from "vitest";
import { normalizeSource } from "./source";

describe("source provenance", () => {
  it("assigns stable paragraph identifiers", () => {
    const source = normalizeSource("SRC-09", "Test", "Demo", "First paragraph.\n\nSecond paragraph.");
    expect(source.paragraphs.map((paragraph) => paragraph.id)).toEqual(["SRC-09-P001", "SRC-09-P002"]);
  });
});
