import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const scenarios = JSON.parse(await readFile(resolve("src/evals/scenarios.json"), "utf8"));
const requested = (process.env.EVAL_SCENARIOS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const confirmation = process.env.EVAL_LIVE_CONFIRM;
const baseUrl = process.env.EVAL_BASE_URL ?? "http://localhost:3000";

console.log("Available ScopeForge Live evaluation scenarios:");
for (const scenario of scenarios) console.log(`- ${scenario.id}: ${scenario.title}`);

if (!process.env.OPENAI_API_KEY) {
  console.error("\nOPENAI_API_KEY is not available in this shell. No Live evaluation was started.");
  process.exit(1);
}
if (confirmation !== "scopeforge-live-eval") {
  console.error("\nSet EVAL_LIVE_CONFIRM=scopeforge-live-eval to confirm billable Live calls.");
  process.exit(1);
}
if (!requested.length) {
  console.error("\nSelect one to three scenarios with EVAL_SCENARIOS=id-1,id-2.");
  process.exit(1);
}
if (requested.length > 3) {
  console.error("\nA maximum of three scenarios is allowed per run.");
  process.exit(1);
}

const selected = requested.map((id) => scenarios.find((scenario) => scenario.id === id));
if (selected.some((scenario) => !scenario)) {
  console.error("\nAt least one requested scenario does not exist.");
  process.exit(1);
}

const report = { generatedAt: new Date().toISOString(), baseUrl, scenarios: [] };
for (const scenario of selected) {
  const started = Date.now();
  const payload = {
    sources: scenario.sources.map((source) => ({ ...source, content: source.paragraphs.map((paragraph) => paragraph.text).join("\n\n") })),
    languageContext: { interfaceLocale: scenario.locale, projectLanguage: scenario.locale, clientOutputLanguage: scenario.locale },
    estimationContext: { references: scenario.references ?? [] },
  };
  try {
    const response = await fetch(`${baseUrl}/api/ai/analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectMode: "live", payload }) });
    const result = await response.json();
    const data = result.data ?? null;
    const validParagraphs = new Set(scenario.sources.flatMap((source) => source.paragraphs.map((paragraph) => `${source.id}:${paragraph.id}`)));
    const citations = [];
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object") return;
      if (typeof value.sourceId === "string" && typeof value.paragraphId === "string") citations.push(`${value.sourceId}:${value.paragraphId}`);
      Object.values(value).forEach(visit);
    };
    visit(data);
    const failures = [];
    if (!response.ok) failures.push(result.code ?? result.error ?? `HTTP ${response.status}`);
    if (!data || typeof data !== "object") failures.push("Missing structured data");
    if (!citations.length) failures.push("No citations returned");
    if (citations.some((citation) => !validParagraphs.has(citation))) failures.push("Invalid citation returned");
    if (scenario.tags.includes("genuine_inconsistency") && !data?.inconsistencies?.length) failures.push("Expected inconsistency missing");
    if (scenario.tags.includes("no_inconsistency") && data?.inconsistencies?.length) failures.push("Unexpected inconsistency");
    report.scenarios.push({
      id: scenario.id,
      model: result.execution?.model ?? null,
      promptVersion: result.execution?.promptVersion ?? null,
      durationMs: Date.now() - started,
      success: failures.length === 0,
      failures,
      warnings: [],
      requestId: result.execution?.requestId ?? null,
      inputTokens: result.execution?.inputTokens ?? null,
      outputTokens: result.execution?.outputTokens ?? null,
      sourceCount: scenario.sources.length,
      approximateCharacters: scenario.sources.reduce((total, source) => total + source.paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0), 0),
    });
  } catch (error) {
    report.scenarios.push({ id: scenario.id, durationMs: Date.now() - started, success: false, failures: [error instanceof Error ? error.message : "Unknown error"], warnings: [], sourceCount: scenario.sources.length });
  }
}

await mkdir(resolve("reports/evals"), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = resolve(`reports/evals/live-${stamp}.json`);
await writeFile(target, JSON.stringify(report, null, 2));
console.log(`\nLive evaluation report: ${target}`);
for (const item of report.scenarios) console.log(`${item.success ? "PASS" : "FAIL"} ${item.id} (${item.durationMs} ms)`);
if (report.scenarios.some((item) => !item.success)) process.exitCode = 1;

