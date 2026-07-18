# ScopeForge

> From messy client notes to a traceable, editable project estimate and client-ready proposal.

ScopeForge is an OpenAI Build Week 2026 MVP for project leads, consultants and agencies. It consolidates multiple complementary sources, preserves paragraph-level provenance, identifies the few unknowns that materially affect delivery, and turns approved decisions into an editable low / likely / high estimate.

AI proposes structures and targeted changes. Zod validates every AI output, deterministic TypeScript calculates totals, and no AI change is applied without an explicit accept action.

![ScopeForge multi-source analysis](docs/screenshots/04-contributions.png)

The final product pass includes a source-evidence drawer, priority filters and decision history, a searchable estimate workshop with contextual copilot, and professional Internal / Client-ready proposal projections. Its visual system combines an editorial, warm-ivory presentation with restrained, spatial controls: provenance green carries meaning, black pill actions establish hierarchy, and information-heavy screens remain calm without hiding evidence.

## Multilingual product path

`Load demo → Inspect or import sources → Analyze → Inspect contributions and open cited paragraphs → Answer a question → Build scope → Generate estimate → Edit and filter ranges → Challenge one line → Accept or reject the diff → Switch Internal/Client → Export`

Two entirely fictional demonstrations are bundled. Morrow Ridge exercises the original English P0. Calyra combines two French sources with a bilingual technical memo, consolidates semantic evidence in French, preserves original English excerpts and generates a French estimate and client proposal.

The project dashboard can also create, rename, duplicate, archive and remove local dossiers. Interface language, project working language and client-output language remain independent. Project and estimation preferences are persisted behind a repository abstraction.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Load English demo** or **Load French demo**.

Without an API key the complete workflow uses a clearly labelled, precomputed demo fallback. To use the real OpenAI integration:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENAI_API_KEY` is read only by the server route. Use `OPENAI_MODEL=gpt-4.1-mini` when that is the available model for the environment.

## Demo script (under three minutes)

1. Switch the interface to FR, load Calyra and inspect its FR/FR/Mixed source badges. Optionally import a local `.md` or `.txt` file.
2. Run **Analyze sources**. Point out the `Demo fallback` or live model label.
3. Open **Apports par source** and one English citation. Show its original excerpt and separate French translation. Note that no inconsistency is manufactured.
4. Filter the clarification set and record the prefilled manual wait-list decision.
5. Build the scope, then generate the estimate.
6. Search or filter the estimate, edit one likely value and change one module between Included and Optional. Totals update instantly.
7. Select a line, choose **Challenge this estimate**, inspect the before/after diff, optionally modify the proposed range, then accept or reject it.
8. Open Preview and switch between Internal and Client-ready. Internal risks, confidence, citations and reserve details disappear from the client view.
9. Use **Print / PDF**, **Estimate CSV** in Internal view, or the header **Export JSON** action.

Use **Reset demo** in the left rail before a new take.

The timestamped recording flow is available in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md); the no-submit-without-approval checklist is in [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md).

### Final screens

| Product promise | Multi-source provenance |
|---|---|
| ![ScopeForge entry](docs/screenshots/00-entry.png) | ![Multi-source contributions](docs/screenshots/04-contributions.png) |

| Human-controlled estimate diff | Client-ready proposal |
|---|---|
| ![Editable AI diff](docs/screenshots/11-ai-diff.png) | ![Client-ready proposal](docs/screenshots/12-preview-client.png) |

## Architecture

```text
src/
├── app/             Next.js pages and server-only AI endpoint
├── domain/          Zod contracts, entities and deterministic rules
├── use-cases/       Human-controlled state transitions
├── infrastructure/  OpenAI, repository abstraction and fictional demos
├── i18n/            FR/EN catalogs, glossary and Intl formatting
└── ui/              Accessible workspace, screens and local persistence
```

- The browser persists multiple projects through a repository abstraction backed by `localStorage`; the previous single-demo key is migrated automatically.
- `/api/ai/[action]` handles analysis, questions, scope, estimate and targeted review.
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

## Export

- **Print / PDF:** the proposal uses a print-specific layout and the browser's reliable Save as PDF path.
- **JSON:** exports the traceable working dossier for inspection or backup.
- **CSV:** exports a UTF-8, Excel-compatible estimate with workstream, ranges, risk, confidence and source references.

## Security and privacy

- Only fictional data is bundled.
- API keys never enter client components or browser storage.
- Imported text is considered untrusted evidence.
- AI output is schema-validated and citations are provenance-checked.
- Calculations and change application remain deterministic and user-controlled.

This is a hackathon MVP, not a production multi-tenant system. It has no authentication, organization permissions, native PDF renderer, remote database, large-file ingestion or production rate limiting. Those are intentionally outside the release candidate.

Internationalisation details: [`I18N_ARCHITECTURE.md`](I18N_ARCHITECTURE.md), [`ADDING_A_LANGUAGE.md`](ADDING_A_LANGUAGE.md), [`PROJECT_LANGUAGE_RULES.md`](PROJECT_LANGUAGE_RULES.md) and [`FEATURE_EXTENSION_STATUS.md`](FEATURE_EXTENSION_STATUS.md).

## Current limitations

- Local-only multi-project persistence; no accounts, cloud sync or collaboration.
- Text and Markdown import are supported. PDF parsing is documented as deferred in [`REMAINING_WORK.md`](REMAINING_WORK.md).
- Live GPT behavior depends on model access and an OpenAI API key; the fallback is explicitly visible.
- Browser print output is the primary PDF mechanism.
- Changing client language localizes proposal chrome and exports but deliberately does not silently translate previously accepted narrative; see [`PROJECT_LANGUAGE_RULES.md`](PROJECT_LANGUAGE_RULES.md).
- Production deployment is not performed automatically; it requires the owner's Vercel credentials and approval.

## Built with Codex and GPT-5.6

Codex was used to turn the project documents into the application architecture, implementation, tests and browser-validation workflow. GPT-5.6 is the default live model for evidence consolidation, clarification generation, scope generation, estimate ranges and targeted line review. Human answers, manual edits, totals and acceptance decisions remain outside model control.

## License

No final open-source license has been selected during the hackathon, as required by the product decision log. All included demo content is fictional.
