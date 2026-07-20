# ScopeForge

> Estimate projects faster from the documents you already have.

ScopeForge helps project leads, consultants, agencies and service companies turn meeting notes, commercial notes, briefs and transcripts into a structured scope and an initial estimate. It consolidates complementary sources, keeps paragraph-level citations, prepares the questions that affect delivery and turns recorded decisions into editable low / likely / high effort ranges.

AI proposes structures and targeted changes. Zod validates every AI output, deterministic TypeScript calculates totals, and no AI change is applied without an explicit accept action.

ScopeForge provides a shared, repeatable estimation process while leaving assumptions, effort and final approval with the team. The product includes a source citation drawer, priority filters, decision history, a searchable estimation workshop, controlled AI review and separate internal and client views.

## How GPT-5.6 is used

GPT-5.6 powers the reasoning steps that benefit from reading and reconciling unstructured project material:

- consolidating complementary sources while preserving paragraph-level citations;
- classifying what each source introduces, confirms, complements, refines or duplicates;
- identifying genuine inconsistencies, missing information and useful clarification questions;
- proposing a structured scope and initial low / likely / high effort ranges;
- reviewing one selected estimate line and returning an explicit before/after proposal.

Every model response is parsed as a Structured Output and validated with Zod. Imported documents are wrapped as untrusted project data, citation identifiers are checked against the submitted paragraphs, and a Live project never falls back silently to demonstration fixtures. GPT-5.6 does not calculate totals, approve estimates, apply revisions or decide what is shown to the client. Those actions remain deterministic and user-controlled.

## How Codex was used

Codex was the implementation partner throughout Build Week. It was used to inspect and translate the product specifications into the Next.js architecture, implement the domain and UI slices, integrate the OpenAI Responses API, build the bilingual catalogs, create deterministic estimation and export logic, and write the automated tests. It also ran lint, strict TypeScript checks, Vitest, production builds and Playwright-based browser/PDF verification while iterating on accessibility, responsive behavior and the client-safe document model.

The result is not a collection of disconnected prompts: Codex helped build and stabilize the complete workflow from document import to traceable analysis, human decisions, estimate approval, revision history, client PDF/XLSX export and portable backup.

## Multilingual product path

`Create or load a project → Add documents → Review extracted content → Analyze → Inspect contributions and open cited paragraphs → Answer or defer important questions → Build scope → Generate estimate → Review and approve the estimate → Generate the client proposal → Export`

Two self-contained demonstration projects are bundled. Morrow Ridge exercises the original English P0. Calyra combines two French sources with a bilingual technical memo, consolidates equivalent requirements in French, preserves original English excerpts and generates a French estimate and client proposal. Projects created manually are live projects and never receive demonstration fixtures.

The project dashboard can also create, rename, duplicate, archive and remove local dossiers. Interface language, project working language and client-output language remain independent. Project and estimation preferences are persisted behind a repository abstraction.

The P1 memory layer adds three shared estimation methods and a local library of fictional reference cases. From a project, select a method and up to three cases; ScopeForge explains textual matches, sends them to GPT-5.6 as advisory context, records any concrete influence, and compares the current deterministic totals with a selected case. Historical cases never become project requirements and are never shown in the client-ready proposal. Open **Methods / Méthodes** and **References / Références** from the dashboard to manage the local libraries.

Every AI request now has a visible operation state in the project step and shell: preparation, request, processing, validation, elapsed time, success or failure. Duplicate submissions are blocked and a result is discarded when its project sources or decisions changed while the request was running. **Project settings / Réglages du projet** is available for every project, including newly created Live projects.

The project readiness checklist now uses seven reachable business milestones. Internal approval creates an immutable local estimate snapshot; the client proposal can only be generated from that snapshot. Creating a new revision keeps the approved snapshot and returns the working estimate to review.

## Quick start

Requirements: Node.js 20.11+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Open demo project**. The interface language determines which bundled project opens; both remain available on the dashboard.

Without an API key, only projects explicitly marked as demonstrations can use the clearly labelled precomputed fallback. Live projects preserve their sources and show a configuration error. To use the real OpenAI integration:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_PRIMARY_MODEL=gpt-5.6
DEMO_MODE=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENAI_API_KEY` is read only by the server route. `DEMO_MODE=true` forces precomputed output only for demonstration projects; it never changes a live project. `OPENAI_MODEL` remains accepted as a legacy alias for `OPENAI_PRIMARY_MODEL`.

## Safe public demonstration profile

The frozen Build Week deployment profile is Demo-only. Set `DEPLOYMENT_PROFILE=public_demo`, leave `OPENAI_API_KEY` empty, and keep Component Lab and diagnostics disabled. A Live project request is rejected server-side with `PUBLIC_LIVE_DISABLED`; a disabled browser button is not used as the security boundary.

Recommended Vercel configuration:

```text
Framework preset: Next.js
Root directory: repository root
Node.js: 20.11 or newer
Install command: npm ci
Build command: npm run build
```

Configure the following variables for both Preview and Production:

```env
DEPLOYMENT_PROFILE=public_demo
DEMO_MODE=true
ALLOW_PUBLIC_LIVE_AI=false
ENABLE_COMPONENT_LAB=false
ENABLE_DIAGNOSTICS=false
OPENAI_PRIMARY_MODEL=gpt-5.6
MAX_UPLOAD_BYTES=10485760
MAX_AI_PAYLOAD_BYTES=1000000
MAX_PDF_PAYLOAD_BYTES=2000000
AI_REQUEST_TIMEOUT_MS=90000
NEXT_PUBLIC_APP_URL=https://your-deployment.example
```

Do not configure `OPENAI_API_KEY` on the public demonstration. Run the profile gate before deploying:

```bash
DEPLOYMENT_PROFILE=public_demo DEMO_MODE=true ALLOW_PUBLIC_LIVE_AI=false ENABLE_COMPONENT_LAB=false ENABLE_DIAGNOSTICS=false MAX_UPLOAD_BYTES=10485760 MAX_AI_PAYLOAD_BYTES=1000000 MAX_PDF_PAYLOAD_BYTES=2000000 AI_REQUEST_TIMEOUT_MS=90000 npm run predeploy:check
```

## Recommended English demo (under three minutes)

1. Keep the interface in English, load **Morrow Ridge** and inspect its complementary project sources. Optionally add a `.txt`, `.md`, text `.pdf` or `.docx`, review the extraction preview and confirm it.
2. Run **Analyze sources**. Point out the `Demo · Precomputed` or `Live · GPT-5.6` label.
3. Open **Source contributions** and one citation. Show the original excerpt and paragraph provenance. Note that complementary sources are not treated as contradictory by default.
4. Filter the clarification set and record the prefilled manual wait-list decision.
5. Build the scope, then generate the estimate.
6. Search or filter the estimate, edit one likely value and change one module between Included and Optional. Totals update instantly.
7. Select a line, choose **Challenge this estimate**, inspect the before/after diff, optionally modify the proposed range, then accept or reject it.
8. Open the readiness checklist, acknowledge any non-blocking warning, then validate the estimate internally. Generate the client proposal from the approved snapshot.
9. Switch between Internal and Client-ready. Internal risks, confidence, citations and reserve details disappear from the client view.
10. Print the internal review directly, or open the validated client document and download its generated PDF. XLSX exports are available separately for internal and client use.

Use **Reset demo** in the left rail before a new take.

The recording and visual-QA working files are kept locally under `docs/`. That directory is intentionally ignored by Git so screenshots and internal preparation material do not enter the public repository history.

## Architecture

```text
src/
├── app/             Next.js pages and server-only AI endpoint
├── domain/          Zod contracts, entities and deterministic rules
├── use-cases/       Human-controlled state transitions
├── infrastructure/  OpenAI, repository abstraction and demonstration fixtures
├── i18n/            FR/EN catalogs, glossary and Intl formatting
└── ui/              Accessible workspace, screens and local persistence
```

- The browser persists multiple projects through a repository abstraction backed by `localStorage`; the previous single-demo key is migrated automatically.
- `/api/ai/[action]` handles analysis, questions, scope, estimate and targeted review.
- `/api/proposals/pdf` generates a vector client PDF from a Zod-validated, client-safe document projection. It never prints the application shell.
- `src/infrastructure/estimation-library.ts` contains versioned local repositories, deterministic reference matching, method overrides and estimate comparison. It is intentionally isolated from the UI so a future server repository can replace local storage.
- OpenAI Responses API structured outputs are parsed with `responses.parse` and `zodTextFormat`.
- A second model attempt is allowed after invalid structured output; errors remain recoverable.
- Source content is wrapped as untrusted project data and cannot override the system instructions.
- Returned citation identifiers are checked against the submitted source paragraphs.
- Client proposal projection intentionally omits internal rationale, risks, confidence, citations and reserve details.

The public README documents the supported release path. Internal design, audit and recording notes remain in the local, Git-ignored `docs/` workspace.

### Static images and Next.js

Brand assets live in `public/brand/` and are referenced as `/brand/<filename>` from the application. Next.js copies `public/` into the deployment output and serves these files from the site root. The UI uses `next/image` with explicit dimensions to prevent layout shifts; local SVG logos are marked `unoptimized` so Vercel serves the exact vector files without invoking the image optimizer. No remote image host or `remotePatterns` configuration is required.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run predeploy:check  # with the reviewed public profile variables
npm run qa:browser       # requires a running local server
npm run qa:pdf           # requires a running local server
```

Priority tests cover deterministic aggregation, source-language detection and dominance, FR/EN catalogs and formats, original/translated citations, local project lifecycle, question transitions, decision traceability, AI diff editing/acceptance/rejection, and client-data sanitization in both demos.
P1 tests also cover method overrides, reference matching explanations, deterministic comparisons, reference import/export and creating a case from a validated estimate.

The latest verified baseline is 72 tests across 21 files. A clean temporary copy without `.env.local`, caches, build output or existing dependencies completes `npm ci`, lint, strict TypeScript, tests and the production build.

## Export

- **Internal print:** the internal review can be printed directly, including the information intended for the project team.
- **Client PDF:** available only after internal estimate approval and client-proposal generation. The server creates a standalone A4 PDF with selectable text and no application navigation.
- **Internal XLSX:** detailed editable workbook with estimate, decisions, sources and internal provenance.
- **Client XLSX:** filtered workbook without revision, confidence, checksums, internal references or private notes.
- **Project backup:** versioned JSON containing the complete local project, sources, provenance, history and approved snapshots for safe restoration as a copy.

Client document settings are available in **Step 5 / Internal / Client document settings**. They control the client rate, currency, discount, optional taxes, low/likely/high effort presentation and whether the PDF includes prices, rates, effort, context, assumptions, exclusions, conditions, planning, options or acceptance fields.

## Security and privacy

- Only demonstration data is bundled; it does not represent a real person or company.
- API keys never enter client components or browser storage.
- Imported documents are treated as untrusted input and cannot override server instructions.
- AI output is schema-validated and citations are provenance-checked.
- Calculations and change application remain deterministic and user-controlled.

This is a hackathon Release Candidate, not a production multi-tenant system. It has no authentication, organization permissions, OCR for scanned PDFs or remote database. The public profile is therefore Demo-only instead of exposing unauthenticated billable routes. Document extraction is limited to 10 MB by default and preserves paragraph text rather than complex document layout.

## Current limitations

- Local-only multi-project persistence; no accounts, cloud sync or collaboration.
- TXT, Markdown, text PDF and DOCX import are supported through a confirmed extraction preview. Scanned PDF OCR and exact layout reconstruction remain deferred.
- Live GPT behavior depends on model access and an OpenAI API key; the fallback is explicitly visible.
- Client PDF generation uses the Node.js runtime and must be smoke-tested on the authorized hosting platform before release.
- Reference search is local and explainable; embeddings, shared server memory and full estimate snapshot restore are deferred.
- Changing client language localizes proposal chrome and exports but deliberately does not silently translate previously accepted narrative.
- Production deployment is not performed automatically; it requires the owner's Vercel credentials and approval.

## License

No final open-source license has been selected during the hackathon, as required by the product decision log. All bundled content belongs to the demonstration projects and uses invented identities and information.
