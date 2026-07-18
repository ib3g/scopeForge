import { calculateTotals } from "@/domain/estimation";
import {
  EstimationMethodSchema,
  ReferenceCaseSchema,
  ReferenceMatchSchema,
  type EstimationMethod,
  type EstimationMethodOverrides,
  type ReferenceCase,
  type ReferenceMatch,
  type WorkspaceState,
  type EstimationComparison,
} from "@/domain/schemas";

const METHODS_KEY = "scopeforge-estimation-methods-v1";
const REFERENCES_KEY = "scopeforge-reference-cases-v1";

const now = "2026-07-18T00:00:00.000Z";

export const defaultEstimationMethods: EstimationMethod[] = [
  {
    id: "web-fixed-price",
    name: "Web application — fixed price",
    description: "A structured workstream model for a defined web product delivered for a fixed price.",
    primaryUnit: "person_days",
    workstreams: ["Discovery", "Experience design", "Build", "Quality and launch"],
    roles: ["Product", "Design", "Engineering", "Quality assurance"],
    referenceRate: 850,
    reserveRate: 0.15,
    rounding: "0.5",
    lowFactor: 0.7,
    highFactor: 1.35,
    assumptions: ["One decision-making client team", "Responsive web delivery", "Content supplied by the client"],
    includedPatterns: ["authentication", "content management", "responsive interface", "analytics"],
    optionalPatterns: ["migration", "advanced reporting", "multi-language content"],
    excludedPatterns: ["native mobile application", "24/7 operations"],
    language: "en",
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "time-materials",
    name: "Delivery team — time and materials",
    description: "An hourly model for evolving scope, continuous prioritisation and a staffed delivery team.",
    primaryUnit: "hours",
    workstreams: ["Product management", "Design", "Engineering", "Operations"],
    roles: ["Product manager", "Designer", "Engineer", "Delivery lead"],
    referenceRate: 110,
    reserveRate: 0.1,
    rounding: "5",
    lowFactor: 0.75,
    highFactor: 1.4,
    assumptions: ["Priorities are reviewed regularly", "The team works in short iterations", "The client provides a product owner"],
    includedPatterns: ["backlog refinement", "iterative delivery", "release support"],
    optionalPatterns: ["research track", "extended support", "migration"],
    excludedPatterns: ["fixed delivery date without scope trade-offs"],
    language: "en",
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "discovery-audit",
    name: "Discovery and audit",
    description: "A short, evidence-led engagement to reduce unknowns before a delivery estimate.",
    primaryUnit: "person_days",
    workstreams: ["Stakeholder interviews", "Current-state review", "Target scope", "Estimate and handover"],
    roles: ["Consultant", "Product strategist", "Technical lead"],
    referenceRate: 950,
    reserveRate: 0.2,
    rounding: "1",
    lowFactor: 0.6,
    highFactor: 1.5,
    assumptions: ["Key stakeholders are available", "Existing documents can be shared", "The outcome is a decision-ready brief"],
    includedPatterns: ["interviews", "document review", "risk assessment", "roadmap"],
    optionalPatterns: ["prototype", "technical spike", "user testing"],
    excludedPatterns: ["production implementation", "managed operations"],
    language: "en",
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
];

export const defaultReferenceCases: ReferenceCase[] = [
  {
    id: "reference-harborline-portal",
    title: "Harborline service portal",
    projectType: "Responsive web application",
    sector: "Public services",
    summary: "A searchable service catalogue with guided requests, staff review and accessible content.",
    features: ["search", "catalogue", "forms", "staff review", "accessibility", "analytics"],
    constraints: ["Content ownership was distributed", "The first release had to be responsive", "Audit trail required"],
    assumptions: ["Existing identity provider", "Client supplies service content", "One launch market"],
    estimates: [
      { workstream: "Discovery", low: 6, likely: 9, high: 14, unit: "person_days" },
      { workstream: "Experience design", low: 10, likely: 15, high: 22, unit: "person_days" },
      { workstream: "Build", low: 28, likely: 42, high: 60, unit: "person_days" },
      { workstream: "Quality and launch", low: 8, likely: 12, high: 18, unit: "person_days" },
    ],
    methodId: "web-fixed-price",
    decisions: ["Requests are reviewed before submission to the back office", "Accessibility is part of acceptance"],
    outcomes: ["Clearer ownership of service content", "Reusable request patterns"],
    tags: ["portal", "search", "forms", "accessibility", "content"],
    language: "en",
    date: "2025-10-12",
    provenance: "reference_case",
    status: "active",
  },
  {
    id: "reference-asteria-subscription",
    title: "Asteria subscription workspace",
    projectType: "SaaS product",
    sector: "Education technology",
    summary: "A multi-tenant workspace for plans, subscriptions, invitations and operational reporting.",
    features: ["accounts", "subscriptions", "roles", "billing", "reporting", "notifications"],
    constraints: ["Tenant boundaries were critical", "Billing provider handled payments", "Reporting had a separate owner"],
    assumptions: ["Provider APIs remain available", "No native mobile app in first release"],
    estimates: [
      { workstream: "Product management", low: 12, likely: 18, high: 26, unit: "hours" },
      { workstream: "Design", low: 80, likely: 120, high: 170, unit: "hours" },
      { workstream: "Engineering", low: 360, likely: 520, high: 760, unit: "hours" },
      { workstream: "Operations", low: 60, likely: 90, high: 130, unit: "hours" },
    ],
    methodId: "time-materials",
    decisions: ["The billing provider remains system of record", "Tenant administrators can invite members"],
    outcomes: ["Reduced manual subscription handling", "Clearer operational ownership"],
    tags: ["saas", "subscriptions", "billing", "roles", "reporting"],
    language: "en",
    date: "2025-06-04",
    provenance: "reference_case",
    status: "active",
  },
  {
    id: "reference-northstar-discovery",
    title: "Northstar operations discovery",
    projectType: "Discovery and audit",
    sector: "Logistics",
    summary: "A focused discovery to map dispatch operations, identify integration risks and define a phased scope.",
    features: ["interviews", "process mapping", "integration review", "risk register", "roadmap"],
    constraints: ["Teams used different terminology", "Legacy integration documentation was incomplete"],
    assumptions: ["Four stakeholder sessions", "Read-only access to integration notes"],
    estimates: [
      { workstream: "Stakeholder interviews", low: 3, likely: 5, high: 8, unit: "person_days" },
      { workstream: "Current-state review", low: 4, likely: 6, high: 9, unit: "person_days" },
      { workstream: "Target scope", low: 3, likely: 5, high: 8, unit: "person_days" },
      { workstream: "Estimate and handover", low: 2, likely: 3, high: 5, unit: "person_days" },
    ],
    methodId: "discovery-audit",
    decisions: ["The first phase documents decisions rather than implementing integrations"],
    outcomes: ["Shared vocabulary", "Prioritised risks for the delivery phase"],
    tags: ["discovery", "audit", "logistics", "integrations", "workshop"],
    language: "en",
    date: "2024-11-21",
    provenance: "reference_case",
    status: "active",
  },
  {
    id: "reference-atelier-luma",
    title: "Atelier Luma participation portal",
    projectType: "Portail web éditorial",
    sector: "Culture et événementiel",
    summary: "Un portail bilingue pour présenter une programmation, recueillir des candidatures et préparer les comités.",
    features: ["catalogue", "candidatures", "bilingue", "comité", "accessibilité", "exports"],
    constraints: ["Le contenu est rédigé par plusieurs équipes", "Les candidatures contiennent des données sensibles"],
    assumptions: ["Les règles de sélection restent manuelles", "Les exports sont réservés à l’équipe"],
    estimates: [
      { workstream: "Cadrage", low: 5, likely: 8, high: 12, unit: "person_days" },
      { workstream: "Expérience et contenu", low: 9, likely: 14, high: 20, unit: "person_days" },
      { workstream: "Développement", low: 24, likely: 38, high: 54, unit: "person_days" },
      { workstream: "Recette et lancement", low: 7, likely: 10, high: 15, unit: "person_days" },
    ],
    methodId: "web-fixed-price",
    decisions: ["Les candidatures sont exportées sans notes internes", "La version française est relue avant publication"],
    outcomes: ["Moins de ressaisie", "Décisions de comité mieux tracées"],
    tags: ["portail", "candidatures", "français", "bilingue", "culture"],
    language: "fr",
    date: "2025-02-18",
    provenance: "reference_case",
    status: "active",
  },
];

function readList<T>(key: string, fallback: T[], parse: (value: unknown) => T): T[] {
  if (typeof window === "undefined") return fallback.map(parse);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback.map(parse);
  }
  try {
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(parse);
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback.map(parse);
  }
}

function writeList<T>(key: string, values: T[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(values));
}

export const estimationMethodRepository = {
  list(): EstimationMethod[] { return readList(METHODS_KEY, defaultEstimationMethods, (value) => EstimationMethodSchema.parse(value)); },
  get(id: string) { return this.list().find((method) => method.id === id) ?? null; },
  save(method: EstimationMethod) { const values = this.list().filter((item) => item.id !== method.id); writeList(METHODS_KEY, [...values, EstimationMethodSchema.parse(method)]); },
  archive(id: string) { const method = this.get(id); if (method) this.save({ ...method, status: "archived", updatedAt: new Date().toISOString() }); },
  restore(id: string) { const method = this.get(id); if (method) this.save({ ...method, status: "active", updatedAt: new Date().toISOString() }); },
  duplicate(id: string) { const method = this.get(id); if (!method) return null; const copy = { ...method, id: `${method.id}-copy-${Date.now().toString(36)}`, name: `${method.name} — Copy`, status: "active" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; this.save(copy); return copy; },
};

export const referenceCaseRepository = {
  list(): ReferenceCase[] { return readList(REFERENCES_KEY, defaultReferenceCases, (value) => ReferenceCaseSchema.parse(value)); },
  get(id: string) { return this.list().find((reference) => reference.id === id) ?? null; },
  save(reference: ReferenceCase) { const values = this.list().filter((item) => item.id !== reference.id); writeList(REFERENCES_KEY, [...values, ReferenceCaseSchema.parse(reference)]); },
  archive(id: string) { const reference = this.get(id); if (reference) this.save({ ...reference, status: "archived" }); },
  restore(id: string) { const reference = this.get(id); if (reference) this.save({ ...reference, status: "active" }); },
  export(id: string) { const reference = this.get(id); return reference ? JSON.stringify(reference, null, 2) : null; },
  import(value: unknown) { const reference = ReferenceCaseSchema.parse(value); this.save(reference); return reference; },
};

function tokens(value: string) {
  return new Set(value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((token) => token.length > 2));
}

export function findReferenceMatches(state: WorkspaceState, references = referenceCaseRepository.list()): ReferenceMatch[] {
  const projectText = [state.project.name, state.project.sector, state.project.description, ...state.sources.map((source) => `${source.title} ${source.content}`), ...state.workstreams.map((stream) => stream.name)].join(" ");
  const projectTokens = tokens(projectText);
  const projectTypeTokens = tokens(state.project.sector);
  return references.filter((reference) => reference.status === "active").map((reference) => {
    const criteria = [...reference.tags, reference.projectType, reference.sector, ...reference.features];
    const common = criteria.filter((criterion) => [...tokens(criterion)].some((token) => projectTokens.has(token)));
    const score = Math.min(96, Math.round((common.length / Math.max(4, criteria.length)) * 100));
    const differences = [
      reference.sector && ![...projectTypeTokens].some((token) => tokens(reference.sector).has(token)) ? `Sector differs: ${reference.sector}.` : null,
      reference.methodId !== state.project.estimationMethodId ? "The estimation method is different." : null,
      reference.features.length > common.length ? "Some reference features are not present in the current sources." : null,
    ].filter((item): item is string => Boolean(item));
    const reusable = common.length ? [`Use the ${common.slice(0, 3).join(", ")} decision pattern as a question for the current project.`] : ["Use this case only as a discussion prompt."];
    const doNotTransfer = ["Do not copy its features or charges without evidence in the current sources.", ...differences.slice(0, 1)];
    return ReferenceMatchSchema.parse({ referenceId: reference.id, score, commonCriteria: common.slice(0, 6), importantDifferences: differences, reusableLearning: reusable, doNotTransfer, explanation: common.length ? `Matched on ${common.slice(0, 3).join(", ")}. This is context for review, not a prediction.` : "No strong textual match; keep it as optional context." });
  }).sort((a, b) => b.score - a.score || a.referenceId.localeCompare(b.referenceId));
}

export function mergeMethodOverrides(method: EstimationMethod | null, overrides: EstimationMethodOverrides) {
  if (!method) return null;
  return { ...method, ...overrides };
}

export function compareEstimateWithReference(state: WorkspaceState, reference: ReferenceCase): EstimationComparison {
  const totals = calculateTotals(state.estimateLines, state.workstreams.flatMap((stream) => stream.modules), state.project.contingencyRate, state.project.preferences);
  const currentByName = new Map(state.workstreams.map((stream) => [stream.name, stream.modules.reduce((sum, module) => sum + (state.estimateLines.find((line) => line.moduleId === module.id)?.likely ?? 0), 0)]));
  const referenceByName = new Map(reference.estimates.map((estimate) => [estimate.workstream, estimate.likely]));
  const commonWorkstreams = [...currentByName.keys()].filter((name) => referenceByName.has(name));
  const currentOnlyWorkstreams = [...currentByName.keys()].filter((name) => !referenceByName.has(name));
  const referenceOnlyWorkstreams = [...referenceByName.keys()].filter((name) => !currentByName.has(name));
  const differences = commonWorkstreams.map((name) => `${name}: current likely ${currentByName.get(name) ?? 0}, reference likely ${referenceByName.get(name) ?? 0}.`);
  return { referenceId: reference.id, commonWorkstreams, currentOnlyWorkstreams, referenceOnlyWorkstreams, currentTotals: totals.proposed, referenceTotals: reference.estimates.reduce((sum, item) => ({ low: sum.low + item.low, likely: sum.likely + item.likely, high: sum.high + item.high }), { low: 0, likely: 0, high: 0 }), differences, methodDifference: reference.methodId === state.project.estimationMethodId ? null : `Current method differs from ${reference.methodId}.`, riskNotes: ["Historical charges are directional and reflect different scope, decisions and team context."] };
}

export function serializeReference(reference: ReferenceCase) { return JSON.stringify(ReferenceCaseSchema.parse(reference), null, 2); }
export function parseReference(value: string) { return ReferenceCaseSchema.parse(JSON.parse(value)); }

export function createReferenceFromEstimate(
  state: WorkspaceState,
  input: { title: string; summary: string; tags: string[] },
): ReferenceCase {
  const methodId = state.project.estimationMethodId ?? "web-fixed-price";
  const estimates = state.workstreams.map((workstream) => {
    const lines = workstream.modules.map((module) => state.estimateLines.find((line) => line.moduleId === module.id)).filter(Boolean);
    return {
      workstream: workstream.name,
      low: lines.reduce((sum, line) => sum + (line?.low ?? 0), 0),
      likely: lines.reduce((sum, line) => sum + (line?.likely ?? 0), 0),
      high: lines.reduce((sum, line) => sum + (line?.high ?? 0), 0),
      unit: state.project.estimationUnit === "hour" ? "hours" as const : "person_days" as const,
    };
  });
  return ReferenceCaseSchema.parse({
    id: `reference-${Date.now().toString(36)}`,
    title: input.title.trim(),
    projectType: state.project.sector || "Project estimate",
    sector: state.project.sector || "Unspecified",
    summary: input.summary.trim(),
    features: state.workstreams.flatMap((workstream) => workstream.modules.flatMap((module) => module.features)).slice(0, 20),
    constraints: [],
    assumptions: state.workstreams.flatMap((workstream) => workstream.modules.flatMap((module) => module.assumptions)).slice(0, 20),
    estimates,
    methodId,
    decisions: state.decisions.map((decision) => decision.statement).slice(0, 20),
    outcomes: ["Validated internally from a completed estimate."],
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    language: state.project.resolvedProjectLanguage ?? "en",
    date: new Date().toISOString().slice(0, 10),
    provenance: "user_decision",
    status: "active",
  });
}
