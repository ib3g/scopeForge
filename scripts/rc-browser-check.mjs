import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SCOPEFORGE_URL ?? "http://localhost:3000";
const outputDir = "docs/screenshots/final";
const downloadDir = ".qa/rc-downloads";
await mkdir(outputDir, { recursive: true });
await mkdir(downloadDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(8000);

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem("scopeforge-interface-locale-v1", "fr");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(350);
await page.screenshot({ path: `${outputDir}/01-accueil.png`, fullPage: true });

await page.getByRole("button", { name: /Créer un projet/i }).first().click();
const publicNotice = await page.getByText(/installation locale/i).first().isVisible();
await page.getByRole("button", { name: /Fermer/i }).click();

await page.getByRole("button", { name: /Ouvrir le projet de démonstration/i }).click();
await page.waitForURL(/\/projects\/[^/]+\/sources/);
const projectId = page.url().match(/\/projects\/([^/]+)/)?.[1];
if (!projectId) throw new Error("Demo project ID not found");
await page.waitForTimeout(300);
const skipTour = page.getByRole("button", { name: /Ignorer la visite/i });
if (await skipTour.count()) await skipTour.click();
await page.screenshot({ path: `${outputDir}/02-sources.png`, fullPage: true });

await page.getByRole("button", { name: /Analyser les sources/i }).click();
await page.waitForURL(/\/analysis/);
await page.screenshot({ path: `${outputDir}/03-analyse.png`, fullPage: true });
const citation = page.locator(".citation-chip").first();
await citation.click();
await page.screenshot({ path: `${outputDir}/04-provenance.png`, fullPage: true });
await page.getByRole("button", { name: /Fermer/i }).click();

await page.getByRole("button", { name: /Préparer les questions de clarification/i }).click();
await page.waitForURL(/\/questions/);
await page.screenshot({ path: `${outputDir}/05-questions.png`, fullPage: true });
const record = page.getByRole("button", { name: /Enregistrer la décision/i }).first();
if (await record.count()) await record.click();
while (await page.getByRole("button", { name: /Reporter au cadrage/i }).count())
  await page.getByRole("button", { name: /Reporter au cadrage/i }).first().click();

await page.getByRole("button", { name: /Construire le périmètre/i }).click();
await page.waitForURL(/\/estimate/);
await page.getByRole("button", { name: /Générer l’estimation/i }).click();
await page.getByRole("button", { name: /Valider l’estimation/i }).waitFor();
await page.screenshot({ path: `${outputDir}/06-estimation.png`, fullPage: true });

await page.getByRole("button", { name: /Réglages du projet/i }).click();
const selectReference = page.getByRole("button", { name: /Sélectionner/i }).first();
if (await selectReference.count()) await selectReference.click();
const compareReference = page.getByRole("button", { name: /Comparer l.estimation/i }).first();
if (await compareReference.count()) {
  await compareReference.click();
  await page.locator("#estimate-comparison").waitFor();
  await page.screenshot({ path: `${outputDir}/07-comparaison.png`, fullPage: true });
} else {
  await page.getByRole("button", { name: /Fermer/i }).click();
}

for (const checkbox of await page.locator(".estimate-approval-panel .readiness-warning input:not(:disabled)").all())
  await checkbox.check();
await page.locator(".estimate-approval-panel").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${outputDir}/08-validation.png`, fullPage: false });
await page.getByRole("button", { name: /Valider l’estimation/i }).click();

await page.goto(`${baseUrl}/projects/${projectId}/preview`, { waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Générer la proposition client/i }).click();
await page.getByRole("button", { name: /Version client/i }).click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${outputDir}/09-proposition-client.png`, fullPage: true });

const xlsxDownload = page.waitForEvent("download");
await page.getByRole("button", { name: /Classeur XLSX client/i }).click();
const xlsx = await xlsxDownload;
await xlsx.saveAs(`${downloadDir}/${xlsx.suggestedFilename()}`);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(250);
await page.screenshot({ path: `${outputDir}/10-mobile.png`, fullPage: true });

const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
const responsiveChecks = [];
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 834, height: 1112 },
]) {
  await page.setViewportSize(viewport);
  for (const step of ["sources", "estimate", "preview"]) {
    await page.goto(`${baseUrl}/projects/${projectId}/${step}`, { waitUntil: "domcontentloaded" });
    responsiveChecks.push({
      viewport: `${viewport.width}x${viewport.height}`,
      step,
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    });
  }
}
const componentLabStatus = await page.request.get(`${baseUrl}/component-lab`).then((response) => response.status());
const liveBoundary = await page.request.post(`${baseUrl}/api/ai/analysis`, {
  data: { projectMode: "live", payload: { sources: [] } },
}).then(async (response) => ({ status: response.status(), body: await response.json() }));

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${baseUrl}/projects/${projectId}/sources`, { waitUntil: "domcontentloaded" });
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
await page.locator(".demo-tour").waitFor();
const firstResetSources = await page.locator(".source-card-head").count();
await page.getByRole("button", { name: /Ignorer la visite/i }).click();
await page.getByRole("button", { name: /Analyser les sources/i }).click();
await page.waitForURL(/\/analysis/);
await page.reload({ waitUntil: "domcontentloaded" });
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: /Réinitialiser la démo/i }).click();
await page.waitForURL(/\/sources/);
await page.locator(".demo-tour").waitFor();
const secondResetSources = await page.locator(".source-card-head").count();

console.log(JSON.stringify({
  projectId,
  publicNotice,
  componentLabStatus,
  liveBoundary,
  mobileOverflow,
  responsiveChecks,
  xlsx: xlsx.suggestedFilename(),
  reset: {
    firstResetSources,
    secondResetSources,
    restoredTour: await page.locator(".demo-tour").isVisible(),
  },
}, null, 2));

await browser.close();
