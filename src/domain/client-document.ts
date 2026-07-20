import { z } from "zod";
import type {
  ClientDocumentLine,
  ClientDocumentModel,
  ClientProposalSettings,
  EstimateSnapshot,
  EstimationMethod,
  WorkspaceState,
} from "./schemas";

const hexColor = /^#[0-9a-f]{6}$/i;

export const ClientProposalSettingsSchema = z.object({
  documentType: z.enum(["estimate", "proposal", "quote"]),
  title: z.string().max(120),
  issuerName: z.string().max(120),
  issuerAddress: z.string().max(500),
  issuerEmail: z.string().max(200),
  issuerPhone: z.string().max(80),
  clientName: z.string().max(120),
  reference: z.string().max(80),
  issueDate: z.string(),
  validityDays: z.number().int().min(0).max(365),
  currency: z.string().min(3).max(8),
  pricingMode: z.enum(["fixed_price", "time_and_materials", "effort_only"]),
  clientRate: z.number().nonnegative().nullable(),
  effortDisplay: z.enum(["low", "likely", "high", "range", "full"]),
  showPrices: z.boolean(),
  showRates: z.boolean(),
  showEffort: z.boolean(),
  showContext: z.boolean(),
  showAssumptions: z.boolean(),
  showExclusions: z.boolean(),
  showConditions: z.boolean(),
  showTaxes: z.boolean(),
  taxRate: z.number().min(0).max(1),
  discountRate: z.number().min(0).max(1),
  showPlanning: z.boolean(),
  showOptions: z.boolean(),
  showAcceptance: z.boolean(),
  paymentTerms: z.string().max(1200),
  startConditions: z.string().max(1200),
  clientResponsibilities: z.string().max(1200),
  changePolicy: z.string().max(1200),
  finalNotes: z.string().max(1200),
  accentColor: z.string().regex(hexColor),
  logoDataUrl: z.string().max(1_500_000).nullable().refine((value) => value === null || /^data:image\/(png|jpeg);base64,/i.test(value), "Only PNG or JPEG data URLs are supported"),
});

const ClientDocumentLineSchema = z.object({
  id: z.string(),
  workstream: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["included", "optional"]),
  low: z.number().nonnegative(),
  likely: z.number().nonnegative(),
  high: z.number().nonnegative(),
  unit: z.enum(["day", "hour"]),
  rate: z.number().nonnegative().nullable(),
  amount: z.number().nonnegative().nullable(),
}).refine((line) => line.low <= line.likely && line.likely <= line.high, "Invalid effort range");

export const ClientDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  projectId: z.string(),
  estimateSnapshotId: z.string(),
  locale: z.enum(["fr", "en"]),
  status: z.literal("validated"),
  generatedAt: z.string().datetime(),
  validatedAt: z.string().datetime(),
  revision: z.number().int().positive(),
  settings: ClientProposalSettingsSchema,
  project: z.object({
    name: z.string(),
    clientName: z.string(),
    context: z.string(),
    objective: z.string(),
    approach: z.string(),
  }),
  included: z.array(ClientDocumentLineSchema),
  options: z.array(ClientDocumentLineSchema),
  exclusions: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  assumptions: z.array(z.string()),
  decisions: z.array(z.object({ id: z.string(), statement: z.string(), createdAt: z.string() })),
  planning: z.array(z.object({ name: z.string(), description: z.string() })),
  totals: z.object({
    effortLow: z.number().nonnegative(),
    effortLikely: z.number().nonnegative(),
    effortHigh: z.number().nonnegative(),
    reserveLikely: z.number().nonnegative(),
    optionsLikely: z.number().nonnegative(),
    subtotal: z.number().nonnegative().nullable(),
    discount: z.number().nonnegative().nullable(),
    totalExcludingTax: z.number().nonnegative().nullable(),
    tax: z.number().nonnegative().nullable(),
    totalIncludingTax: z.number().nonnegative().nullable(),
    optionsAmount: z.number().nonnegative().nullable(),
  }),
});

export function defaultClientProposalSettings(state: Pick<WorkspaceState, "project">): ClientProposalSettings {
  const locale = state.project.clientOutputLanguage === "fr" || state.project.resolvedProjectLanguage === "fr" ? "fr" : "en";
  const reference = `SF-${state.project.id.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  return {
    documentType: "proposal",
    title: locale === "fr" ? "Proposition commerciale" : "Project proposal",
    issuerName: "ScopeForge Studio",
    issuerAddress: "",
    issuerEmail: "",
    issuerPhone: "",
    clientName: state.project.clientName,
    reference,
    issueDate: new Date().toISOString().slice(0, 10),
    validityDays: 30,
    currency: state.project.currency,
    pricingMode: state.project.preferences.commercialModel,
    clientRate: null,
    effortDisplay: "likely",
    showPrices: true,
    showRates: false,
    showEffort: state.project.preferences.showEffortInClient,
    showContext: true,
    showAssumptions: true,
    showExclusions: true,
    showConditions: true,
    showTaxes: false,
    taxRate: 0,
    discountRate: 0,
    showPlanning: true,
    showOptions: true,
    showAcceptance: false,
    paymentTerms: "",
    startConditions: "",
    clientResponsibilities: "",
    changePolicy: "",
    finalNotes: "",
    accentColor: "#0d5c50",
    logoDataUrl: null,
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildClientDocument(input: {
  state: WorkspaceState;
  snapshot: EstimateSnapshot;
  settings: ClientProposalSettings;
  method: EstimationMethod | null;
  proposalId: string;
  generatedAt: string;
}): ClientDocumentModel {
  const { state, snapshot, method, proposalId, generatedAt } = input;
  if (snapshot.status !== "approved" || !snapshot.validatedAt) throw new Error("A validated estimate snapshot is required");
  const settings = ClientProposalSettingsSchema.parse(input.settings);
  const locale: "fr" | "en" = state.project.clientOutputLanguage === "fr" || (state.project.clientOutputLanguage === "same_as_project" && (state.project.resolvedProjectLanguage ?? state.project.projectLanguage) === "fr") ? "fr" : "en";
  const linesByModule = new Map(snapshot.estimateLines.map((line) => [line.moduleId, line]));
  const inheritedRate = snapshot.methodOverrides.referenceRate ?? method?.referenceRate ?? null;
  const rate = settings.pricingMode === "effort_only" || !settings.showPrices ? null : (settings.clientRate ?? inheritedRate);
  const included: ClientDocumentLine[] = [];
  const options: ClientDocumentLine[] = [];
  const exclusions: ClientDocumentModel["exclusions"] = [];
  for (const workstream of snapshot.workstreams) {
    for (const scopeModule of workstream.modules) {
      if (scopeModule.status === "excluded" || scopeModule.status === "deferred") {
        exclusions.push({ id: scopeModule.id, name: scopeModule.name, description: scopeModule.description });
        continue;
      }
      const line = linesByModule.get(scopeModule.id);
      if (!line || (scopeModule.status !== "included" && scopeModule.status !== "optional")) continue;
      const projected: ClientDocumentLine = {
        id: scopeModule.id,
        workstream: workstream.name,
        name: scopeModule.name,
        description: scopeModule.description,
        status: scopeModule.status,
        low: line.low,
        likely: line.likely,
        high: line.high,
        unit: snapshot.estimationUnit,
        rate,
        amount: rate === null ? null : roundMoney(line.likely * rate),
      };
      (scopeModule.status === "included" ? included : options).push(projected);
    }
  }
  const subtotal = rate === null ? null : roundMoney(snapshot.totals.proposed.likely * rate);
  const discount = subtotal === null ? null : roundMoney(subtotal * settings.discountRate);
  const totalExcludingTax = subtotal === null || discount === null ? null : roundMoney(subtotal - discount);
  const tax = totalExcludingTax === null ? null : roundMoney(settings.showTaxes ? totalExcludingTax * settings.taxRate : 0);
  const totalIncludingTax = totalExcludingTax === null || tax === null ? null : roundMoney(totalExcludingTax + tax);
  const context = state.analysis?.executiveSummary ?? state.project.description;
  const objective = state.analysis?.findings.find((finding) => finding.category === "goal")?.statement ?? state.project.description;
  return ClientDocumentSchema.parse({
    schemaVersion: 1,
    id: proposalId,
    projectId: state.project.id,
    estimateSnapshotId: snapshot.id,
    locale,
    status: "validated",
    generatedAt,
    validatedAt: snapshot.validatedAt,
    revision: snapshot.revision,
    settings,
    project: {
      name: state.project.name,
      clientName: settings.clientName || state.project.clientName,
      context,
      objective,
      approach: locale === "fr" ? "Le périmètre et l’estimation ci-dessous reposent sur les informations confirmées et les hypothèses explicitement retenues." : "The scope and estimate below are based on confirmed information and explicitly recorded assumptions.",
    },
    included,
    options: settings.showOptions ? options : [],
    exclusions: settings.showExclusions ? exclusions : [],
    assumptions: settings.showAssumptions ? Array.from(new Set(snapshot.assumptions.filter(Boolean))) : [],
    decisions: snapshot.decisions.map((decision) => ({ id: decision.id, statement: decision.statement, createdAt: decision.createdAt })),
    planning: settings.showPlanning ? snapshot.workstreams.map((workstream) => ({ name: workstream.name, description: workstream.description })) : [],
    totals: {
      effortLow: snapshot.totals.proposed.low,
      effortLikely: snapshot.totals.proposed.likely,
      effortHigh: snapshot.totals.proposed.high,
      reserveLikely: snapshot.totals.reserve.likely,
      optionsLikely: snapshot.totals.options.likely,
      subtotal,
      discount,
      totalExcludingTax,
      tax,
      totalIncludingTax,
      optionsAmount: rate === null ? null : roundMoney(snapshot.totals.options.likely * rate),
    },
  });
}
