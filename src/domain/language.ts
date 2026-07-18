import type { ProjectSource, SourceLanguage } from "./schemas";

const markers: Record<"en" | "fr", Set<string>> = {
  en: new Set(["the", "and", "with", "for", "from", "that", "this", "should", "must", "will", "project", "users", "user", "launch", "source", "application", "data", "content", "needs", "requires", "without", "before", "after", "through", "only"]),
  fr: new Set(["le", "la", "les", "des", "une", "un", "et", "avec", "pour", "dans", "que", "qui", "doit", "devra", "projet", "utilisateur", "utilisateurs", "lancement", "source", "données", "contenu", "besoin", "avant", "après", "sans", "depuis", "cette", "ces", "sur"]),
};

function score(text: string) {
  const tokens = text.toLocaleLowerCase().match(/[\p{L}’'-]+/gu) ?? [];
  const counts = { en: 0, fr: 0 };
  for (const token of tokens) {
    const normalized = token.replace(/[’']/g, "");
    if (markers.en.has(normalized)) counts.en += 1;
    if (markers.fr.has(normalized)) counts.fr += 1;
  }
  const frenchSignals = (text.match(/[àâçéèêëîïôùûüœ]/gi) ?? []).length;
  counts.fr += Math.min(8, frenchSignals * 0.45);
  return { counts, tokens: tokens.length };
}

export function detectSourceLanguage(content: string): SourceLanguage {
  if (content.trim().length < 20) return { detectedLocale: null, confidence: null, isMultilingual: false, userOverride: null, method: "unknown" };
  const whole = score(content);
  const total = whole.counts.en + whole.counts.fr;
  if (total < 2) return { detectedLocale: null, confidence: Math.min(0.35, whole.tokens / 100), isMultilingual: false, userOverride: null, method: "unknown" };
  const detectedLocale = whole.counts.fr > whole.counts.en ? "fr" : "en";
  const leading = Math.max(whole.counts.fr, whole.counts.en);
  const confidence = Math.min(0.99, 0.55 + (leading / total - 0.5) * 0.8 + Math.min(total, 30) / 150);
  const segments = content.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-ZÀ-Ö])/).filter((segment) => segment.length > 35);
  const segmentLocales = segments.map((segment) => { const result = score(segment).counts; if (result.en + result.fr < 2) return null; return result.fr > result.en ? "fr" : "en"; }).filter(Boolean);
  const isMultilingual = segmentLocales.includes("fr") && segmentLocales.includes("en") && Math.min(segmentLocales.filter((item) => item === "fr").length, segmentLocales.filter((item) => item === "en").length) / segmentLocales.length >= 0.2;
  return { detectedLocale, confidence: Math.round(confidence * 100) / 100, isMultilingual, userOverride: null, method: "local_heuristic" };
}

export function sourceLocale(source: ProjectSource) {
  return source.language.userOverride ?? source.language.detectedLocale;
}

export function determineDominantLanguage(sources: ProjectSource[], recentAnswers: string[] = []): string | null {
  const weights = new Map<string, number>();
  for (const source of sources) {
    const locale = sourceLocale(source);
    if (!locale) continue;
    const weight = Math.max(1, Math.min(5, source.content.length / 500)) * (source.language.confidence ?? 0.5);
    weights.set(locale, (weights.get(locale) ?? 0) + weight);
  }
  for (const answer of recentAnswers.slice(-3)) {
    const detection = detectSourceLanguage(answer);
    if (detection.detectedLocale) weights.set(detection.detectedLocale, (weights.get(detection.detectedLocale) ?? 0) + 0.75 * (detection.confidence ?? 0.5));
  }
  const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const total = ranked.reduce((sum, [, weight]) => sum + weight, 0);
  return ranked[0][1] / total >= 0.58 ? ranked[0][0] : null;
}
