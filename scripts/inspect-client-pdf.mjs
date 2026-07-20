import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const baseUrl = process.env.SCOPEFORGE_URL ?? "http://127.0.0.1:3000";
const outputDir = "docs/screenshots/rc-pdf";

const settings = {
  documentType: "proposal",
  title: "Proposition commerciale",
  issuerName: "ScopeForge Studio",
  issuerAddress: "",
  issuerEmail: "",
  issuerPhone: "",
  clientName: "Atelier Horizon",
  reference: "SF-CONTROLE-PDF",
  issueDate: "2026-07-18",
  validityDays: 30,
  currency: "MAD",
  pricingMode: "time_and_materials",
  clientRate: 850,
  effortDisplay: "likely",
  showPrices: true,
  showRates: true,
  showEffort: true,
  showContext: true,
  showAssumptions: true,
  showExclusions: true,
  showConditions: true,
  showTaxes: true,
  taxRate: 0.1,
  discountRate: 0.05,
  showPlanning: true,
  showOptions: true,
  showAcceptance: true,
  paymentTerms: "30 % au démarrage, puis facturation mensuelle selon l’avancement validé.",
  startConditions: "Validation du périmètre et mise à disposition des interlocuteurs projet.",
  clientResponsibilities: "Fournir les contenus et valider les livrables dans les délais convenus.",
  changePolicy: "Toute évolution du périmètre fait l’objet d’une estimation complémentaire.",
  finalNotes: "Cette proposition repose sur les hypothèses présentées dans le document.",
  accentColor: "#0d5c50",
  logoDataUrl: null,
};

const baseLines = [
  ["Cadrage", "Ateliers de lancement", "Préparation, animation et synthèse des ateliers nécessaires pour confirmer les priorités, les responsabilités et les critères de validation."],
  ["Expérience", "Parcours responsive", "Conception et réalisation des parcours principaux sur ordinateur, tablette et mobile avec gestion des états vides et des erreurs."],
  ["Plateforme", "Gestion des opérations", "Mise en œuvre des fonctions de saisie, consultation, modification et suivi nécessaires au périmètre initial."],
  ["Qualité", "Recette et stabilisation", "Vérification fonctionnelle, corrections et préparation de la mise à disposition du premier périmètre validé."],
];

const included = Array.from({ length: 16 }, (_, index) => {
  const source = baseLines[index % baseLines.length];
  const likely = index === 15 ? 3.5 : 2.5;
  return {
    id: `LINE-${index + 1}`,
    workstream: source[0],
    name: `${source[1]} ${index + 1}`,
    description: source[2],
    status: "included",
    low: Math.max(1, likely - 1),
    likely,
    high: likely + 1.5,
    unit: "day",
    rate: 850,
    amount: likely * 850,
  };
});

const document = {
  schemaVersion: 1,
  id: "PROP-CONTROLE",
  projectId: "PROJECT-CONTROLE",
  estimateSnapshotId: "ESTIMATE-CONTROLE",
  locale: "fr",
  status: "validated",
  generatedAt: "2026-07-18T20:00:00.000Z",
  validatedAt: "2026-07-18T19:00:00.000Z",
  revision: 3,
  settings,
  project: {
    name: "Portail de coordination Atlas",
    clientName: "Atelier Horizon",
    context: "L’équipe souhaite centraliser les informations actuellement dispersées entre plusieurs documents et échanges.",
    objective: "Mettre à disposition un premier périmètre exploitable et une estimation claire.",
    approach: "Le projet est organisé en lots vérifiables, avec des hypothèses explicites et des options séparées du périmètre inclus.",
  },
  included,
  options: [{ ...included[0], id: "OPTION-1", status: "optional", name: "Tableau de bord avancé", likely: 4, low: 3, high: 6, amount: 3400 }],
  exclusions: [
    { id: "EX-1", name: "Application mobile native", description: "Non comprise dans le périmètre initial." },
    { id: "EX-2", name: "Reprise historique complète", description: "À cadrer séparément après l’inventaire des données disponibles." },
  ],
  assumptions: Array.from({ length: 14 }, (_, index) => `Hypothèse ${index + 1} : les éléments nécessaires à la validation seront fournis dans les délais convenus et les changements majeurs feront l’objet d’un ajustement explicite.`),
  decisions: [],
  planning: baseLines.map((line) => ({ name: line[0], description: `Phase indicative pour ${line[1].toLowerCase()}.` })),
  totals: {
    effortLow: 27,
    effortLikely: 43.6,
    effortHigh: 65,
    reserveLikely: 22.5,
    optionsLikely: 4,
    subtotal: 37050,
    discount: 1852.5,
    totalExcludingTax: 35197.5,
    tax: 3519.75,
    totalIncludingTax: 38717.25,
    optionsAmount: 3400,
  },
};

await mkdir(outputDir, { recursive: true });
const withoutPrices = {
  subtotal: null, discount: null, totalExcludingTax: null, tax: null, totalIncludingTax: null, optionsAmount: null,
};
const englishLines = included.map((line, index) => ({ ...line, workstream: ["Discovery", "Experience", "Platform", "Quality"][index % 4], name: `Delivery module ${index + 1}`, description: "A client-facing service description with clear responsibilities, expected output and review criteria." }));
const fixtures = [
  ["proposal-short-fr", { ...document, included: included.slice(0, 2), options: [], exclusions: [], assumptions: document.assumptions.slice(0, 1), planning: document.planning.slice(0, 1) }],
  ["proposal-standard-fr", { ...document, included: included.slice(0, 8), assumptions: document.assumptions.slice(0, 5) }],
  ["proposal-long-fr", document],
  ["proposal-fixed-fr", { ...document, settings: { ...settings, pricingMode: "fixed_price", showRates: false } }],
  ["proposal-time-materials-fr", { ...document, settings: { ...settings, pricingMode: "time_and_materials", showRates: true } }],
  ["proposal-effort-only-fr", { ...document, settings: { ...settings, pricingMode: "effort_only", showPrices: false, showRates: false, showTaxes: false }, included: included.slice(0, 8).map((line) => ({ ...line, rate: null, amount: null })), totals: { ...document.totals, ...withoutPrices } }],
  ["proposal-options-fr", { ...document, included: included.slice(0, 6), options: Array.from({ length: 7 }, (_, index) => ({ ...included[index % included.length], id: `OPTION-${index}`, status: "optional", name: `Option complémentaire ${index + 1}` })) }],
  ["proposal-without-tax-fr", { ...document, settings: { ...settings, showTaxes: false, taxRate: 0 }, totals: { ...document.totals, tax: 0, totalIncludingTax: document.totals.totalExcludingTax } }],
  ["proposal-with-tax-fr", document],
  ["proposal-standard-en", { ...document, locale: "en", settings: { ...settings, title: "Project proposal", reference: "SF-PDF-EN", currency: "GBP" }, project: { name: "Atlas coordination portal", clientName: "Horizon Workshop", context: "The team needs a shared portal built from the available project information.", objective: "Deliver a reviewable first scope and estimate.", approach: "The proposal separates included services, options and working assumptions." }, included: englishLines.slice(0, 8), assumptions: ["The client supplies final content and reviews deliverables within the agreed timeframe."], planning: [{ name: "Delivery", description: "Indicative delivery phase." }] }],
  ["proposal-long-titles-fr", { ...document, included: included.slice(0, 8).map((line, index) => ({ ...line, name: `Prestation au libellé volontairement long pour vérifier le retour à la ligne ${index + 1}` })) }],
  ["proposal-minimal-en", { ...document, locale: "en", settings: { ...settings, title: "Project estimate", reference: "SF-MIN-EN", pricingMode: "effort_only", showPrices: false, showRates: false, showContext: false, showAssumptions: false, showExclusions: false, showConditions: false, showTaxes: false, showPlanning: false, showOptions: false, showAcceptance: false }, project: { name: "Simple web project", clientName: "Example client", context: "", objective: "", approach: "" }, included: englishLines.slice(0, 3).map((line) => ({ ...line, rate: null, amount: null })), options: [], exclusions: [], assumptions: [], planning: [], totals: { ...document.totals, ...withoutPrices } }],
];

let pdf;
for (const [name, fixture] of fixtures) {
  const response = await fetch(`${baseUrl}/api/proposals/pdf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ document: fixture }),
  });
  if (!response.ok) throw new Error(`${name} returned ${response.status}: ${await response.text()}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(`${outputDir}/${name}.pdf`, buffer);
  if (name === "proposal-long-fr") pdf = buffer;
}
if (!pdf) throw new Error("The representative long PDF was not generated");

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = `${resolve(scriptDirectory, "../node_modules/pdfjs-dist/standard_fonts")}/`;
const pdfDocument = await getDocument({ data: new Uint8Array(pdf), standardFontDataUrl }).promise;
const extractedPages = [];
for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
  const pdfPage = await pdfDocument.getPage(pageNumber);
  const viewport = pdfPage.getViewport({ scale: 1.65 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  await pdfPage.render({ canvasContext: context, viewport }).promise;
  await writeFile(`${outputDir}/proposal-long-fr-page-${pageNumber}.png`, canvas.toBuffer("image/png"));
  const textContent = await pdfPage.getTextContent();
  extractedPages.push(textContent.items.map((item) => "str" in item ? item.str : "").join(" "));
}
await writeFile(`${outputDir}/proposal-long-fr.txt`, extractedPages.join("\n\n"));

console.log(JSON.stringify({
  pdf: `${outputDir}/proposal-long-fr.pdf`,
  fixtures: fixtures.length,
  pageImages: pdfDocument.numPages,
  bytes: pdf.byteLength,
  totalsText: extractedPages.find((pageText) => pageText.includes("Sous-total HT")) ?? null,
}, null, 2));
