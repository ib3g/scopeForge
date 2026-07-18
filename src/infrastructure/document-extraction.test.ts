import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractDocument } from "./document-extraction";

function docxFixture(xml: string) {
  const name = Buffer.from("word/document.xml");
  const content = deflateRawSync(Buffer.from(xml));
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(content.length, 18);
  header.writeUInt32LE(Buffer.byteLength(xml), 22);
  header.writeUInt16LE(name.length, 26);
  return new Uint8Array(Buffer.concat([header, name, content]));
}

describe("document extraction", () => {
  it("extracts text and markdown into sections", () => {
    const result = extractDocument(new TextEncoder().encode("# Brief\n\nThe launch is responsive."), "markdown");
    expect(result.kind).toBe("markdown");
    expect(result.content).toContain("The launch is responsive");
    expect(result.sections).toBe(2);
  });

  it("extracts selectable PDF text without pretending to support scans", () => {
    const pdf = "%PDF-1.4\n1 0 obj<</Type /Page>>endobj\nstream\nBT (ScopeForge brief) Tj ET\nendstream\n%%EOF";
    const result = extractDocument(new TextEncoder().encode(pdf), "pdf");
    expect(result.content).toContain("ScopeForge brief");
    expect(() => extractDocument(new TextEncoder().encode("%PDF-1.4\n%%EOF"), "pdf")).toThrow(/selectable text/);
  });

  it("extracts paragraphs from a DOCX document body", () => {
    const xml = "<w:document><w:body><w:p><w:r><w:t>Project brief</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>";
    const result = extractDocument(docxFixture(xml), "docx");
    expect(result.content).toBe("Project brief\n\nSecond paragraph");
    expect(result.sections).toBe(2);
  });
});
