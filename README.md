# ScopeForge

> Estimate projects faster from the documents you already have.

ScopeForge helps project leads, consultants, agencies and service companies turn meeting notes, commercial notes, briefs and transcripts into a structured scope and an initial estimate. It consolidates complementary sources, keeps paragraph-level citations, prepares the questions that affect delivery and turns recorded decisions into editable low / likely / high effort ranges.

AI proposes structures and targeted changes. Zod validates every AI output, deterministic TypeScript calculates totals, and no AI change is applied without an explicit accept action.

ScopeForge provides a shared, repeatable estimation process while leaving assumptions, effort and final approval with the team. The product includes a source citation drawer, priority filters, decision history, a searchable estimation workshop, controlled AI review and separate internal and client views.

## Multilingual product path

`Create or load a project → Add documents → Review extracted content → Analyze → Inspect contributions and open cited paragraphs → Answer or defer important questions → Build scope → Generate estimate → Review and approve the estimate → Generate the client proposal → Export`

Two self-contained demonstration projects are bundled. Morrow Ridge exercises the original English P0. Calyra combines two French sources with a bilingual technical memo, consolidates equivalent requirements in French, preserves original English excerpts and generates a French estimate and client proposal. Projects created manually are live projects and never receive demonstration fixtures.

The project dashboard can also create, rename, duplicate, archive and remove local dossiers. Interface language, project working language and client-output language remain independent. Project and estimation preferences are persisted behind a repository abstraction.

The P1 memory layer adds three shared estimation methods and a local library of fictional reference cases. From a project, select a method and up to three cases; ScopeForge explains textual matches, sends them to GPT-5.6 as advisory context, records any concrete influence, and compares the current deterministic totals with a selected case. Historical cases never become project requirements and are never shown in the client-ready proposal. Open **Methods / Méthodes** and **References / Références** from the dashboard to manage the local libraries.

Every AI request now has a visible operation state in the project step and shell: preparation, request, processing, validation, elapsed time, success or failure. Duplicate submissions are blocked and a result is discarded when its project sources or decisions changed while the request was running. **Project settings / Réglages du projet** is available for every project, including newly created Live projects.

The project readiness checklist now uses seven reachable business milestones. Internal approval creates an immutable local estimate snapshot; the client proposal can only be generated from that snapshot. Creating a new revision keeps the approved snapshot and returns the working estimate to review.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Load English demo** or **Load French demo**.

Without an API key, only projects explicitly marked as demonstrations can use the clearly labelled precomputed fallback. Live projects preserve their sources and show a configuration error. To use the real OpenAI integration:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_PRIMARY_MODEL=gpt-5.6
DEMO_MODE=false
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENAI_API_KEY` is read only by the server route. `DEMO_MODE=true` forces precomputed output only for demonstration projects; it never changes a live project. `OPENAI_MODEL` remains accepted as a legacy alias for `OPENAI_PRIMARY_MODEL`.

## Demo script (under three minutes)

1. Switch the interface to FR, load Calyra and inspect its FR/FR/Mixed source badges. Optionally add a `.txt`, `.md`, text `.pdf` or `.docx`, review the extraction preview and confirm it.
2. Run **Analyze sources**. Point out the `Demo · Precomputed` or `Live · GPT-5.6` label.
3. Open **Apports par source** and one English citation. Show its original excerpt and separate French translation. Note that no inconsistency is manufactured.
4. Filter the clarification set and record the prefilled manual wait-list decision.
5. Build the scope, then generate the estimate.
6. Search or filter the estimate, edit one likely value and change one module between Included and Optional. Totals update instantly.
7. Select a line, choose **Challenge this estimate**, inspect the before/after diff, optionally modify the proposed range, then accept or reject it.
8. Open the readiness checklist, acknowledge any non-blocking warning, then validate the estimate internally. Generate the client proposal from the approved snapshot.
9. Switch between Internal and Client-ready. Internal risks, confidence, citations and reserve details disappear from the client view.
10. Use **Print / PDF**, **Estimate CSV** in Internal view, or the header **Export JSON** action.

Use **Reset demo** in the left rail before a new take.

The timestamped recording flow is available in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md); the no-submit-without-approval checklist is in [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md).

### Visual QA artifacts

Browser captures are generated locally in `docs/screenshots/` during visual QA. The complete directory is intentionally ignored by Git so binary review artifacts do not enter the repository history.

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
- `src/infrastructure/estimation-library.ts` contains versioned local repositories, deterministic reference matching, method overrides and estimate comparison. It is intentionally isolated from the UI so a future server repository can replace local storage.
- OpenAI Responses API structured outputs are parsed with `responses.parse` and `zodTextFormat`.
- A second model attempt is allowed after invalid structured output; errors remain recoverable.
- Source content is wrapped as untrusted project data and cannot override the system instructions.
- Returned citation identifiers are checked against the submitted source paragraphs.
- Client proposal projection intentionally omits internal rationale, risks, confidence, citations and reserve details.

Important implementation tradeoffs and fallback choices are recorded in [`DECISIONS.md`](DECISIONS.md).

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Priority tests cover deterministic aggregation, source-language detection and dominance, FR/EN catalogs and formats, original/translated citations, local project lifecycle, question transitions, decision traceability, AI diff editing/acceptance/rejection, and client-data sanitization in both demos.
P1 tests also cover method overrides, reference matching explanations, deterministic comparisons, reference import/export and creating a case from a validated estimate.

## Export

- **Print / PDF:** the proposal uses a print-specific layout and the browser's reliable Save as PDF path.
- **JSON:** exports the traceable working dossier for inspection or backup.
- **CSV:** exports a UTF-8, Excel-compatible estimate with workstream, ranges, risk, confidence and source references.

## Security and privacy

- Only demonstration data is bundled; it does not represent a real person or company.
- API keys never enter client components or browser storage.
- Imported documents are treated as untrusted input and cannot override server instructions.
- AI output is schema-validated and citations are provenance-checked.
- Calculations and change application remain deterministic and user-controlled.

This is a hackathon MVP, not a production multi-tenant system. It has no authentication, organization permissions, OCR for scanned PDFs, remote database or production rate limiting. Document extraction is limited to 10 MB and preserves paragraph text rather than complex document layout.

Internationalisation details: [`I18N_ARCHITECTURE.md`](I18N_ARCHITECTURE.md), [`ADDING_A_LANGUAGE.md`](ADDING_A_LANGUAGE.md), [`PROJECT_LANGUAGE_RULES.md`](PROJECT_LANGUAGE_RULES.md) and [`FEATURE_EXTENSION_STATUS.md`](FEATURE_EXTENSION_STATUS.md). Product copy follows [`EDITORIAL_GUIDELINES.md`](EDITORIAL_GUIDELINES.md), and live AI testing is documented in [`LIVE_AI_TESTING.md`](LIVE_AI_TESTING.md).

## Current limitations

- Local-only multi-project persistence; no accounts, cloud sync or collaboration.
- TXT, Markdown, text PDF and DOCX import are supported through a confirmed extraction preview. Scanned PDF OCR and exact layout reconstruction remain deferred in [`DOCUMENT_IMPORT_STATUS.md`](DOCUMENT_IMPORT_STATUS.md).
- Live GPT behavior depends on model access and an OpenAI API key; the fallback is explicitly visible.
- Browser print output is the primary PDF mechanism.
- Reference search is local and explainable; embeddings, shared server memory and full estimate snapshot restore are deferred.
- Changing client language localizes proposal chrome and exports but deliberately does not silently translate previously accepted narrative; see [`PROJECT_LANGUAGE_RULES.md`](PROJECT_LANGUAGE_RULES.md).
- Production deployment is not performed automatically; it requires the owner's Vercel credentials and approval.

## Built with Codex and GPT-5.6

Codex was used to turn the project documents into the application architecture, implementation, tests and browser-validation workflow. GPT-5.6 is the default live model for source consolidation, clarification generation, scope generation, estimate ranges and targeted line review. Human answers, manual edits, totals and acceptance decisions remain outside model control.

## License

No final open-source license has been selected during the hackathon, as required by the product decision log. All bundled content belongs to the demonstration projects and uses invented identities and information.
