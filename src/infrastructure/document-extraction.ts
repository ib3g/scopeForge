import { inflateRawSync, inflateSync } from "node:zlib";

export type SupportedDocumentKind = "text" | "markdown" | "pdf" | "docx";

export type DocumentExtraction = {
  kind: SupportedDocumentKind;
  content: string;
  pages: number | null;
  sections: number | null;
  warnings: string[];
};

export class DocumentExtractionError extends Error {
  constructor(
    readonly code: "INVALID_DOCX" | "INVALID_PDF" | "PDF_WITHOUT_TEXT" | "EMPTY_DOCUMENT",
    message: string,
  ) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

const decoder = new TextDecoder("utf-8", { fatal: false });

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([\\()])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function extractPdfText(bytes: Uint8Array): DocumentExtraction {
  const rawBytes = Buffer.from(bytes);
  const raw = rawBytes.toString("latin1");
  if (!raw.startsWith("%PDF-")) throw new DocumentExtractionError("INVALID_PDF", "Unsupported or invalid PDF file.");
  const pages = (raw.match(/\/Type\s*\/Page\b/g) ?? []).length || null;
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < rawBytes.length) {
    const streamMarker = rawBytes.indexOf(Buffer.from("stream"), cursor);
    if (streamMarker < 0) break;
    let start = streamMarker + 6;
    if (rawBytes[start] === 13 && rawBytes[start + 1] === 10) start += 2;
    else if (rawBytes[start] === 10 || rawBytes[start] === 13) start += 1;
    const end = rawBytes.indexOf(Buffer.from("endstream"), start);
    if (end < 0) break;
    const header = raw.slice(Math.max(0, streamMarker - 500), streamMarker);
    let stream = rawBytes.subarray(start, end).toString("latin1");
    if (/\/FlateDecode/.test(header)) {
      try {
        stream = decoder.decode(inflateSync(rawBytes.subarray(start, end)));
      } catch {
        cursor = end + 9;
        continue;
      }
    }
    for (const textBlock of stream.matchAll(/BT([\s\S]*?)ET/g)) {
      const block = textBlock[1];
      const strings = [...block.matchAll(/\((?:\\.|[^\\)])*\)/g)].map((item) => decodePdfLiteral(item[0].slice(1, -1)));
      const hexStrings = [...block.matchAll(/<([0-9a-fA-F]+)>/g)].map((item) => {
        const hex = item[1];
        return decoder.decode(Uint8Array.from(hex.match(/.{1,2}/g) ?? [], (part) => parseInt(part, 16)));
      });
      const text = [...strings, ...hexStrings].join(" ").replace(/\s+/g, " ").trim();
      if (text) chunks.push(text);
    }
    cursor = end + 9;
  }
  const content = chunks.join("\f").trim();
  if (!content) throw new DocumentExtractionError("PDF_WITHOUT_TEXT", "This PDF does not contain selectable text. Scanned PDFs require OCR and are not supported yet.");
  return { kind: "pdf", content, pages, sections: chunks.length || null, warnings: pages ? [] : ["Page count could not be determined."] };
}

const MAX_DOCX_XML_BYTES = 20 * 1024 * 1024;

function zipError() {
  return new DocumentExtractionError("INVALID_DOCX", "The DOCX file is incomplete, corrupted, or unsupported.");
}

function findEndOfCentralDirectory(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipEntry(bytes: Uint8Array, expectedName: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findEndOfCentralDirectory(view);
  if (endOffset < 0) throw zipError();

  const entryCount = view.getUint16(endOffset + 10, true);
  const centralSize = view.getUint32(endOffset + 12, true);
  let offset = view.getUint32(endOffset + 16, true);
  if (offset + centralSize > bytes.byteLength) throw zipError();

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw zipError();
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > bytes.byteLength) throw zipError();
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    if (name === expectedName) {
      if ((flags & 0x1) !== 0 || ![0, 8].includes(method)) throw zipError();
      if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || uncompressedSize > MAX_DOCX_XML_BYTES) throw zipError();
      if (localOffset + 30 > bytes.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) throw zipError();
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const end = start + compressedSize;
      if (end > bytes.byteLength) throw zipError();
      const compressed = bytes.slice(start, end);
      try {
        const content = method === 0 ? compressed : new Uint8Array(inflateRawSync(compressed));
        if (content.byteLength !== uncompressedSize) throw zipError();
        return content;
      } catch (error) {
        if (error instanceof DocumentExtractionError) throw error;
        throw zipError();
      }
    }
    offset = nextOffset;
  }
  return undefined;
}

function extractDocxText(bytes: Uint8Array): DocumentExtraction {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw zipError();
  const documentXml = readZipEntry(bytes, "word/document.xml");
  if (!documentXml) throw zipError();
  const xml = decoder.decode(documentXml);
  const paragraphs = xml
    .split(/<w:p(?:\s[^>]*)?>/)
    .slice(1)
    .map((paragraph) => paragraph.split("</w:p>")[0])
    .map((paragraph) => paragraph.replace(/<w:tab\s*\/?>(?=.)/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">" ).replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim())
    .filter(Boolean);
  const content = paragraphs.join("\n\n").trim();
  if (!content) throw new DocumentExtractionError("INVALID_DOCX", "This DOCX does not contain readable text.");
  return { kind: "docx", content, pages: null, sections: paragraphs.length, warnings: [] };
}

export function extractDocument(bytes: Uint8Array, kind: SupportedDocumentKind): DocumentExtraction {
  if (kind === "pdf") return extractPdfText(bytes);
  if (kind === "docx") return extractDocxText(bytes);
  const content = decoder.decode(bytes).replace(/^\uFEFF/, "").trim();
  if (!content) throw new DocumentExtractionError("EMPTY_DOCUMENT", "The document is empty.");
  const sections = content.split(/\n\s*\n/).filter(Boolean).length;
  return { kind, content, pages: null, sections, warnings: [] };
}
