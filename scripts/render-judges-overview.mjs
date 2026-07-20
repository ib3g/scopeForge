import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const packRoot = process.env.JUDGES_PACK_DIR ?? "/tmp/ScopeForge-Judges-Pack";
const dataUrl = async (relativePath, mime) =>
  `data:${mime};base64,${(await readFile(resolve(packRoot, relativePath))).toString("base64")}`;

const sources = await dataUrl("SCREENSHOTS/01_SOURCES.jpg", "image/jpeg");
const provenance = await dataUrl("SCREENSHOTS/02_CONSOLIDATION_AND_PROVENANCE.jpg", "image/jpeg");
const questions = await dataUrl("SCREENSHOTS/03_CLARIFICATION_AND_DECISION.jpg", "image/jpeg");
const estimate = await dataUrl("SCREENSHOTS/04_ESTIMATION.jpg", "image/jpeg");
const architecture = await dataUrl("ARCHITECTURE.png", "image/png");

const footer = (page) => `<footer><span>ScopeForge · OpenAI Build Week 2026</span><span>${page} / 4</span></footer>`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ScopeForge overview</title><style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; color: #182019; background: #f8f7f2; font-family: Arial, Helvetica, sans-serif; }
.page { width: 297mm; height: 210mm; padding: 14mm; position: relative; break-after: page; overflow: hidden; background: #f8f7f2; }
.page:last-child { break-after: auto; }
.eyebrow { margin: 0 0 4mm; color: #0d5c50; font-size: 9pt; font-weight: 700; letter-spacing: .13em; }
h1 { max-width: 230mm; margin: 0 0 5mm; font-size: 29pt; line-height: 1.04; letter-spacing: -.035em; }
h2 { margin: 0 0 5mm; font-size: 20pt; line-height: 1.1; letter-spacing: -.02em; }
.lead { max-width: 245mm; margin: 0; color: #4e574f; font-size: 12pt; line-height: 1.5; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 9mm; }
.card { min-height: 37mm; padding: 5mm; border: .3mm solid #d8ddd7; background: white; }
.card strong { display: block; margin-bottom: 3mm; font-size: 11pt; }
.card p { margin: 0; color: #4b554c; font-size: 9.2pt; line-height: 1.45; }
.workflow { margin-top: 8mm; padding: 6mm; border-left: 1.2mm solid #0d5c50; background: #e3efe9; font-size: 10.5pt; line-height: 1.5; }
.shots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; margin-top: 6mm; }
.shot img { display: block; width: 100%; aspect-ratio: 3 / 2; object-fit: cover; border: .3mm solid #d5d9d3; }
.shot p { margin: 2.5mm 0 0; color: #616a62; font-size: 8.5pt; }
.architecture { display: block; width: 214mm; margin: 3mm auto 0; }
.compact { margin-top: 4mm; gap: 4mm; }
.compact .card { min-height: 29mm; padding: 4mm; }
.compact .card p { font-size: 8.1pt; line-height: 1.35; }
footer { position: absolute; left: 14mm; right: 14mm; bottom: 7mm; display: flex; justify-content: space-between; color: #788078; font-size: 7.5pt; }
</style></head><body>
<section class="page">
  <p class="eyebrow">PROJECT SCOPING AND ESTIMATION</p>
  <h1>Turn the project information you already have into a reviewable scope and estimate.</h1>
  <p class="lead">ScopeForge consolidates meeting notes, briefs and project documents, preserves where each material statement came from, prepares clarification decisions, and generates an estimate that a team can verify and adjust.</p>
  <div class="cards">
    <article class="card"><strong>The problem</strong><p>Sales, consulting and delivery teams repeatedly reconstruct the same project understanding from fragmented documents before they can estimate. Important assumptions and evidence are easily lost.</p></article>
    <article class="card"><strong>The product</strong><p>A shared workflow from multi-source analysis to clarification, structured scope, deterministic effort, internal approval and a client-safe proposal.</p></article>
    <article class="card"><strong>The outcome</strong><p>A fast first estimate that is traceable and adjustable—not an automatic promise of accuracy. The responsible team retains control of assumptions, effort and approval.</p></article>
  </div>
  <div class="workflow">Sources → consolidation → evidence and gaps → clarification decisions → scope → low / likely / high estimate → controlled revision → validated PDF and XLSX</div>
  ${footer(1)}
</section>
<section class="page">
  <p class="eyebrow">THE CORE WORKFLOW</p>
  <h2>Evidence remains visible from source consolidation to clarification.</h2>
  <div class="shots">
    <article class="shot"><img src="${sources}" alt="Complementary project sources"><p>Complementary sources and language-aware content</p></article>
    <article class="shot"><img src="${provenance}" alt="Citation provenance drawer"><p>Clickable citation with the original passage</p></article>
  </div>
  ${footer(2)}
</section>
<section class="page">
  <p class="eyebrow">FROM OPEN POINTS TO A REVIEWABLE ESTIMATE</p>
  <h2>Decisions and effort remain editable and traceable.</h2>
  <div class="shots">
    <article class="shot"><img src="${questions}" alt="Clarification question"><p>Clarification question, impact and recorded decision</p></article>
    <article class="shot"><img src="${estimate}" alt="Estimation workshop"><p>Editable estimate with deterministic totals and reserve</p></article>
  </div>
  ${footer(3)}
</section>
<section class="page">
  <p class="eyebrow">ARCHITECTURE, CONTROL AND LIMITS</p>
  <h2>GPT-5.6 structures evidence; the application owns calculations and approval.</h2>
  <img class="architecture" src="${architecture}" alt="ScopeForge architecture diagram">
  <div class="cards compact">
    <article class="card"><strong>GPT-5.6</strong><p>Produces schema-validated consolidation, questions, scope suggestions and line-review proposals. Original excerpts remain attached to citations. Demo mode uses clearly labelled prepared results.</p></article>
    <article class="card"><strong>Codex</strong><p>Supported repository inspection, domain and UI implementation, test creation, debugging, PDF/XLSX hardening, accessibility checks and release documentation throughout the Build Week build.</p></article>
    <article class="card"><strong>Known limits</strong><p>Local browser persistence only; no accounts or collaboration; scanned PDFs need OCR; public Live AI is intentionally disabled until authentication, quotas and rate limiting exist.</p></article>
  </div>
  ${footer(4)}
</section>
</body></html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: resolve(packRoot, "SCOPEFORGE_OVERVIEW.pdf"),
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  console.log(`Rendered ${resolve(packRoot, "SCOPEFORGE_OVERVIEW.pdf")}`);
} finally {
  await browser.close();
}
