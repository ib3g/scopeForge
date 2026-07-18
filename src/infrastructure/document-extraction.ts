import { inflateRawSync, inflateSync } from "node:zlib";

export type SupportedDocumentKind = "text" | "markdown" | "pdf" | "docx";

export type DocumentExtraction = {
  kind: SupportedDocumentKind;
  content: string;
  pages: number | null;
  sections: number | null;
  warnings: string[];
};

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
  if (!raw.startsWith("%PDF-")) throw new Error("Unsupported or invalid PDF file.");
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
  if (!content) throw new Error("This PDF does not contain selectable text. Scanned PDFs require OCR and are not supported yet.");
  return { kind: "pdf", content, pages, sections: chunks.length || null, warnings: pages ? [] : ["Page count could not be determined."] };
}

function readZipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.byteLength) {
    if (view.getUint32(offset, true) !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength + extraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    if (method === 0) entries.set(name, compressed);
    if (method === 8) entries.set(name, new Uint8Array(inflateRawSync(compressed)));
    offset = start + compressedSize;
  }
  return entries;
}

function extractDocxText(bytes: Uint8Array): DocumentExtraction {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("Unsupported or invalid DOCX file.");
  const documentXml = readZipEntries(bytes).get("word/document.xml");
  if (!documentXml) throw new Error("The DOCX document body could not be read.");
  const xml = decoder.decode(documentXml);
  const paragraphs = xml
    .split(/<w:p(?:\s[^>]*)?>/)
    .slice(1)
    .map((paragraph) => paragraph.split("</w:p>")[0])
    .map((paragraph) => paragraph.replace(/<w:tab\s*\/?>(?=.)/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">" ).replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim())
    .filter(Boolean);
  const content = paragraphs.join("\n\n").trim();
  if (!content) throw new Error("This DOCX does not contain readable text.");
  return { kind: "docx", content, pages: null, sections: paragraphs.length, warnings: [] };
}

export function extractDocument(bytes: Uint8Array, kind: SupportedDocumentKind): DocumentExtraction {
  if (kind === "pdf") return extractPdfText(bytes);
  if (kind === "docx") return extractDocxText(bytes);
  const content = decoder.decode(bytes).replace(/^\uFEFF/, "").trim();
  if (!content) throw new Error("The document is empty.");
  const sections = content.split(/\n\s*\n/).filter(Boolean).length;
  return { kind, content, pages: null, sections, warnings: [] };
}
