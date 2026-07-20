import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const required = {
  DEPLOYMENT_PROFILE: "public_demo",
  DEMO_MODE: "true",
  ALLOW_PUBLIC_LIVE_AI: "false",
  ENABLE_COMPONENT_LAB: "false",
  ENABLE_DIAGNOSTICS: "false",
};

for (const [key, expected] of Object.entries(required)) {
  if (process.env[key] !== expected)
    failures.push(`${key} must be ${expected} for the public demonstration profile.`);
}
if (process.env.OPENAI_API_KEY)
  failures.push("OPENAI_API_KEY must not be configured on the Demo-only public deployment.");

for (const key of ["MAX_UPLOAD_BYTES", "MAX_AI_PAYLOAD_BYTES", "MAX_PDF_PAYLOAD_BYTES", "AI_REQUEST_TIMEOUT_MS"]) {
  if (!Number.isFinite(Number(process.env[key])) || Number(process.env[key]) <= 0)
    failures.push(`${key} must be a positive number.`);
}

const example = readFileSync(".env.example", "utf8");
if (/OPENAI_API_KEY=\S+/.test(example)) failures.push(".env.example contains a non-empty API key.");

const ignoreFile = readFileSync(".gitignore", "utf8");
for (const [path, fallbackPattern] of [
  [".env.local", ".env*"],
  ["docs/screenshots/", "docs/screenshots/"],
  ["reports/evals/", "reports/evals/"],
]) {
  if (!existsSync(".git")) {
    if (!ignoreFile.split(/\r?\n/).includes(fallbackPattern))
      failures.push(`${path} is not covered by .gitignore.`);
    continue;
  }
  try {
    execFileSync("git", ["check-ignore", "-q", path], { stdio: "ignore" });
  } catch {
    failures.push(`${path} is not ignored by Git.`);
  }
}

if (failures.length) {
  console.error("ScopeForge pre-deployment check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("ScopeForge public Demo profile is configured safely.");
console.log("Run lint, typecheck, tests and build before requesting deployment authorization.");
