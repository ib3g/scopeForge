# ScopeForge

> From messy client notes to a traceable, editable project estimate and client-ready proposal.

ScopeForge is an OpenAI Build Week 2026 MVP for project leads, consultants and agencies. It consolidates multiple complementary sources, preserves paragraph-level provenance, identifies the few unknowns that materially affect delivery, and turns approved decisions into an editable low / likely / high estimate.

AI proposes structures and targeted changes. Zod validates every AI output, deterministic TypeScript calculates totals, and no AI change is applied without an explicit accept action.

![ScopeForge multi-source analysis](docs/screenshots/04-contributions.png)

The final product pass includes a source-evidence drawer, priority filters and decision history, a searchable estimate workshop with contextual copilot, and professional Internal / Client-ready proposal projections.

## P0 demo path

`Load demo → Inspect or import sources → Analyze → Inspect contributions and open cited paragraphs → Answer a question → Build scope → Generate estimate → Edit and filter ranges → Challenge one line → Accept or reject the diff → Switch Internal/Client → Export`

The bundled Morrow Ridge scenario is entirely fictional. Three complementary sources cover an editorial retreat experience, controlled applications and deposits, cohort operations, sensitive-data permissions, accessibility and launch readiness.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Load demo project**.

Without an API key the complete workflow uses a clearly labelled, precomputed demo fallback. To use the real OpenAI integration:

```env
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`OPENAI_API_KEY` is read only by the server route. Use `OPENAI_MODEL=gpt-4.1-mini` when that is the available model for the environment.

## Demo script (under three minutes)

1. Load Morrow Ridge and inspect its three source cards. Optionally import a local `.md` or `.txt` file.
2. Run **Analyze sources**. Point out the `Demo fallback` or live model label.
3. Open **Source contributions** and one citation. Note that no inconsistency panel is manufactured.
4. Filter the clarification set and record the prefilled manual wait-list decision.
5. Build the scope, then generate the estimate.
6. Search or filter the estimate, edit one likely value and change one module between Included and Optional. Totals update instantly.
7. Select a line, choose **Challenge this estimate**, inspect the before/after diff, then accept or reject it.
8. Open Preview and switch between Internal and Client-ready. Internal risks, confidence, citations and reserve details disappear from the client view.
9. Use **Print / PDF**, **Estimate CSV** in Internal view, or the header **Export JSON** action.

Use **Reset demo** in the left rail before a new take.

The timestamped recording flow is available in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md); the no-submit-without-approval checklist is in [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md).

### Final screens

| Estimate workshop | Client-ready proposal |
|---|---|
| ![Estimate workshop](docs/screenshots/09-estimate.png) | ![Client-ready proposal](docs/screenshots/12-preview-client.png) |

## Architecture

```text
src/
├── app/             Next.js pages and server-only AI endpoint
├── domain/          Zod contracts, entities and deterministic rules
├── use-cases/       Human-controlled state transitions
├── infrastructure/  OpenAI Responses API and fictional demo data
└── ui/              Accessible workspace, screens and local persistence
```

- The browser persists one Morrow Ridge demo dossier in `localStorage` for repeatable local and hosted demos.
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

Priority tests cover deterministic aggregation, options and exclusions, reserve application, ordered ranges, stable paragraph references, question transitions, decision traceability, AI diff acceptance/rejection, and client-data sanitization.

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

This is a hackathon MVP, not a production multi-tenant system. It has no authentication, organization permissions, native PDF renderer, database, large-file ingestion or production rate limiting. Those are intentionally outside P0.

## Current limitations

- One persistent demo project per browser.
- Text and Markdown import are supported. PDF parsing is documented as deferred in [`REMAINING_WORK.md`](REMAINING_WORK.md).
- Live GPT behavior depends on model access and an OpenAI API key; the fallback is explicitly visible.
- Browser print output is the primary PDF mechanism.
- Production deployment is not performed automatically; it requires the owner's Vercel credentials and approval.

## Built with Codex and GPT-5.6

Codex was used to turn the project documents into the application architecture, implementation, tests and browser-validation workflow. GPT-5.6 is the default live model for evidence consolidation, clarification generation, scope generation, estimate ranges and targeted line review. Human answers, manual edits, totals and acceptance decisions remain outside model control.

## License

No final open-source license has been selected during the hackathon, as required by the product decision log. All included demo content is fictional.
