import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { buildClientDocument, defaultClientProposalSettings } from "@/domain/client-document";
import { calculateTotals } from "@/domain/estimation";
import { currentSourceChecksum, currentSourceVersions } from "@/domain/project-lifecycle";
import type { Citation, EstimateLine, EstimateSnapshot, ProjectAnalysis, WorkspaceState, Workstream } from "@/domain/schemas";
import { normalizeSource } from "@/domain/source";
import { ClientProposalPdf } from "@/infrastructure/client-proposal-pdf";
import { defaultEstimationMethods } from "@/infrastructure/estimation-library";
import { createXlsxWorkbook } from "@/infrastructure/xlsx-export";

const enabled = process.env.BUILD_JUDGES_PACK === "true";
const packRoot = process.env.JUDGES_PACK_DIR ?? "/tmp/ScopeForge-Judges-Pack";
const fixedNow = "2026-07-20T12:00:00.000Z";

const programmeBrief = `# Calyra programme brief

## Context
Calyra is a fictional travelling cultural mediation programme. The team wants one portal for workshops, public encounters and educational resources offered across several partner venues.

## Audiences and experience
Teachers, community organisations and families must be able to discover programmes, filter them by age, accessibility, venue and period, then submit a participation request. The experience should feel editorial and reassuring rather than like automatic ticketing.

## Content and visibility
Each programme includes an introduction, learning objectives, facilitators, access conditions and downloadable resources. English content is prepared for this judges edition; additional languages remain an explicitly planned content workflow.

## Launch exclusions
Online payment, transport management, a native mobile application and community discussion spaces are outside the initial release.`;

const functionalWorkshop = `# Calyra functional workshop

## Participation requests
An organisation creates an account, describes its group, records accessibility needs and proposes three preferred dates. A coordinator reviews the request, contacts the organisation when clarification is required, then confirms or declines participation. Places are never allocated automatically.

## Administration
Coordinators manage programmes, capacities, requests, statuses and preparation documents. Managers can export an operational list, while accessibility information remains limited to explicitly authorised roles.

## Notifications
Email messages are required when a request is received, when more information is needed, when participation is confirmed and shortly before the workshop. The delivery provider has not yet been selected.

## Decisions recorded for the estimate
Declined requests are retained for eighteen months and then deleted. Only coordinators and programme managers can view accessibility needs; only programme managers can export them.`;

const technicalMemo = `# Calyra technical launch memo

## Delivery constraints
The initial release must be delivered within eight weeks. Content will arrive progressively, so preview and draft states are required. The platform is a responsive web application with role-based access and an audit trail for request status changes.

## Quality and privacy
The public service targets WCAG 2.2 AA. Downloads must remain accessible, and consent copy must explain how sensitive information is used. Privacy-friendly analytics are limited to programme views, request starts and completed submissions.

## Handover
Delivery includes automated tests for critical workflows, a deployment guide and one administrator training session. Additional client-facing languages remain optional and must not delay the initial launch.`;

const sources = [
  normalizeSource("SRC-01", "Calyra programme brief", "Product vision · Source A", programmeBrief),
  normalizeSource("SRC-02", "Calyra functional workshop", "Functional workshop · Source B", functionalWorkshop),
  normalizeSource("SRC-03", "Calyra technical launch memo", "Technical review · Source C", technicalMemo),
];

function citation(sourceId: string, phrase: string): Citation {
  const source = sources.find((item) => item.id === sourceId);
  const paragraph = source?.paragraphs.find((item) => item.text.toLowerCase().includes(phrase.toLowerCase()));
  if (!source || !paragraph) throw new Error(`Missing Calyra citation: ${sourceId} / ${phrase}`);
  return { sourceId, paragraphId: paragraph.id, excerpt: phrase, excerptLocale: "en", translatedExcerpt: null };
}

const workstreams: Workstream[] = [
  {
    id: "WS-01", name: "Experience and content", description: "Discovery, editorial presentation and programme browsing.", order: 1,
    modules: [
      { id: "M-01", name: "Experience discovery", description: "Audience journeys, information architecture and a responsive prototype.", status: "included", features: ["Audience journeys", "Content model", "Prototype"], dependencies: [], assumptions: ["The client supplies and approves the visual identity."], citations: [citation("SRC-01", "discover programmes")] },
      { id: "M-02", name: "Programme catalogue", description: "Editorial pages, filters, facilitators and accessible resources.", status: "included", features: ["Catalogue", "Filters", "Programme pages", "Resources"], dependencies: ["M-01"], assumptions: ["Programme content is supplied progressively."], citations: [citation("SRC-01", "learning objectives")] },
      { id: "M-03", name: "Additional language workflow", description: "Localised routes, content workflow and quality review for an additional language.", status: "optional", features: ["Localised routes", "Translation workflow", "Quality review"], dependencies: ["M-02"], assumptions: ["Approved translations are supplied by the client."], citations: [citation("SRC-03", "Additional client-facing languages remain optional")] },
    ],
  },
  {
    id: "WS-02", name: "Requests and coordination", description: "Organisation accounts, requests, human review and communication.", order: 2,
    modules: [
      { id: "M-04", name: "Organisation account and request", description: "Organisation account, group details, preferred dates and accessibility needs.", status: "included", features: ["Account", "Request form", "Preferred dates", "Accessibility"], dependencies: ["M-01"], assumptions: ["Consent wording is approved before implementation."], citations: [citation("SRC-02", "creates an account")] },
      { id: "M-05", name: "Coordinator review and statuses", description: "Review queue, clarification exchanges, human decisions and capacity checks.", status: "included", features: ["Review queue", "Statuses", "Confirmation", "Capacity"], dependencies: ["M-04"], assumptions: ["Allocation remains a human decision."], citations: [citation("SRC-02", "Places are never allocated automatically")] },
      { id: "M-06", name: "Transactional email", description: "Messages covering receipt, clarification, confirmation and reminders.", status: "included", features: ["Receipt", "Clarification", "Confirmation", "Reminder"], dependencies: ["M-05"], assumptions: ["The email provider is selected during discovery."], citations: [citation("SRC-02", "Email messages are required")] },
    ],
  },
  {
    id: "WS-03", name: "Administration and launch", description: "Operations, access control, quality and handover.", order: 3,
    modules: [
      { id: "M-07", name: "Controlled administration", description: "Programme management, capacities, roles, authorised exports and audit history.", status: "included", features: ["Administration", "Roles", "Exports", "Audit history"], dependencies: ["M-04", "M-05"], assumptions: ["The initial release uses coordinator and programme-manager roles."], citations: [citation("SRC-03", "role-based access")] },
      { id: "M-08", name: "Quality and handover", description: "Accessibility review, critical tests, deployment guidance and administrator training.", status: "included", features: ["WCAG 2.2 AA", "Critical tests", "Deployment guide", "Training"], dependencies: ["M-02", "M-07"], assumptions: ["A deployment environment is available for acceptance testing."], citations: [citation("SRC-03", "automated tests for critical workflows")] },
      { id: "M-09", name: "Payment and transport", description: "Activity payments and transport coordination.", status: "excluded", features: ["Payment", "Transport"], dependencies: [], assumptions: [], citations: [citation("SRC-01", "Online payment, transport management")] },
    ],
  },
];

const estimateLines: EstimateLine[] = [
  ["E-01", "M-01", 4, 7, 10, "high", "medium", "Three audiences and several request journeys require focused discovery."],
  ["E-02", "M-02", 7, 11, 16, "high", "medium", "Editorial templates, filters, resources and accessibility are included."],
  ["E-03", "M-03", 3, 5, 8, "medium", "medium", "Localised routes, fields and content review are estimated as an option."],
  ["E-04", "M-04", 7, 11, 17, "medium", "high", "Accounts, dates, consent and sensitive accessibility data require careful validation."],
  ["E-05", "M-05", 7, 12, 18, "medium", "high", "Statuses, exchanges, human decisions and capacity rules are included."],
  ["E-06", "M-06", 4, 7, 11, "high", "medium", "Four transactional templates and delivery-event handling are required."],
  ["E-07", "M-07", 8, 13, 20, "medium", "high", "Roles, sensitive exports and a change history require explicit controls and tests."],
  ["E-08", "M-08", 6, 9, 14, "medium", "medium", "Accessibility, testing, deployment documentation and training are included."],
  ["E-09", "M-09", 0, 0, 0, "high", "low", "Explicitly excluded from the initial release."],
].map(([id, moduleId, low, likely, high, confidence, risk, rationale]) => ({ id, moduleId, low, likely, high, confidence, risk, rationale, manualOverride: false, updatedBy: "ai" }) as EstimateLine);

const analysis: ProjectAnalysis = {
  executiveSummary: "Calyra needs an editorial portal that helps organisations discover cultural programmes and submit participation requests that coordinators review manually. The sources complement one another: the programme brief defines the public experience, the workshop describes operations, and the launch memo adds delivery, accessibility and audit constraints.",
  coverageScore: 88,
  findings: [
    { id: "F-01", category: "goal", statement: "Create an editorial programme portal with controlled participation requests.", confidence: 0.99, evidenceType: "confirmed", citations: [citation("SRC-01", "one portal"), citation("SRC-02", "participation request")] },
    { id: "F-02", category: "constraint", statement: "Participation remains subject to coordinator review; places are not allocated automatically.", confidence: 1, evidenceType: "explicit", citations: [citation("SRC-02", "never allocated automatically")] },
    { id: "F-03", category: "constraint", statement: "Accessibility data requires restricted roles, clear consent and an audit trail.", confidence: 0.98, evidenceType: "confirmed", citations: [citation("SRC-02", "authorised roles"), citation("SRC-03", "audit trail")] },
    { id: "F-04", category: "exclusion", statement: "Payment, transport, native mobile and community spaces are excluded from the initial release.", confidence: 1, evidenceType: "explicit", citations: [citation("SRC-01", "outside the initial release")] },
  ],
  sourceContributions: [
    { id: "SC-01", sourceId: "SRC-01", topic: "Public experience", contribution: "Introduces the audiences, catalogue, filters and launch exclusions.", relation: "introduces", relatedFindingIds: ["F-01", "F-04"], citations: [citation("SRC-01", "filter them by age")] },
    { id: "SC-02", sourceId: "SRC-02", topic: "Request operations", contribution: "Complements discovery with accounts, human review, permissions and notifications.", relation: "complements", relatedFindingIds: ["F-01", "F-02", "F-03"], citations: [citation("SRC-02", "coordinator reviews the request")] },
    { id: "SC-03", sourceId: "SRC-03", topic: "Delivery and quality", contribution: "Refines the scope with the deadline, accessibility target, audit trail, testing and handover.", relation: "refines", relatedFindingIds: ["F-03"], citations: [citation("SRC-03", "delivered within eight weeks")] },
  ],
  duplicatesMerged: [{ statement: "Responsive web delivery", citationCount: 2 }, { statement: "Controlled accessibility data", citationCount: 2 }],
  inconsistencies: [],
  suggestedNextStep: "Validate the retention and sensitive-export decisions before approving the estimate.",
  referenceInfluences: [{ id: "RI-01", referenceId: "reference-atelier-luma", area: "estimate", statement: "The Atelier Luma fixture was used only to review accessibility and request-workflow assumptions.", provenance: "reference_case", confidence: "medium" }],
};

function createCalyraState() {
  const base: WorkspaceState = {
    project: {
      id: "calyra-judges", mode: "demo", name: "Calyra cultural programme portal", clientName: "Calyra", sector: "Cultural mediation", description: "Editorial programme discovery and controlled participation requests.", status: "internally_approved", estimationUnit: "day", currency: "EUR", contingencyRate: 0.15, projectLanguage: "en", resolvedProjectLanguage: "en", projectLanguageConfirmed: true, clientOutputLanguage: "en", estimationMethodId: "web-fixed-price", estimationMethodOverrides: {}, preferences: { teamSize: 3, productiveDaysPerMonth: 17, includeReserveInOptions: false, rounding: 0.5, showEffortInClient: true, commercialModel: "fixed_price", deliverableType: "commercial_proposal" }, createdAt: fixedNow, updatedAt: fixedNow, archivedAt: null,
    },
    sources, analysis,
    questions: [
      { id: "Q-01", text: "How long should declined requests be retained?", priority: "blocking", rationale: "The period determines deletion rules and audit behaviour.", estimationImpact: "A configurable period would add scheduled deletion and exception handling.", citations: [citation("SRC-02", "eighteen months")], status: "answered", answer: "Eighteen months, followed by deletion." },
      { id: "Q-02", text: "Which roles may export accessibility needs?", priority: "blocking", rationale: "Sensitive information requires an explicit least-privilege decision.", estimationImpact: "Granular export rights add authorisation rules and audit tests.", citations: [citation("SRC-02", "programme managers can export")], status: "answered", answer: "Programme managers only." },
    ],
    decisions: [
      { id: "D-01", sourceQuestionId: "Q-01", statement: "Declined requests are retained for eighteen months and then deleted.", kind: "client_answer", createdAt: fixedNow },
      { id: "D-02", sourceQuestionId: "Q-02", statement: "Only programme managers may export accessibility needs.", kind: "client_answer", createdAt: fixedNow },
    ],
    workstreams, estimateLines,
    activity: [{ id: "A-01", label: "Calyra estimate approved", createdAt: fixedNow, kind: "estimate" }],
    analysisVersions: [], aiExecutions: {}, referenceCaseIds: ["reference-atelier-luma"], referenceMatches: [], referenceInfluences: analysis.referenceInfluences, estimateSnapshots: [], approvedEstimateSnapshotId: null, proposalSnapshot: null, acknowledgedValidationWarnings: [],
  };
  const totals = calculateTotals(estimateLines, workstreams.flatMap((item) => item.modules), base.project.contingencyRate, base.project.preferences);
  const method = defaultEstimationMethods.find((item) => item.id === "web-fixed-price");
  const snapshot: EstimateSnapshot = {
    id: "EST-CALYRA-01", createdAt: fixedNow, author: "Local user", status: "approved", origin: "generated", reason: "Initial estimate approved for the judges pack", parentSnapshotId: null, validatedAt: fixedNow, supersededAt: null, methodId: "web-fixed-price", methodOverrides: {}, estimationUnit: "day", contingencyRate: base.project.contingencyRate, preferences: structuredClone(base.project.preferences), totals, estimateLines: structuredClone(estimateLines), workstreams: structuredClone(workstreams), assumptions: Array.from(new Set([...(method?.assumptions ?? []), ...workstreams.flatMap((item) => item.modules.flatMap((module) => module.assumptions))])), decisions: structuredClone(base.decisions), referenceCaseIds: structuredClone(base.referenceCaseIds), sourceVersions: currentSourceVersions(base), sourceChecksum: currentSourceChecksum(base), aiExecutions: {}, revision: 1,
  };
  const settings = {
    ...defaultClientProposalSettings(base), title: "Project proposal", issuerName: "ScopeForge Studio", clientName: "Calyra", reference: "SF-CALYRA-01", issueDate: "2026-07-20", currency: "EUR", pricingMode: "fixed_price" as const, clientRate: 850, effortDisplay: "likely" as const, showPrices: true, showRates: false, showEffort: true, showContext: true, showAssumptions: true, showExclusions: true, showConditions: true, showTaxes: false, taxRate: 0, discountRate: 0, showPlanning: true, showOptions: true, showAcceptance: false, paymentTerms: "30% at project start, then invoicing against accepted delivery milestones.", startConditions: "Approved scope, named decision-makers and access to the required content and environments.", clientResponsibilities: "Provide content, legal copy and consolidated feedback within the agreed review windows.", changePolicy: "Material scope changes are estimated separately and require written approval.", finalNotes: "This proposal is based on the recorded sources, decisions and working assumptions.", accentColor: "#0d5c50", logoDataUrl: null,
  };
  const document = buildClientDocument({ state: base, snapshot, settings, method: method ?? null, proposalId: "PROP-CALYRA-01", generatedAt: fixedNow });
  const state: WorkspaceState = { ...base, estimateSnapshots: [snapshot], approvedEstimateSnapshotId: snapshot.id, proposalSnapshot: { id: document.id, estimateSnapshotId: snapshot.id, generatedAt: fixedNow, clientOutputLanguage: "en", settings, document }, proposalSettings: settings, project: { ...base.project, status: "proposal_ready" } };
  return { state, snapshot, document };
}

function drawArchitectureDiagram() {
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#f7f6f1";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#11140f";
  context.font = "700 54px sans-serif";
  context.fillText("ScopeForge architecture", 92, 100);
  context.fillStyle = "#5c635a";
  context.font = "28px sans-serif";
  context.fillText("Evidence in, validated project proposal out", 94, 148);
  const stages = [
    ["1", "Project sources", "TXT · Markdown · PDF · DOCX"],
    ["2", "Safe extraction", "Segments · pages · language"],
    ["3", "GPT-5.6 consolidation", "Structured output · citations"],
    ["4", "Clarifications", "Questions · recorded decisions"],
    ["5", "Structured scope", "Workstreams · modules · options"],
    ["6", "Deterministic estimate", "Low · likely · high · reserve"],
    ["7", "Human approval", "Diff · revision · validated snapshot"],
    ["8", "Client deliverables", "Filtered PDF · XLSX · backup"],
  ];
  const boxWidth = 390;
  const boxHeight = 180;
  const startX = 90;
  const startY = 240;
  const gapX = 70;
  const gapY = 110;
  for (let index = 0; index < stages.length; index += 1) {
    const row = Math.floor(index / 4);
    const column = index % 4;
    const x = startX + column * (boxWidth + gapX);
    const y = startY + row * (boxHeight + gapY);
    context.fillStyle = index === 2 ? "#0d5c50" : "#ffffff";
    context.strokeStyle = index === 2 ? "#0d5c50" : "#d7dbd4";
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(x, y, boxWidth, boxHeight, 22);
    context.fill();
    context.stroke();
    context.fillStyle = index === 2 ? "#bfe7d9" : "#0d5c50";
    context.font = "700 23px sans-serif";
    context.fillText(stages[index][0], x + 28, y + 39);
    context.fillStyle = index === 2 ? "#ffffff" : "#151914";
    context.font = "700 27px sans-serif";
    context.fillText(stages[index][1], x + 28, y + 88);
    context.fillStyle = index === 2 ? "#d9f2e9" : "#666d64";
    context.font = "21px sans-serif";
    context.fillText(stages[index][2], x + 28, y + 130);
    if (column < 3) {
      context.strokeStyle = "#83a197";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(x + boxWidth + 12, y + boxHeight / 2);
      context.lineTo(x + boxWidth + gapX - 18, y + boxHeight / 2);
      context.stroke();
      context.beginPath();
      context.moveTo(x + boxWidth + gapX - 29, y + boxHeight / 2 - 10);
      context.lineTo(x + boxWidth + gapX - 18, y + boxHeight / 2);
      context.lineTo(x + boxWidth + gapX - 29, y + boxHeight / 2 + 10);
      context.stroke();
    }
  }
  context.fillStyle = "#e4efe9";
  context.beginPath();
  context.roundRect(90, 840, 1740, 150, 24);
  context.fill();
  context.fillStyle = "#0d5c50";
  context.font = "700 24px sans-serif";
  context.fillText("TRUST BOUNDARIES", 122, 885);
  context.fillStyle = "#25302a";
  context.font = "23px sans-serif";
  context.fillText("Server-side API key", 122, 938);
  context.fillText("Zod-validated outputs", 520, 938);
  context.fillText("Project evidence outranks references", 930, 938);
  context.fillText("No change without approval", 1430, 938);
  return canvas.toBuffer("image/png");
}

const overviewStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", color: "#182019", backgroundColor: "#f8f7f2" },
  eyebrow: { fontSize: 9, letterSpacing: 1.4, color: "#0d5c50", marginBottom: 12 },
  title: { fontSize: 31, fontFamily: "Helvetica-Bold", lineHeight: 1.08, maxWidth: 580, marginBottom: 13 },
  lead: { fontSize: 13, lineHeight: 1.5, color: "#4e574f", maxWidth: 680 },
  sectionTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  columns: { flexDirection: "row", gap: 18, marginTop: 26 },
  card: { flex: 1, padding: 15, borderWidth: 1, borderColor: "#d8ddd7", backgroundColor: "#ffffff" },
  cardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 7 },
  body: { fontSize: 9.5, lineHeight: 1.45, color: "#4b554c" },
  workflow: { marginTop: 28, padding: 18, backgroundColor: "#e3efe9", borderLeftWidth: 4, borderLeftColor: "#0d5c50" },
  workflowText: { fontSize: 11, lineHeight: 1.55 },
  screenshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 14 },
  screenshot: { width: 365, height: 243, objectFit: "cover", borderWidth: 1, borderColor: "#d5d9d3" },
  caption: { fontSize: 8, color: "#677067", marginTop: 4 },
  diagram: { width: 600, height: 338, objectFit: "contain", marginTop: 6, alignSelf: "center" },
  compactColumns: { flexDirection: "row", gap: 12, marginTop: 10 },
  bullets: { marginTop: 12, gap: 7 },
  bullet: { fontSize: 10, lineHeight: 1.4 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, fontSize: 7.5, color: "#788078", flexDirection: "row", justifyContent: "space-between" },
});

function OverviewPdf({ architecturePath, screenshotPaths }: { architecturePath: string; screenshotPaths: string[] }) {
  const footer = <View style={overviewStyles.footer} fixed><Text>ScopeForge · OpenAI Build Week 2026</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></View>;
  return <Document title="ScopeForge overview" author="ScopeForge" subject="OpenAI Build Week judges pack" language="en">
    <Page size="A4" orientation="landscape" style={overviewStyles.page}>
      <Text style={overviewStyles.eyebrow}>PROJECT SCOPING AND ESTIMATION</Text>
      <Text style={overviewStyles.title}>Turn the project information you already have into a reviewable scope and estimate.</Text>
      <Text style={overviewStyles.lead}>ScopeForge consolidates meeting notes, briefs and project documents, preserves where each material statement came from, prepares clarification decisions, and generates an estimate that a team can verify and adjust.</Text>
      <View style={overviewStyles.columns}>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>The problem</Text><Text style={overviewStyles.body}>Sales, consulting and delivery teams repeatedly reconstruct the same project understanding from fragmented documents before they can estimate. Important assumptions and evidence are easily lost.</Text></View>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>The product</Text><Text style={overviewStyles.body}>A shared workflow from multi-source analysis to clarification, structured scope, deterministic effort, internal approval and a client-safe proposal.</Text></View>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>The outcome</Text><Text style={overviewStyles.body}>A fast first estimate that is traceable and adjustable—not an automatic promise of accuracy. The responsible team retains control of assumptions, effort and approval.</Text></View>
      </View>
      <View style={overviewStyles.workflow}><Text style={overviewStyles.workflowText}>Sources → consolidation → evidence and gaps → clarification decisions → scope → low / likely / high estimate → controlled revision → validated PDF and XLSX</Text></View>
      {footer}
    </Page>
    <Page size="A4" orientation="landscape" style={overviewStyles.page}>
      <Text style={overviewStyles.eyebrow}>THE CORE WORKFLOW</Text>
      <Text style={overviewStyles.sectionTitle}>Evidence remains visible from source consolidation to clarification.</Text>
      <View style={overviewStyles.screenshotGrid}>
        {/* React PDF Image primitives do not expose an HTML alt prop. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <View><Image src={screenshotPaths[0]} style={overviewStyles.screenshot} /><Text style={overviewStyles.caption}>Complementary sources and language-aware content</Text></View>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <View><Image src={screenshotPaths[1]} style={overviewStyles.screenshot} /><Text style={overviewStyles.caption}>Clickable citation with the original passage</Text></View>
      </View>
      {footer}
    </Page>
    <Page size="A4" orientation="landscape" style={overviewStyles.page}>
      <Text style={overviewStyles.eyebrow}>FROM OPEN POINTS TO A REVIEWABLE ESTIMATE</Text>
      <Text style={overviewStyles.sectionTitle}>Decisions and effort remain editable and traceable.</Text>
      <View style={overviewStyles.screenshotGrid}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <View><Image src={screenshotPaths[2]} style={overviewStyles.screenshot} /><Text style={overviewStyles.caption}>Clarification question, impact and recorded decision</Text></View>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <View><Image src={screenshotPaths[3]} style={overviewStyles.screenshot} /><Text style={overviewStyles.caption}>Editable estimate with deterministic totals and reserve</Text></View>
      </View>
      {footer}
    </Page>
    <Page size="A4" orientation="landscape" style={overviewStyles.page}>
      <Text style={overviewStyles.eyebrow}>ARCHITECTURE, CONTROL AND LIMITS</Text>
      <Text style={overviewStyles.sectionTitle}>GPT-5.6 structures evidence; the application owns calculations and approval.</Text>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={architecturePath} style={overviewStyles.diagram} />
      <View style={overviewStyles.compactColumns}>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>GPT-5.6</Text><Text style={overviewStyles.body}>Produces schema-validated consolidation, questions, scope suggestions and line-review proposals. Original excerpts remain attached to citations. Demo mode uses clearly labelled prepared results.</Text></View>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>Codex</Text><Text style={overviewStyles.body}>Supported repository inspection, domain and UI implementation, test creation, debugging, PDF/XLSX hardening, accessibility checks and release documentation throughout the Build Week build.</Text></View>
        <View style={overviewStyles.card}><Text style={overviewStyles.cardTitle}>Known limits</Text><Text style={overviewStyles.body}>Local browser persistence only; no accounts or collaboration; scanned PDFs need OCR; public Live AI is intentionally disabled until authentication, quotas and rate limiting exist.</Text></View>
      </View>
      {footer}
    </Page>
  </Document>;
}

const readme = `# ScopeForge — Judges Pack

ScopeForge helps sales, consulting and delivery teams move faster from existing project documents to a structured scope and a first estimate they can verify and adjust.

## Problem

Project information usually arrives across meeting notes, commercial briefs, functional workshops, transcripts and technical constraints. Teams spend time rebuilding the same understanding, and the origin of assumptions is often lost before estimation begins.

## Main workflow

1. Add complementary project sources.
2. Consolidate requirements while preserving citations and source contributions.
3. Identify missing information and genuine inconsistencies.
4. Record clarification answers as traceable decisions.
5. Build a structured scope and deterministic low / likely / high estimate.
6. Review proposed changes before accepting or rejecting them.
7. Approve an immutable estimate revision and generate client-safe PDF and XLSX deliverables.

## Use of GPT-5.6

GPT-5.6 is used for structured multi-source consolidation, clarification questions, scope generation, initial estimation proposals and contextual review of a selected estimate line. Outputs are validated with Zod. Citations retain their original excerpts. Final totals are always calculated by application code, and no proposed change is applied without explicit user approval.

## Use of Codex

Codex was used as an implementation partner throughout the Build Week sprint: inspecting the evolving repository, implementing domain and interface slices, writing tests, debugging Live/Demo boundaries, refining bilingual UX, hardening PDF and XLSX exports, and preparing release documentation and reproducible QA scripts.

## Known limitations

- Persistence is local to the browser; there are no accounts, cloud sync or real-time collaboration.
- Scanned PDFs require OCR and are not supported in this Release Candidate.
- Public Live AI is intentionally disabled until real authentication, quotas and server-side rate limiting are available.
- The proposal template is configurable but is not a legal, tax or electronic-signature service.
- Live quality depends on source completeness and model access; the team remains responsible for the final estimate.

## Links

- Public demo: [PUBLIC_DEMO_URL]
- Source repository: [REPOSITORY_URL]
- Submission video: [VIDEO_URL]
- Feedback session: [FEEDBACK_SESSION_URL]

## Personal note

I am a native French speaker from Guinea, currently working in Morocco, where French is the language I use most frequently in my professional environment. I prepared this submission in English to make it accessible to the judges, but I apologize in advance for any language or pronunciation mistakes in the written materials or video narration.

I also discovered OpenAI Build Week relatively late and started building ScopeForge on Thursday, July 16. This gave me only a few days to move from the initial idea to a working Release Candidate.

Within that time, I focused on delivering a complete and reliable core workflow rather than presenting disconnected AI features: multi-source consolidation, provenance, clarification decisions, deterministic estimation, human-controlled AI revisions, versioning, and client-ready PDF and Excel exports.

Regardless of the competition outcome, ScopeForge addresses a workflow I encounter in real professional projects, and I plan to continue developing and testing it after Build Week.

Thank you for taking the time to review my submission.
`;

const testingInstructions = `# Testing ScopeForge

## Prerequisites

- Node.js 20.11 or later
- npm
- A current Chromium-based browser
- An OpenAI API key only for the optional local Live path

## Demo mode — no API key required

From the repository root:

\`\`\`bash
npm ci
npm run dev
\`\`\`

Open \`http://localhost:3000\`. No \`.env.local\` file is required for the prepared Demo projects.

## Recommended Calyra walkthrough

1. On the project dashboard, switch the interface language to French and choose **Open demo project** to load Calyra.
2. Once the project opens, the interface selector can be returned to English. The project language remains independent, which demonstrates the separation between interface, project and client-output languages.
3. Open **Sources** and review the three complementary Calyra documents, including the technical memo.
4. Choose **Analyze sources**, open **Source contributions**, then open a citation.
5. Choose **Prepare clarification questions**, record an answer, and defer any non-blocking item when appropriate.
6. Choose **Build the scope**, then **Generate estimate**.
7. Review the estimation method, options, reserve and reference comparison.
8. Approve the estimate from **Approve estimate** after acknowledging any non-blocking warning.
9. Open **Proposal**, generate the client proposal, switch to **Client-ready**, and open the PDF.
10. Export the client XLSX workbook.

Expected Demo behaviour: prepared results are clearly labelled as Demo, citations open the matching source passage, totals recalculate locally, approval creates a validated snapshot, and client exports omit internal methods, confidence, references and technical metadata.

## Optional local Live mode

Create \`.env.local\` from the provided example:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Configure these server-side variables in \`.env.local\` without exposing their values:

- \`DEPLOYMENT_PROFILE\`
- \`OPENAI_API_KEY\`
- \`OPENAI_PRIMARY_MODEL\`
- \`DEMO_MODE\`
- \`ALLOW_PUBLIC_LIVE_AI\`
- \`AI_REQUEST_TIMEOUT_MS\`
- \`MAX_AI_PAYLOAD_BYTES\`
- \`MAX_UPLOAD_BYTES\`
- \`MAX_PDF_PAYLOAD_BYTES\`

Then run:

\`\`\`bash
npm run dev
\`\`\`

Create a new project, add at least two non-confidential fictional sources and choose **Analyze sources**. A Live project without a configured key reports that processing is not configured and preserves the sources. A configured local project calls GPT-5.6 and records non-secret execution metadata. A Live project never receives a silent prepared fallback.

## Quality commands

\`\`\`bash
npm run lint
npm run typecheck
npm test
npm run build
\`\`\`

## Reset

Inside a Demo project, choose **Reset demo** in the project sidebar and confirm the dialog. Reset restores only that Demo project: sources, prepared analysis, questions, decisions, estimate, versions, proposal settings and the guided tour. Other local projects are not changed.
`;

describe.runIf(enabled)("Build Week judges pack generator", () => {
  it("creates the English fictional Calyra deliverables", async () => {
    await rm(packRoot, { recursive: true, force: true });
    await mkdir(resolve(packRoot, "SAMPLE_SOURCES"), { recursive: true });
    await mkdir(resolve(packRoot, "SCREENSHOTS"), { recursive: true });
    await writeFile(resolve(packRoot, "README_FOR_JUDGES.md"), readme);
    await writeFile(resolve(packRoot, "TESTING_INSTRUCTIONS.md"), testingInstructions);
    await writeFile(resolve(packRoot, "SAMPLE_SOURCES/01_CALYRA_PROGRAMME_BRIEF.md"), programmeBrief);
    await writeFile(resolve(packRoot, "SAMPLE_SOURCES/02_CALYRA_FUNCTIONAL_WORKSHOP.md"), functionalWorkshop);
    await writeFile(resolve(packRoot, "SAMPLE_SOURCES/03_CALYRA_TECHNICAL_LAUNCH_MEMO.md"), technicalMemo);

    const selectedScreenshots = [
      ["02-complementary-sources.jpg", "01_SOURCES.jpg"],
      ["06-citation-and-provenance.jpg", "02_CONSOLIDATION_AND_PROVENANCE.jpg"],
      ["07-clarification-questions.jpg", "03_CLARIFICATION_AND_DECISION.jpg"],
      ["09-estimation-workshop.jpg", "04_ESTIMATION.jpg"],
      ["14-client-ready-proposal.jpg", "05_CLIENT_PROPOSAL.jpg"],
    ];
    for (const [sourceName, targetName] of selectedScreenshots) {
      await copyFile(resolve("docs/screenshots/submission-en", sourceName), resolve(packRoot, "SCREENSHOTS", targetName));
    }

    const architecturePath = resolve(packRoot, "ARCHITECTURE.png");
    await writeFile(architecturePath, drawArchitectureDiagram());
    const { state, snapshot, document } = createCalyraState();
    await writeFile("/tmp/scopeforge-calyra-judges-state.json", JSON.stringify(state));
    const clientPdf = await renderToBuffer(<ClientProposalPdf document={document} />);
    await writeFile(resolve(packRoot, "CALYRA_CLIENT_PROPOSAL.pdf"), clientPdf);
    await writeFile(resolve(packRoot, "CALYRA_CLIENT_ESTIMATE.xlsx"), createXlsxWorkbook(state, snapshot, "client", "en"));

    const architectureDataUrl = `data:image/png;base64,${(await readFile(architecturePath)).toString("base64")}`;
    const overviewScreenshots = await Promise.all(selectedScreenshots.slice(0, 4).map(async ([, targetName]) => `data:image/jpeg;base64,${(await readFile(resolve(packRoot, "SCREENSHOTS", targetName))).toString("base64")}`));
    const overviewPdf = await renderToBuffer(<OverviewPdf architecturePath={architectureDataUrl} screenshotPaths={overviewScreenshots} />);
    await writeFile(resolve(packRoot, "SCOPEFORGE_OVERVIEW.pdf"), overviewPdf);

    expect(document.locale).toBe("en");
    expect(document.status).toBe("validated");
    expect(document.project.name).toContain("Calyra");
    expect(document.included.length).toBeGreaterThan(0);
    expect(document.totals.effortLow).toBe(49.5);
    expect(document.totals.effortLikely).toBe(80.5);
    expect(document.totals.effortHigh).toBe(122);
    expect(clientPdf.byteLength).toBeGreaterThan(5_000);
    expect((await readFile(resolve(packRoot, "CALYRA_CLIENT_ESTIMATE.xlsx"))).byteLength).toBeGreaterThan(5_000);
  }, 30_000);
});
