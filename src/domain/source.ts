import type { ProjectSource } from "./schemas";
import { detectSourceLanguage } from "./language";
export { sourceLocale } from "./language";

export function normalizeSource(id: string, title: string, origin: string, content: string): ProjectSource {
  const normalized = content.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const chunks = normalized.split(/\n\s*\n|(?=^###? )/gm).map((text) => text.trim()).filter(Boolean);
  return {
    id,
    title,
    origin,
    kind: "pasted_text",
    content: normalized,
    paragraphs: chunks.map((text, index) => ({ id: `${id}-P${String(index + 1).padStart(3, "0")}`, text })),
    language: detectSourceLanguage(normalized),
  };
}

export function wordCount(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}
