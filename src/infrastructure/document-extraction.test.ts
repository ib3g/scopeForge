import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractDocument } from "./document-extraction";

function docxFixture(xml: string) {
  const name = Buffer.from("word/document.xml");
  const content = deflateRawSync(Buffer.from(xml));
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0x8, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(name.length, 26);

  const descriptor = Buffer.alloc(16);
  descriptor.writeUInt32LE(0x08074b50, 0);
  descriptor.writeUInt32LE(content.length, 8);
  descriptor.writeUInt32LE(Buffer.byteLength(xml), 12);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0x8, 8);
  centralHeader.writeUInt16LE(8, 10);
  centralHeader.writeUInt32LE(content.length, 20);
  centralHeader.writeUInt32LE(Buffer.byteLength(xml), 24);
  centralHeader.writeUInt16LE(name.length, 28);

  const centralOffset = localHeader.length + name.length + content.length + descriptor.length;
  const centralSize = centralHeader.length + name.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  return new Uint8Array(Buffer.concat([localHeader, name, content, descriptor, centralHeader, name, end]));
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

  it("reports a controlled error for a truncated DOCX archive", () => {
    const xml = "<w:document><w:body><w:p><w:r><w:t>Project brief</w:t></w:r></w:p></w:body></w:document>";
    const truncated = docxFixture(xml).slice(0, -12);
    expect(() => extractDocument(truncated, "docx")).toThrow(/incomplete, corrupted, or unsupported/);
  });
});
