import { describe, expect, it } from "vitest";
import { normalizeSource } from "./source";
import { detectSourceLanguage, determineDominantLanguage } from "./language";

describe("source provenance", () => {
  it("assigns stable paragraph identifiers", () => {
    const source = normalizeSource("SRC-09", "Test", "Demo", "First paragraph.\n\nSecond paragraph.");
    expect(source.paragraphs.map((paragraph) => paragraph.id)).toEqual(["SRC-09-P001", "SRC-09-P002"]);
  });

  it("detects French and English locally", () => {
    expect(detectSourceLanguage("Le projet doit permettre aux utilisateurs de consulter les contenus avant le lancement.").detectedLocale).toBe("fr");
    expect(detectSourceLanguage("The project must allow users to review content before launch and export the final data.").detectedLocale).toBe("en");
  });

  it("detects a materially multilingual source", () => {
    const language = detectSourceLanguage("Le projet doit permettre aux utilisateurs de consulter les programmes avant le lancement.\n\nThe technical platform must provide role-based access, audit history and accessible content for all users.");
    expect(language.isMultilingual).toBe(true);
  });

  it("resolves a stable dominant language across sources", () => {
    const french = normalizeSource("S1", "FR", "Test", "Le projet doit permettre aux utilisateurs de consulter les contenus et de préparer le lancement avec des données fiables.");
    const frenchTwo = normalizeSource("S2", "FR2", "Test", "Les équipes doivent gérer le projet, les utilisateurs et les contenus depuis une interface accessible.");
    const english = normalizeSource("S3", "EN", "Test", "The project should export data before launch.");
    expect(determineDominantLanguage([french, frenchTwo, english])).toBe("fr");
  });
});
