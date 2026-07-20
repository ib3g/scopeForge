import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { ClientDocumentModel } from "@/domain/schemas";
import { ClientProposalPdf, formatPdfMoney, formatPdfNumber } from "./client-proposal-pdf";

const document: ClientDocumentModel = {
  schemaVersion: 1,
  id: "PROP-1",
  projectId: "P-1",
  estimateSnapshotId: "EST-1",
  locale: "en",
  status: "validated",
  generatedAt: "2026-07-18T12:00:00.000Z",
  validatedAt: "2026-07-18T11:00:00.000Z",
  revision: 1,
  settings: {
    documentType: "proposal",
    title: "Project proposal",
    issuerName: "ScopeForge Studio",
    issuerAddress: "",
    issuerEmail: "",
    issuerPhone: "",
    clientName: "Northstar Learning",
    reference: "SF-TEST-001",
    issueDate: "2026-07-18",
    validityDays: 30,
    currency: "EUR",
    pricingMode: "effort_only",
    clientRate: null,
    effortDisplay: "likely",
    showPrices: false,
    showRates: false,
    showEffort: true,
    showContext: true,
    showAssumptions: true,
    showExclusions: true,
    showConditions: true,
    showTaxes: false,
    taxRate: 0,
    discountRate: 0,
    showPlanning: true,
    showOptions: true,
    showAcceptance: false,
    paymentTerms: "",
    startConditions: "",
    clientResponsibilities: "",
    changePolicy: "",
    finalNotes: "",
    accentColor: "#0d5c50",
    logoDataUrl: null,
  },
  project: { name: "Learning portal", clientName: "Northstar Learning", context: "A structured project context.", objective: "Launch a responsive portal.", approach: "Validate scope before delivery." },
  included: [{ id: "M-1", workstream: "Delivery", name: "Portal", description: "Responsive client portal", status: "included", low: 8, likely: 10, high: 14, unit: "day", rate: null, amount: null }],
  options: [],
  exclusions: [],
  assumptions: ["Content is supplied by the client."],
  decisions: [],
  planning: [{ name: "Delivery", description: "Indicative delivery phase" }],
  totals: { effortLow: 8, effortLikely: 10, effortHigh: 14, reserveLikely: 1, optionsLikely: 0, subtotal: null, discount: null, totalExcludingTax: null, tax: null, totalIncludingTax: null, optionsAmount: null },
};

describe("client proposal PDF", () => {
  it("uses PDF-safe localized separators for French totals", () => {
    const frenchDocument = { ...document, locale: "fr" as const, settings: { ...document.settings, currency: "MAD" } };
    expect(formatPdfMoney(37_050, frenchDocument)).toBe("37 050,00 MAD");
    expect(formatPdfMoney(3_519.75, frenchDocument)).toBe("3 519,75 MAD");
    expect(formatPdfNumber(22.5, "fr")).toBe("22,5");
    expect(formatPdfMoney(37_050, frenchDocument)).not.toMatch(/[\u00a0\u202f/]/);
  });

  it("renders a real selectable-text PDF container", async () => {
    const result = await renderToBuffer(ClientProposalPdf({ document }));
    expect(result.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.byteLength).toBeGreaterThan(1_000);
    const parsed = await getDocument({ data: new Uint8Array(result) }).promise;
    const page = await parsed.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ");
    expect(text).toContain("Project proposal");
    expect(text).not.toMatch(/revision|version/i);
    expect(text).not.toContain("EST-1");
  });

  it("paginates a long proposal without rasterizing it", async () => {
    const longDocument = {
      ...document,
      included: Array.from({ length: 28 }, (_, index) => ({
        ...document.included[0],
        id: `M-${index}`,
        name: `Delivery module ${index + 1}`,
        description: "A complete client-facing description that remains readable and wraps inside the allocated table column.",
      })),
    };
    const result = await renderToBuffer(ClientProposalPdf({ document: longDocument }));
    const parsed = await getDocument({ data: new Uint8Array(result) }).promise;
    expect(parsed.numPages).toBeGreaterThan(1);
  });
});
