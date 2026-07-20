import { mkdir, rm } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.SCOPEFORGE_URL ?? "http://127.0.0.1:3000";
const outputDir = "docs/screenshots/submission-en";

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1500, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: "light",
  reducedMotion: "reduce",
  bypassCSP: true,
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.on("pageerror", (error) => console.error("page error:", error.message));
page.on("console", (message) => {
  if (message.type() === "error") console.error("browser console:", message.text());
});

const shot = async (name, locator) => {
  if (locator) await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(220);
  await page.screenshot({
    path: `${outputDir}/${name}.jpg`,
    type: "jpeg",
    quality: 91,
    fullPage: false,
  });
  console.log(`captured ${name}.jpg`);
};

const top = async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(120);
};

const capturePdfPreview = async () => {
  const output = `${outputDir}/15-client-pdf-deliverable.jpg`;
  const pages = page.locator(".client-document-page");
  await pages.first().waitFor({ timeout: 30_000 });
  await page.screenshot({ path: output, type: "jpeg", quality: 91, fullPage: false });
  console.log(`captured 15-client-pdf-deliverable.jpg (${await pages.count()} PDF pages)`);
};

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("scopeforge-interface-locale-v1", "en");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Open demo project/i }).waitFor();
  // Wait for the landing page event handlers to hydrate before using the CTA.
  await page.waitForTimeout(700);
  await shot("01-project-entry");

  await page.getByRole("button", { name: /Open demo project/i }).click();
  await page.waitForTimeout(500);
  console.log(`after demo click: ${page.url()}`);
  await page.waitForURL(/\/projects\/[^/]+\/sources/, { waitUntil: "commit" });
  const projectId = page.url().match(/\/projects\/([^/]+)/)?.[1];
  if (!projectId) throw new Error("Demo project ID not found");
  const skipTour = page.getByRole("button", { name: /Skip the tour/i });
  if (await skipTour.count()) await skipTour.click();
  if (await page.locator(".source-editor").count()) {
    await page.locator(".source-card-head > button").first().click();
  }
  await shot("02-complementary-sources", page.locator(".source-package"));

  await page.locator(".source-card-head > button").first().click();
  await shot("03-source-language-and-content", page.locator(".source-editor").first());
  await page.locator(".source-card-head > button").first().click();

  await page.getByRole("button", { name: /Analyze sources/i }).click();
  await page.waitForURL(/\/analysis/, { waitUntil: "commit" });
  await page.locator(".analysis-summary").waitFor();
  await top();
  await shot("04-consolidated-analysis");

  await page.getByRole("button", { name: /^Source contributions$/i }).click();
  await shot("05-source-contributions", page.locator(".contribution-card").first());

  await page.locator(".citation-chip").first().click();
  await page.locator(".citation-drawer").waitFor();
  await shot("06-citation-and-provenance");
  await page.getByRole("button", { name: /Close/i }).last().click();

  await page.getByRole("button", { name: /Prepare clarification questions/i }).click();
  await page.waitForURL(/\/questions/, { waitUntil: "commit" });
  await top();
  await shot("07-clarification-questions");

  const recordDecision = page.getByRole("button", { name: /Record decision/i }).first();
  if (await recordDecision.count()) await recordDecision.click();
  while (await page.getByRole("button", { name: /Defer to framing/i }).count()) {
    await page.getByRole("button", { name: /Defer to framing/i }).first().click();
  }

  await page.getByRole("button", { name: /Build the scope/i }).click();
  await page.waitForURL(/\/estimate/, { waitUntil: "commit" });
  await page.getByRole("button", { name: /Generate estimate/i }).waitFor();
  await top();
  await shot("08-structured-scope");

  await page.getByRole("button", { name: /Generate estimate/i }).click();
  await page.getByRole("button", { name: /Approve estimate/i }).waitFor();
  await page.locator(".estimate-table-wrap").scrollIntoViewIfNeeded();
  await shot("09-estimation-workshop");

  await page.getByRole("button", { name: /Project settings/i }).click();
  const useReference = page.getByRole("button", { name: /Use as context/i }).first();
  if (await useReference.count()) await useReference.click();
  const compare = page.getByRole("button", { name: /Compare estimate/i }).first();
  if (!(await compare.count())) throw new Error("Reference comparison action not found");
  await compare.click();
  await page.locator("#estimate-comparison").waitFor();
  await shot("10-reference-comparison", page.locator("#estimate-comparison"));

  await top();
  await page.getByRole("button", { name: /Project settings/i }).click();
  await page.getByRole("heading", { name: /Project settings/i }).waitFor();
  await shot("11-estimation-settings");
  await page.getByRole("button", { name: /Close/i }).last().click();

  await top();
  await page.getByRole("button", { name: /Readiness checklist/i }).first().click();
  await page.getByRole("heading", { name: /Project readiness/i }).waitFor();
  await shot("12-project-readiness");
  await page.getByRole("button", { name: /Close/i }).last().click();

  for (const checkbox of await page.locator(".estimate-approval-panel .readiness-warning input:not(:disabled)").all()) {
    if (!(await checkbox.isChecked())) await checkbox.check();
  }
  await page.getByRole("button", { name: /Approve estimate/i }).click();

  await page.goto(`${baseUrl}/projects/${projectId}/preview`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Generate client proposal/i }).click();
  await top();
  await shot("13-internal-proposal-review");

  await page.getByRole("button", { name: /^Client-ready$/i }).click();
  await page.getByText(/Included scope/i).first().waitFor();
  await top();
  await shot("14-client-ready-proposal");

  await page.getByRole("button", { name: /Open client PDF/i }).click();
  await page.waitForURL(/\/proposals\/[^/]+\/document/, { waitUntil: "commit" });
  await page.locator(".client-document-page").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_200);
  await capturePdfPreview();

  console.log(JSON.stringify({ outputDir, projectId, count: 15 }, null, 2));
} finally {
  await browser.close();
}
