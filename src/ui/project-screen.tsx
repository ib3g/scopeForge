"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  GitCompare,
  Info,
  ListChecks,
  MessageSquareText,
  MoreHorizontal,
  Printer,
  Quote,
  ShieldCheck,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { calculateTotals } from "@/domain/estimation";
import { compareEstimateRevisions } from "@/domain/estimate-revisions";
import { sourceLocale, wordCount } from "@/domain/source";
import { detectSourceLanguage } from "@/domain/language";
import { normalizeCoverageScore } from "@/domain/schemas";
import type {
  Citation,
  ClientProposalSettings,
  EstimateLine,
  Question,
  ScopeModule,
} from "@/domain/schemas";
import { defaultClientProposalSettings } from "@/domain/client-document";
import { formatDateFor, translate, useI18n } from "@/i18n";
import { resolvedClientLanguage } from "@/infrastructure/project-repository";
import { BrandLogo } from "@/ui/brand-logo";
import { createXlsxWorkbook } from "@/infrastructure/xlsx-export";
import { SelectField } from "./primitives/select-field";
import { Drawer } from "./primitives/drawer";
import { useWorkspace } from "./workspace-provider";

export function ProjectScreen({ step }: { step: string }) {
  if (step === "sources") return <SourcesScreen />;
  if (step === "analysis") return <AnalysisScreen />;
  if (step === "questions") return <QuestionsScreen />;
  if (step === "estimate") return <EstimateScreen />;
  if (step === "preview") return <PreviewScreen />;
  return null;
}

function PageHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </div>
  );
}

function InlineHelp({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <span className="tooltip inline-help">
      <button type="button" className="inline-help-trigger" aria-label={label} aria-describedby={id}>
        <Info size={13} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip">{children}</span>
    </span>
  );
}

function ProposalToggle({
  checked,
  disabled,
  label,
  help,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  help: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`proposal-toggle${disabled ? " is-disabled" : ""}`}>
      <label className="check-row">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
      <InlineHelp label={`${label}: ${help}`}>{help}</InlineHelp>
    </div>
  );
}

function AIStatus() {
  const { state, busy, operation, executionMode, aiConfiguration, retryLastAction } = useWorkspace();
  const { t } = useI18n();
  const visible = Boolean(
    busy ||
      operation?.status === "failed" ||
      operation?.status === "cancelled" ||
      executionMode === "not_configured" ||
      executionMode === "error",
  );
  if (!visible)
    return null;
  const activeLabel = busy
    ? (
        {
          analysis: t("assistant.consolidating"),
          questions: t("assistant.questions"),
          scope: t("assistant.scope"),
          estimate: t("assistant.estimate"),
          review: t("assistant.review"),
        } as const
      )[busy]
    : undefined;
  return (
    <div className={`ai-strip ${busy ? "is-working" : operation?.status === "failed" ? "is-failed" : ""}`} role="status" aria-live="polite" aria-busy={!!busy}>
      <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
        {busy ? (
          <span className="ai-progress-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Sparkles size={17} color="#2f6b9a" />
        )}
        <strong>
          {busy && operation?.status === "preparing" ? t("ai.preparing") :
            busy && operation?.status === "sending" ? t("ai.sending") :
            busy && operation?.status === "processing" ? t("ai.processing") :
            busy && operation?.status === "validating" ? t("ai.validating") :
            activeLabel ??
            (executionMode === "not_configured"
              ? t("common.aiNotConfigured")
              : executionMode === "error"
                ? t("common.aiRequestFailed")
                : state.aiExecution?.executionMode === "live"
                  ? t("common.liveModel", {
                      model:
                        state.aiExecution.model ??
                        aiConfiguration?.primaryModel ??
                        "GPT-5.6",
                    })
                  : t("common.demoFallback"))}
        </strong>
      </span>
      <span className="muted ai-status-detail">
        {busy ? (operation && operation.elapsedMs >= 30000 ? t("ai.takingLonger") : operation && operation.elapsedMs >= 10000 ? t("ai.stillWorking", { elapsed: `${Math.floor(operation.elapsedMs / 1000)} s` }) : t("assistant.preserving")) : operation?.status === "failed" ? operation.errorMessage ?? t("ai.failed") : operation?.status === "cancelled" ? t("ai.cancelled") : operation?.status === "completed" ? t("ai.completed") : t("common.structuredValidated")}
      </span>
      {operation?.status === "failed" && <button className="btn btn-sm" onClick={() => void retryLastAction()}>{t("ai.retryOperation")}</button>}
    </div>
  );
}

function ErrorBanner() {
  const { error, retryLastAction } = useWorkspace();
  const { t } = useI18n();
  return error ? (
    <div role="alert" className="error-banner">
      <strong>{t("errors.actionFailed")}</strong>
      <span>{t("errors.preserved")}</span>
      <details>
        <summary>{t("errors.technical")}</summary>
        <p>{error}</p>
      </details>
      <button className="btn btn-sm" onClick={() => void retryLastAction()}>
        {t("errors.retry")}
      </button>
    </div>
  ) : null;
}

function SourcesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const {
    state,
    busy,
    runAnalysis,
    updateSource,
    updateSourceLanguage,
    addSource,
    removeSource,
  } = useWorkspace();
  const [open, setOpen] = useState(state.sources[0]?.id);
  const [extracting, setExtracting] = useState(false);
  const [documentError, setDocumentError] = useState<string>();
  const [pendingDocument, setPendingDocument] = useState<{
    filename: string;
    title: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    kind: "text" | "markdown" | "pdf" | "docx";
    content: string;
    pages: number | null;
    sections: number | null;
    warnings: string[];
  }>();
  const analyze = async () => {
    if (await runAnalysis())
      router.push(`/projects/${state.project.id}/analysis`);
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    setDocumentError(undefined);
    setExtracting(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error(t("sources.extractionFailed"));
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      const response = await fetch("/api/documents/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data: btoa(binary) }),
      });
      const body = (await response.json()) as {
        filename?: string; mimeType?: string; sizeBytes?: number; checksum?: string; kind?: "text" | "markdown" | "pdf" | "docx"; content?: string; pages?: number | null; sections?: number | null; warnings?: string[]; error?: string; code?: string;
      };
      if (!response.ok || !body.content || !body.kind || !body.checksum) {
        if (body.code === "INVALID_DOCX") throw new Error(t("sources.docxInvalid"));
        if (body.code === "PDF_WITHOUT_TEXT") throw new Error(t("sources.pdfWithoutText"));
        throw new Error(t("sources.extractionFailed"));
      }
      setPendingDocument({
        filename: body.filename ?? file.name,
        title: file.name.replace(/\.(markdown|md|txt|pdf|docx)$/i, ""),
        mimeType: body.mimeType ?? file.type,
        sizeBytes: body.sizeBytes ?? file.size,
        checksum: body.checksum,
        kind: body.kind,
        content: body.content,
        pages: body.pages ?? null,
        sections: body.sections ?? null,
        warnings: body.warnings ?? [],
      });
    } catch (error) {
      setDocumentError(error instanceof Error ? error.message : t("sources.extractionFailed"));
    } finally {
      setExtracting(false);
    }
  };
  const confirmDocument = () => {
    if (!pendingDocument) return;
    addSource(
      pendingDocument.title.trim() || pendingDocument.filename,
      pendingDocument.content,
      pendingDocument.kind === "markdown" ? "markdown" : pendingDocument.kind === "text" ? "pasted_text" : pendingDocument.kind,
      {
        filename: pendingDocument.filename,
        mimeType: pendingDocument.mimeType,
        sizeBytes: pendingDocument.sizeBytes,
        pages: pendingDocument.pages,
        sections: pendingDocument.sections,
        checksum: pendingDocument.checksum,
        importedAt: new Date().toISOString(),
      },
    );
    setPendingDocument(undefined);
    setDocumentError(undefined);
  };
  return (
    <>
      <PageHeader
        eyebrow={t("sources.eyebrow")}
        title={t("sources.title")}
        copy={t("sources.copy")}
        action={
          <div className="source-actions">
            <label className="btn">
              <Upload size={16} />
              {t("sources.import")}
              <input
                type="file"
                accept=".md,.markdown,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  void importFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button
              className="btn btn-primary"
              disabled={
                !!busy ||
                state.sources.length < 2 ||
                state.sources.some((source) => !source.content.trim())
              }
              onClick={analyze}
            >
              <Sparkles size={17} />
              {busy ? t("sources.analyzing") : t("sources.analyze")}
            </button>
            <small className="source-format-note">{t("sources.supportedFormats")}</small>
          </div>
        }
      />
      <AIStatus />
      <ErrorBanner />
      {documentError && <div role="alert" className="error-banner"><strong>{t("sources.extractionFailed")}</strong><span>{documentError}</span></div>}
      {pendingDocument && (
        <section className="card document-preview" aria-live="polite">
          <div className="document-preview-head">
            <div>
              <span className="eyebrow">{t("sources.extractionPreview")}</span>
              <h2>{pendingDocument.filename}</h2>
              <p className="muted">{t("sources.extractionCopy")}</p>
            </div>
            <span className="badge badge-green">{pendingDocument.kind.toUpperCase()}</span>
          </div>
          <div className="document-preview-meta">
            <span>{t("sources.fileSize", { size: Math.max(1, Math.round(pendingDocument.sizeBytes / 1024)) })}</span>
            {pendingDocument.pages && <span>{pendingDocument.pages} {t("sources.pages")}</span>}
            {pendingDocument.sections && <span>{pendingDocument.sections} {t("sources.sections")}</span>}
            <span>{(detectSourceLanguage(pendingDocument.content).detectedLocale ?? "?").toUpperCase()}</span>
          </div>
          {pendingDocument.warnings.map((warning) => <p className="document-warning" key={warning}>{warning}</p>)}
          <label className="field document-title-field"><span className="field-label">{t("sources.documentTitle")}</span><input value={pendingDocument.title} onChange={(event) => setPendingDocument((current) => current ? { ...current, title: event.target.value } : current)} /></label>
          <pre className="document-preview-text">{pendingDocument.content}</pre>
          <div className="document-preview-actions">
            <button className="btn btn-primary" onClick={confirmDocument}>{t("sources.confirmImport")}</button>
            <button className="btn btn-ghost" onClick={() => setPendingDocument(undefined)}>{t("sources.excludeDocument")}</button>
          </div>
        </section>
      )}
      {extracting && <div className="card document-extracting" role="status" aria-live="polite" aria-busy="true"><span className="ai-progress-mark" aria-hidden="true"><i /><i /><i /></span>{t("sources.extracting")}</div>}
      <div className="card source-package" aria-busy={!!busy}>
        <div>
          <strong>
            {t("sources.packageTitle", { name: state.project.name })}
          </strong>
          <p className="muted">{t("sources.packageCopy")}</p>
        </div>
        {state.project.mode === "demo" && (
          <span className="badge badge-green">
            <ShieldCheck size={13} />
            {t("common.demoData")}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {state.sources.map((source, index) => (
          <article className="card" key={source.id}>
            <div className="source-card-head">
              <button
                aria-expanded={open === source.id}
                onClick={() => setOpen(open === source.id ? "" : source.id)}
              >
                <span className="source-icon">
                  <FileText size={19} />
                </span>
                <span>
                  <strong>
                    {t("common.source")} {String.fromCharCode(65 + index)}:{" "}
                    {source.title}
                  </strong>
                  <small>
                    {source.origin}, {wordCount(source.content)}{" "}
                    {t("common.words")}, {source.paragraphs.length}{" "}
                    {t("common.references")}
                  </small>
                </span>
                <span className="source-language-badge">
                  {source.language.isMultilingual
                    ? t("common.mixed")
                    : (sourceLocale(source)?.toUpperCase() ?? "?")}
                </span>
                {open === source.id ? <ChevronDown /> : <ChevronRight />}
              </button>
              {index > 2 && (
                <button
                  className="btn btn-ghost btn-sm source-remove"
                  aria-label={t("sources.remove", { title: source.title })}
                  onClick={() => removeSource(source.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            {open === source.id && (
              <div className="source-editor">
                <div className="source-language-control">
                  <div>
                    <span className="eyebrow">
                      {t("sources.detectedLanguage")}
                    </span>
                    <strong>
                      {source.language.isMultilingual
                        ? t("sources.multilingual")
                        : source.language.detectedLocale === "fr"
                          ? t("common.french")
                          : source.language.detectedLocale === "en"
                            ? t("common.english")
                            : t("common.unknown")}
                    </strong>
                    <small>
                      {source.language.confidence
                        ? t("sources.languageMethod", {
                            confidence: Math.round(
                              source.language.confidence * 100,
                            ),
                          })
                        : t("sources.unknownLanguage")}
                    </small>
                  </div>
                  <SelectField
                    className="source-language-select"
                    label={t("sources.languageOverride")}
                    value={source.language.userOverride ?? "detected"}
                    onValueChange={(value) =>
                      updateSourceLanguage(
                        source.id,
                        value === "detected" ? null : value,
                      )
                    }
                    options={[
                      { value: "detected", label: t("sources.useDetection") },
                      { value: "fr", label: t("common.french") },
                      { value: "en", label: t("common.english") },
                    ]}
                  />
                </div>
                <label htmlFor={`source-${source.id}`} className="eyebrow">
                  {t("sources.editableText")}
                </label>
                <textarea
                  id={`source-${source.id}`}
                  value={source.content}
                  onChange={(event) =>
                    updateSource(source.id, event.target.value)
                  }
                />
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function CitationChips({ citations }: { citations: Citation[] }) {
  const { state, updateSourceLanguage } = useWorkspace();
  const { t } = useI18n();
  const [active, setActive] = useState<Citation>();
  const source = state.sources.find((item) => item.id === active?.sourceId);
  return (
    <>
      <div className="citation-list">
        {citations.map((citation) => (
          <button
            type="button"
            className="citation-chip"
            key={`${citation.sourceId}-${citation.paragraphId}`}
            onClick={() => setActive(citation)}
            aria-label={`${t("analysis.sourceEvidence")} ${citation.paragraphId}`}
          >
            <Quote size={11} />
            {citation.sourceId.replace("SRC-0", `${t("common.source")} `)}
            <span>{citation.paragraphId.split("-").at(-1)}</span>
            {citation.excerptLocale && (
              <i>{citation.excerptLocale.toUpperCase()}</i>
            )}
          </button>
        ))}
      </div>
      <Drawer
        open={!!active}
        onOpenChange={(open) => !open && setActive(undefined)}
        eyebrow={t("analysis.sourceEvidence")}
        title={source?.title ?? t("analysis.sourceEvidence")}
        description={source?.origin}
        closeLabel={t("common.close")}
        className="citation-drawer"
      >
        {active && (
          <>
            {source && (
              <div className="drawer-language-control">
                <span className="badge badge-green">
                  {source.language.isMultilingual
                    ? t("common.mixed")
                    : (sourceLocale(source)?.toUpperCase() ?? "?")}
                </span>
                <SelectField
                  label={t("sources.languageOverride")}
                  value={source.language.userOverride ?? "detected"}
                  onValueChange={(value) =>
                    updateSourceLanguage(
                      source.id,
                      value === "detected" ? null : value,
                    )
                  }
                  options={[
                    { value: "detected", label: t("sources.useDetection") },
                    { value: "fr", label: "FR" },
                    { value: "en", label: "EN" },
                  ]}
                />
              </div>
            )}
            <div className="evidence-focus">
              <span className="badge badge-blue">
                {active.paragraphId} ·{" "}
                {active.excerptLocale?.toUpperCase() ?? "?"}
              </span>
              <small>{t("analysis.originalExcerpt")}</small>
              <p>“{active.excerpt}”</p>
              {active.translatedExcerpt && (
                <div className="translated-excerpt">
                  <small>{t("analysis.translatedExcerpt")}</small>
                  <p>{active.translatedExcerpt}</p>
                </div>
              )}
            </div>
            <div className="source-paragraphs">
              {source?.paragraphs.map((paragraph) => (
                <section
                  className={
                    paragraph.id === active.paragraphId ? "highlighted" : ""
                  }
                  key={paragraph.id}
                >
                  <small>{paragraph.id}{paragraph.page ? ` · p. ${paragraph.page}` : ""}</small>
                  <p>{paragraph.text}</p>
                </section>
              ))}
            </div>
            <footer className="drawer-actions">
              <button className="btn" onClick={() => setActive(undefined)}>
                {t("analysis.backToConsolidated")}
              </button>
            </footer>
          </>
        )}
      </Drawer>
    </>
  );
}

function AnalysisScreen() {
  const router = useRouter();
  const { t, number } = useI18n();
  const { state, busy, generateQuestions, runAnalysis, references } = useWorkspace();
  const analysis = state.analysis;
  const [tab, setTab] = useState<"consolidated" | "contributions" | "open">(
    "consolidated",
  );
  if (!analysis)
    return (
      <EmptyStep
        title={t("analysis.noAnalysis")}
        copy={t("analysis.noAnalysisCopy")}
        action={t("sources.analyze")}
        onClick={runAnalysis}
      />
    );
  const generate = async () => {
    if (await generateQuestions())
      router.push(`/projects/${state.project.id}/questions`);
  };
  const unknowns = analysis.findings.filter(
    (finding) =>
      finding.category === "unknown" || finding.category === "assumption",
  );
  const categoryLabel = (category: string) =>
    t(`analysis.category${category[0]?.toUpperCase()}${category.slice(1)}`);
  return (
    <>
      <PageHeader
        eyebrow={t("analysis.eyebrow")}
        title={t("analysis.title")}
        copy={t("analysis.copy")}
        action={
          <button
            className="btn btn-primary"
            disabled={!!busy}
            onClick={generate}
          >
            <MessageSquareText size={17} />
            {t("analysis.generateQuestions")}
          </button>
        }
      />
      <AIStatus />
      <ErrorBanner />
      <div className="card analysis-summary">
        <div>
          <div className="mono">{number(normalizeCoverageScore(analysis.coverageScore))}%</div>
          <span className="muted">{t("analysis.coverage")}</span>
        </div>
        <div>
          <strong>{t("analysis.summary")}</strong>
          <p>{analysis.executiveSummary}</p>
          {state.analysisVersions.length > 0 && (
            <span className="version-note">
              {t("analysis.version", {
                version: state.analysisVersions.length + 1,
              })}{" "}
              · {t("analysis.preservedVersion")}
            </span>
          )}
        </div>
      </div>
      {state.referenceInfluences.length > 0 && (
        <section className="card reference-influence-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">{t("references.title")}</span>
              <h2>{t("analysis.referenceInfluenceTitle")}</h2>
              <p className="muted">{t("analysis.referenceInfluenceCopy")}</p>
            </div>
            <span className="badge badge-muted">{state.referenceInfluences.length}</span>
          </div>
          <div className="reference-influence-list">
            {state.referenceInfluences.map((influence) => (
              <div className="reference-influence-item" key={influence.id}>
                <div>
                  <strong>{influence.statement}</strong>
                  <span>{references.find((reference) => reference.id === influence.referenceId)?.title ?? influence.referenceId}</span>
                </div>
                <span className="badge badge-blue">{t(`analysis.${influence.area}`)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="analysis-tabs">
        {(
          [
            ["consolidated", t("analysis.consolidated")],
            ["contributions", t("analysis.contributions")],
            ["open", t("analysis.openPoints")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={`btn btn-sm ${tab === id ? "btn-primary" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "consolidated" && (
        <div className="finding-grid">
          {analysis.findings
            .filter((finding) => finding.category !== "unknown")
            .map((finding) => {
              const sourceCount = new Set(
                finding.citations.map((citation) => citation.sourceId),
              ).size;
              return (
                <article className="card finding-card" key={finding.id}>
                  <div className="finding-meta">
                    <span className="badge badge-muted">
                      {categoryLabel(finding.category)}
                    </span>
                    <span className="muted mono">
                      {number(Math.round(finding.confidence * 100))}%{" "}
                      {t("common.confidence")}
                    </span>
                  </div>
                  <p>{finding.statement}</p>
                  <div className="confirmation-line">
                    <span>
                      {t(
                        sourceCount === 1
                          ? "analysis.supporting"
                          : "analysis.supportingPlural",
                        { count: sourceCount },
                      )}
                    </span>
                  </div>
                  <CitationChips citations={finding.citations} />
                </article>
              );
            })}
        </div>
      )}
      {tab === "contributions" && (
        <div className="contribution-list">
          {analysis.sourceContributions.map((item, index) => (
            <article
              className="card contribution-card"
              style={{ animationDelay: `${index * 45}ms` }}
              key={item.id}
            >
              <div>
                <span className="badge badge-blue">
                  {t("analysis.sourceLabel", {
                    number: item.sourceId.replace(/\D/g, "") || index + 1,
                  })}
                </span>
                <span className={`relation relation-${item.relation}`}>
                  {t(`analysis.${item.relation}`)}
                </span>
              </div>
              <div>
                <strong>{item.topic}</strong>
                <p>{item.contribution}</p>
                <CitationChips citations={item.citations} />
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "open" && (
        <div className="open-points">
          {unknowns.map((finding) => (
            <article className="card open-point-card" key={finding.id}>
              <span className="badge badge-amber">
                {t("analysis.needsClarification")}
              </span>
              <p>{finding.statement}</p>
              <CitationChips citations={finding.citations} />
            </article>
          ))}
          {analysis.inconsistencies.length === 0 && (
            <div className="consistency-note">
              <Check size={16} />
              <span>
                <strong>{t("analysis.noInconsistencies")}</strong>
                <small>{t("analysis.noInconsistenciesCopy")}</small>
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function QuestionsScreen() {
  const router = useRouter();
  const { t, date } = useI18n();
  const {
    state,
    busy,
    generateQuestions,
    respond,
    setQuestionStatus,
    buildScope,
  } = useWorkspace();
  const french = state.project.resolvedProjectLanguage === "fr";
  const [answers, setAnswers] = useState<Record<string, string>>(
    state.project.mode === "demo"
      ? {
          "Q-01": french
            ? "Conserver les demandes refusées pendant douze mois, puis les anonymiser automatiquement."
            : "Keep wait-list promotion manual for launch. When an offer expires, notify the coordinator and release capacity only after their confirmation.",
        }
      : {},
  );
  const [filter, setFilter] = useState<"all" | Question["priority"]>("all");
  if (!state.questions.length)
    return (
      <EmptyStep
        title={t("questions.empty")}
        copy={t("questions.emptyCopy")}
        action={t("questions.generate")}
        onClick={generateQuestions}
      />
    );
  const build = async () => {
    if (await buildScope())
      router.push(`/projects/${state.project.id}/estimate`);
  };
  const answered = state.questions.filter((q) => q.status !== "open").length;
  const visible =
    filter === "all"
      ? state.questions
      : state.questions.filter((question) => question.priority === filter);
  const demoImpact: Record<string, string[]> = french
    ? {
        "Q-01": ["Administration sécurisée"],
        "Q-02": ["Administration sécurisée"],
        "Q-03": ["Version anglaise"],
        "Q-04": ["Notifications e-mail"],
      }
    : {
        "Q-01": ["Review, offers & wait-list", "Email notifications"],
        "Q-02": ["Cohort operations"],
        "Q-03": ["French localization"],
        "Q-04": ["Email notifications"],
      };
  const impact = Object.fromEntries(
    state.questions.map((question) => [
      question.id,
      state.project.mode === "demo"
        ? (demoImpact[question.id] ?? [])
        : state.workstreams
            .flatMap((workstream) => workstream.modules)
            .filter((module) =>
              module.citations.some((citation) =>
                question.citations.some(
                  (questionCitation) =>
                    questionCitation.sourceId === citation.sourceId,
                ),
              ),
            )
            .map((module) => module.name),
    ]),
  );
  const priorityLabel = (item: string) =>
    item === "all" ? t("common.all") : t(`common.${item}`);
  const statusLabel = (item: string) =>
    item === "open"
      ? t("common.open")
      : item === "answered"
        ? t("common.recorded")
        : item === "deferred"
          ? t("common.deferred")
          : t("questions.notRelevant");
  return (
    <>
      <PageHeader
        eyebrow={t("questions.eyebrow")}
        title={t("questions.title")}
        copy={t("questions.copy")}
        action={
          <button
            className="btn btn-primary"
            disabled={!!busy || !state.decisions.length}
            onClick={build}
          >
            {t("questions.buildScope")}
            <ArrowRight size={17} />
          </button>
        }
      />
      <AIStatus />
      <ErrorBanner />
      <div className="decision-toolbar card">
        <div>
          <strong>
            {t("questions.handled", {
              done: answered,
              total: state.questions.length,
            })}
          </strong>
          <span>
            {t("questions.blockingRemain", {
              count: state.questions.filter(
                (q) => q.priority === "blocking" && q.status === "open",
              ).length,
            })}
          </span>
        </div>
        <div className="progress-track">
          <i
            style={{ width: `${(answered / state.questions.length) * 100}%` }}
          />
        </div>
        <div className="filter-group" aria-label={t("questions.filter")}>
          {(["all", "blocking", "framing", "optional"] as const).map((item) => (
            <button
              aria-pressed={filter === item}
              className={`btn btn-sm ${filter === item ? "btn-primary" : ""}`}
              key={item}
              onClick={() => setFilter(item)}
            >
              {priorityLabel(item)}
            </button>
          ))}
        </div>
      </div>
      <div className="question-list">
        {visible.map((question) => (
          <article
            className={`card question-card priority-${question.priority} ${question.status !== "open" ? "resolved" : ""}`}
            key={question.id}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                className={`badge ${question.priority === "blocking" ? "badge-red" : question.priority === "framing" ? "badge-amber" : "badge-blue"}`}
              >
                {priorityLabel(question.priority)}
              </span>
              <span className="badge badge-muted">
                {statusLabel(question.status)}
              </span>
            </div>
            <h2 style={{ fontSize: 19, margin: "14px 0 7px" }}>
              {question.text}
            </h2>
            <p className="muted" style={{ margin: "0 0 6px", fontSize: 14 }}>
              {question.rationale}
            </p>
            <p style={{ margin: 0, fontSize: 13 }}>
              <strong>{t("questions.estimateImpact")}</strong>{" "}
              {question.estimationImpact}
            </p>
            <CitationChips citations={question.citations} />
            <div className="impact-preview">
              <span>{t("questions.potentialImpact")}</span>
              {impact[question.id]?.map((module) => (
                <span className="badge badge-muted" key={module}>
                  {module}
                </span>
              ))}
            </div>
            {question.status === "open" && (
              <div className="answer-panel">
                <div className="quick-answers">
                  <span>{t("questions.quickAnswers")}</span>
                  <button
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [question.id]: t("questions.manualAnswer"),
                      })
                    }
                  >
                    {t("questions.manualLaunch")}
                  </button>
                  <button
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [question.id]: t("questions.includeAnswer"),
                      })
                    }
                  >
                    {t("questions.includeLaunch")}
                  </button>
                  <button
                    onClick={() =>
                      setAnswers({
                        ...answers,
                        [question.id]: t("questions.optionAnswer"),
                      })
                    }
                  >
                    {t("questions.moveOptions")}
                  </button>
                </div>
                <label htmlFor={`answer-${question.id}`}>
                  {t("questions.decisionAnswer")}
                </label>
                <textarea
                  id={`answer-${question.id}`}
                  rows={3}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers({
                      ...answers,
                      [question.id]: event.target.value,
                    })
                  }
                />
                <div className="answer-actions">
                  <button
                    className="btn btn-success btn-sm"
                    disabled={!answers[question.id]?.trim()}
                    onClick={() =>
                      respond(question.id, answers[question.id] ?? "")
                    }
                  >
                    <Check size={14} />
                    {t("questions.recordDecision")}
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setQuestionStatus(question.id, "deferred")}
                  >
                    {t("questions.defer")}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setQuestionStatus(question.id, "ignored")}
                  >
                    {t("questions.notRelevant")}
                  </button>
                </div>
              </div>
            )}
            {question.answer && (
              <div className="recorded-decision">
                <Check size={17} />
                <div>
                  <strong>{t("decisions.recorded")}</strong>
                  <p>{question.answer}</p>
                  <small>{t("questions.scopeImpactCopy")}</small>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
      {state.decisions.length > 0 && (
        <section className="card decision-history">
          <div>
            <span className="eyebrow">{t("decisions.history")}</span>
            <h2>
              {t(
                state.decisions.length === 1
                  ? "decisions.traceable"
                  : "decisions.traceablePlural",
                { count: state.decisions.length },
              )}
            </h2>
          </div>
          {state.decisions
            .slice()
            .reverse()
            .map((decision) => (
              <div className="history-row" key={decision.id}>
                <span className="badge badge-green">
                  {t("common.recorded")}
                </span>
                <p>{decision.statement}</p>
                <time>{date(decision.createdAt, { timeStyle: "short" })}</time>
              </div>
            ))}
        </section>
      )}
    </>
  );
}

function EmptyStep({
  title,
  copy,
  action,
  onClick,
}: {
  title: string;
  copy: string;
  action: string;
  onClick: () => void | Promise<unknown>;
}) {
  return (
    <div className="card empty-step">
      <span className="empty-step-icon">
        <Sparkles size={26} />
      </span>
      <h1>{title}</h1>
      <p className="muted">{copy}</p>
      <button className="btn btn-primary" onClick={onClick}>
        {action}
      </button>
    </div>
  );
}

function EstimateScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const {
    state,
    busy,
    buildScope,
    generateEstimate,
    changeModuleStatus,
    editEstimate,
    setContingency,
    reviewLine,
    editProposalAfter,
    resolveProposal,
    readiness,
    acknowledgeValidationWarning,
    approveEstimate,
    createEstimateRevision,
    restoreEstimateRevision,
    references,
    saveEstimateAsReference,
  } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string>();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ScopeModule["status"]
  >("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [assistantInsight, setAssistantInsight] = useState<string>();
  const [editingProposal, setEditingProposal] = useState(false);
  const previousComparisonId = useRef<string | null>(null);

  useEffect(() => {
    const comparisonId = state.estimationComparison?.referenceId ?? null;
    if (!comparisonId || comparisonId === previousComparisonId.current) {
      previousComparisonId.current = comparisonId;
      return;
    }
    previousComparisonId.current = comparisonId;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("estimate-comparison")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state.estimationComparison?.referenceId]);
  if (!state.workstreams.length)
    return (
      <EmptyStep
        title={t("scope.empty")}
        copy={t("scope.emptyCopy")}
        action={t("scope.build")}
        onClick={buildScope}
      />
    );
  if (!state.estimateLines.length)
    return (
      <>
        <PageHeader
          eyebrow={t("scope.eyebrow")}
          title={t("scope.title")}
          copy={t("scope.copy")}
          action={
            <button
              className="btn btn-primary"
              disabled={!!busy}
              onClick={generateEstimate}
            >
              <Sparkles size={17} />
              {t("scope.generateEstimate")}
            </button>
          }
        />
        <AIStatus />
        <ErrorBanner />
        <ScopeCards
          workstreams={state.workstreams}
          changeStatus={changeModuleStatus}
        />
      </>
    );
  const modules = state.workstreams.flatMap((w) => w.modules);
  const moduleMap = new Map(modules.map((m) => [m.id, m]));
  const totals = calculateTotals(
    state.estimateLines,
    modules,
    state.project.contingencyRate,
    state.project.preferences,
  );
  const selected =
    state.estimateLines.find((line) => line.id === selectedId) ??
    state.estimateLines.find(
      (line) => moduleMap.get(line.moduleId)?.status === "included",
    );
  const proposal =
    state.changeProposal?.status === "pending"
      ? state.changeProposal
      : undefined;
  const visibleWorkstreams = state.workstreams
    .map((workstream) => ({
      ...workstream,
      modules: workstream.modules.filter(
        (module) =>
          (statusFilter === "all" || module.status === statusFilter) &&
          `${module.name} ${module.description} ${module.features.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    }))
    .filter((workstream) => workstream.modules.length);
  const selectedModule = selected
    ? moduleMap.get(selected.moduleId)
    : undefined;
  const statusLabel = (item: string) =>
    item === "all" ? t("common.all") : t(`common.${item}`);
  const saveAsReference = () => {
    const title = window.prompt(t("library.referenceTitle"));
    if (!title?.trim()) return;
    const summary = window.prompt(t("library.referenceSummary")) ?? "";
    if (window.confirm(t("library.saveEstimate"))) saveEstimateAsReference({ title, summary, tags: [state.project.sector || "project"] });
  };
  return (
    <>
      <PageHeader
        eyebrow={t("estimate.eyebrow")}
        title={t("estimate.title")}
        copy={t("estimate.copy")}
        action={
          <div className="page-head-actions">
            <button className="btn btn-ghost" onClick={() => window.dispatchEvent(new Event("scopeforge:open-readiness"))}><ListChecks size={16} />{t("navigation.checklist")}</button>
            <button className="btn btn-secondary" onClick={() => window.dispatchEvent(new Event("scopeforge:open-settings"))}><Settings2 size={16} />{t("estimate.editSettings")}</button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="btn btn-ghost estimate-more-trigger" aria-label={t("common.moreActions")}>
                <MoreHorizontal size={17} />
                <span>{t("common.moreActions")}</span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="project-menu-content estimate-action-menu" sideOffset={7} align="end" collisionPadding={12}>
                  <DropdownMenu.Item onSelect={saveAsReference}>{t("library.saveEstimate")}</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => router.push(`/projects/${state.project.id}/preview`)}>{t("estimate.preview")}<ArrowRight size={15} /></DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        }
      />
      <AIStatus />
      <ErrorBanner />
      <EstimateApprovalPanel
        readiness={readiness}
        state={state}
        acknowledgeWarning={acknowledgeValidationWarning}
        approve={approveEstimate}
        createRevision={createEstimateRevision}
      />
      <RevisionHistory
        snapshots={state.estimateSnapshots}
        approvedId={state.approvedEstimateSnapshotId}
        restore={restoreEstimateRevision}
      />
      <div className="estimate-toolbar card">
        <label>
          <span>{t("estimate.search")}</span>
          <input
            type="search"
            placeholder={t("estimate.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="filter-group" aria-label={t("estimate.filter")}>
          {(
            ["all", "included", "optional", "excluded", "deferred"] as const
          ).map((item) => (
            <button
              className={`btn btn-sm ${statusFilter === item ? "btn-primary" : ""}`}
              aria-pressed={statusFilter === item}
              key={item}
              onClick={() => setStatusFilter(item)}
            >
              {statusLabel(item)}
            </button>
          ))}
        </div>
        <div className="estimate-count">
          <strong>{modules.length}</strong>
          <span>{t("common.modules")}</span>
        </div>
      </div>
      <div className="estimate-layout">
        <div className="card estimate-table-wrap" aria-busy={!!busy}>
          <table className="estimate-table">
            <thead>
              <tr>
                {[
                  t("common.modules"),
                  t("common.status"),
                  t("common.low"),
                  t("common.likely"),
                  t("common.high"),
                  t("common.risk"),
                  "",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleWorkstreams.map((ws) => (
                <TableWorkstream
                  key={ws.id}
                  workstream={ws}
                  lines={state.estimateLines}
                  selectedId={selected?.id}
                  select={(id) => {
                    setSelectedId(id);
                    setAssistantInsight(undefined);
                  }}
                  changeStatus={changeModuleStatus}
                  edit={editEstimate}
                  collapsed={collapsed.has(ws.id)}
                  toggle={() =>
                    setCollapsed((current) => {
                      const next = new Set(current);
                      if (next.has(ws.id)) next.delete(ws.id);
                      else next.add(ws.id);
                      return next;
                    })
                  }
                />
              ))}
            </tbody>
          </table>
          {!visibleWorkstreams.length && (
            <div className="table-empty">{t("estimate.noMatches")}</div>
          )}
        </div>
        <aside className="card copilot-panel">
          <div className="copilot-title">
            <span className="eyebrow">{t("estimate.contextualCopilot")}</span>
            <span className="badge badge-muted">
              {t("estimate.humanControlled")}
            </span>
          </div>
          {selected ? (
            <>
              <h2>{selectedModule?.name}</h2>
              <div className="line-signals">
                <span
                  className={`badge badge-${selected.risk === "high" ? "red" : selected.risk === "medium" ? "amber" : "green"}`}
                >
                  {t(`common.${selected.risk}`)} {t("common.risk")}
                </span>
                <span className="badge badge-muted">
                  {t(`common.${selected.confidence}`)} {t("common.confidence")}
                </span>
                {selected.manualOverride && (
                  <span className="badge badge-blue">
                    {t("common.manualOverride")}
                  </span>
                )}
              </div>
              <CitationChips citations={selectedModule?.citations ?? []} />
              <p className="copilot-rationale">{selected.rationale}</p>
              <div className="copilot-actions">
                <button
                  onClick={() =>
                    setAssistantInsight(
                      `${t("assistant.explanationPrefix", { features: selectedModule?.features.join(", ") ?? "" })} ${selected.rationale}`,
                    )
                  }
                >
                  {t("estimate.explain")}
                </button>
                <button
                  onClick={() =>
                    setAssistantInsight(
                      `${selectedModule?.dependencies.length ? `${selectedModule.dependencies.join(", ")}. ` : t("assistant.noDependency")}${selectedModule?.assumptions.join(" ") || t("assistant.noAssumption")}`,
                    )
                  }
                >
                  {t("estimate.missingWork")}
                </button>
                <button
                  onClick={() =>
                    setAssistantInsight(
                      t("assistant.evidenceCount", {
                        count: selectedModule?.citations.length ?? 0,
                      }),
                    )
                  }
                >
                  {t("estimate.compareEvidence")}
                </button>
                <button
                  onClick={() =>
                    setAssistantInsight(
                      t("assistant.clientWording", {
                        text: selectedModule?.description ?? "",
                      }),
                    )
                  }
                >
                  {t("estimate.rewriteClient")}
                </button>
              </div>
              {assistantInsight && (
                <div className="workspace-insight">
                  <span>{t("estimate.workspaceInsight")}</span>
                  <p>{assistantInsight}</p>
                </div>
              )}
              <button
                className="btn btn-primary challenge-button"
                disabled={!!busy}
                onClick={() => reviewLine(selected)}
              >
                <GitCompare size={16} />
                {t("estimate.challenge")}
              </button>
            </>
          ) : (
            <p className="muted">{t("estimate.selectLine")}</p>
          )}
          {proposal && (
            <div className="proposal-diff">
              <div className="diff-heading">
                <span className="badge badge-blue">
                  {t("estimate.aiProposal")}
                </span>
                <small>{t("estimate.noSilentChange")}</small>
              </div>
              <p>{proposal.explanation}</p>
              <Diff before={proposal.before} after={proposal.after} />
              {editingProposal && (
                <div className="proposal-edit">
                  <span>{t("estimate.adjustRange")}</span>
                  {(["low", "likely", "high"] as const).map((key) => (
                    <label key={key}>
                      {t(`common.${key}`)}
                      <input
                        aria-label={t(
                          `estimate.proposed${key[0].toUpperCase()}${key.slice(1)}`,
                        )}
                        type="number"
                        min="0"
                        step="0.5"
                        value={proposal.after[key]}
                        onChange={(event) =>
                          editProposalAfter({
                            [key]: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              <div className="diff-actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => resolveProposal(true)}
                >
                  <Check size={14} />
                  {t("common.accept")}
                </button>
                <button
                  className="btn btn-sm"
                  aria-pressed={editingProposal}
                  onClick={() => setEditingProposal((value) => !value)}
                >
                  {t("common.modify")}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => resolveProposal(false)}
                >
                  <X size={14} />
                  {t("common.reject")}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      <div className="totals-dock card mono">
        <Total label={t("estimate.baseLow")} value={totals.base.low} />
        <Total label={t("estimate.baseLikely")} value={totals.base.likely} />
        <Total label={t("estimate.baseHigh")} value={totals.base.high} />
        <SelectField
          className="reserve-select"
          label={t("common.reserve")}
          ariaLabel={t("estimate.estimateReserve")}
          size="compact"
          value={String(state.project.contingencyRate)}
          onValueChange={(value) => setContingency(Number(value))}
          options={[
            { value: "0.1", label: "10%" },
            { value: "0.15", label: "15%" },
            { value: "0.2", label: "20%" },
          ]}
        />
        <Total
          label={t("estimate.proposedLikelyTotal")}
          value={totals.proposed.likely}
          accent
        />
        <div className="option-total">
          <span>{t("common.options")}</span>
          <strong>
            {totals.options.low} / {totals.options.likely} /{" "}
            {totals.options.high}{" "}
            {state.project.estimationUnit === "day"
              ? t("common.dayShort")
              : t("common.hourShort")}
          </strong>
        </div>
      </div>
      {state.estimationComparison && (
        <section id="estimate-comparison" className="card comparison-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">{t("references.title")}</span>
              <h2>{t("comparison.title")}</h2>
              <p className="muted">{t("comparison.description")}</p>
            </div>
            <span className="badge badge-muted">{references.find((reference) => reference.id === state.estimationComparison?.referenceId)?.title}</span>
          </div>
          <div className="comparison-grid">
            <div><span>{t("comparison.current")}</span><strong>{state.estimationComparison.currentTotals.likely} {state.project.estimationUnit === "day" ? t("common.dayShort") : t("common.hourShort")}</strong></div>
            <div><span>{t("comparison.historical")}</span><strong>{state.estimationComparison.referenceTotals.likely} {t("common.likely")}</strong></div>
            <div><span>{t("comparison.commonWorkstreams")}</span><strong>{state.estimationComparison.commonWorkstreams.length}</strong></div>
          </div>
          <div className="comparison-columns">
            <div><h3>{t("comparison.currentOnly")}</h3><p>{state.estimationComparison.currentOnlyWorkstreams.join(", ") || t("common.none")}</p></div>
            <div><h3>{t("comparison.referenceOnly")}</h3><p>{state.estimationComparison.referenceOnlyWorkstreams.join(", ") || t("common.none")}</p></div>
            <div><h3>{t("comparison.risks")}</h3><p>{state.estimationComparison.riskNotes.join(" ")}</p></div>
          </div>
        </section>
      )}
    </>
  );
}

function EstimateApprovalPanel({
  readiness,
  state,
  acknowledgeWarning,
  approve,
  createRevision,
}: {
  readiness: ReturnType<typeof useWorkspace>["readiness"];
  state: ReturnType<typeof useWorkspace>["state"];
  acknowledgeWarning: (id: string) => void;
  approve: () => boolean;
  createRevision: () => void;
}) {
  const { t, date } = useI18n();
  const snapshot = state.approvedEstimateSnapshotId
    ? state.estimateSnapshots.find((item) => item.id === state.approvedEstimateSnapshotId)
    : undefined;
  const warningMessage = (id: string, fallback: string) =>
    id === "blocking-questions"
      ? t("readiness.blockingQuestions")
      : id === "critical-inconsistency"
        ? t("readiness.criticalInconsistency")
        : id === "open-questions"
          ? t("readiness.openQuestions")
          : id === "recognized-inconsistencies"
            ? t("readiness.recognizedInconsistencies")
            : id === "no-reference-case"
              ? t("readiness.noReference")
              : fallback;
  return (
    <section className={`card estimate-approval-panel ${snapshot ? "is-approved" : ""}`}>
      <div className="estimate-approval-heading">
        <div>
          <span className="eyebrow">{t("readiness.title")}</span>
          <h2>{snapshot ? t("estimate.approvedSnapshot", { revision: snapshot.revision }) : t("estimate.approveEstimate")}</h2>
          <p className="muted">{snapshot ? `${t("decisions.estimateApproved")} · ${date(snapshot.createdAt, { dateStyle: "medium", timeStyle: "short" })}` : t("readiness.approveCopy")}</p>
        </div>
        {snapshot ? (
          <button className="btn btn-secondary" onClick={createRevision}>{t("estimate.createRevision")}</button>
        ) : (
          <button className="btn btn-primary" disabled={!readiness.canApproveEstimate} onClick={() => approve()}>{t("estimate.approveEstimate")}</button>
        )}
      </div>
      {!snapshot && readiness.warnings.length > 0 && (
        <div className="estimate-approval-warnings">
          {readiness.warnings.map((warning) => (
            <label className={`readiness-warning ${warning.severity}`} key={warning.id}>
              <input type="checkbox" checked={warning.acknowledged} disabled={warning.severity === "blocking"} onChange={() => acknowledgeWarning(warning.id)} />
              <span>{warningMessage(warning.id, warning.message)}</span>
              {warning.severity === "blocking" && <strong>{t("readiness.blockingWarning")}</strong>}
            </label>
          ))}
        </div>
      )}
      {snapshot && <div className="estimate-snapshot-meta"><span>{t("common.localUser")}</span><span>{snapshot.sourceVersions.length} {t("common.sources")}</span><span className="mono">{snapshot.sourceChecksum}</span></div>}
    </section>
  );
}

function RevisionHistory({
  snapshots,
  approvedId,
  restore,
}: {
  snapshots: ReturnType<typeof useWorkspace>["state"]["estimateSnapshots"];
  approvedId: string | null;
  restore: ReturnType<typeof useWorkspace>["restoreEstimateRevision"];
}) {
  const { t, date, number } = useI18n();
  const ordered = [...snapshots].sort((left, right) => right.revision - left.revision);
  const [beforeId, setBeforeId] = useState(ordered[1]?.id ?? ordered[0]?.id ?? "");
  const [afterId, setAfterId] = useState(approvedId ?? ordered[0]?.id ?? "");
  const [comparison, setComparison] = useState<ReturnType<typeof compareEstimateRevisions>>();
  if (!ordered.length) return null;
  const before = snapshots.find((snapshot) => snapshot.id === beforeId);
  const after = snapshots.find((snapshot) => snapshot.id === afterId);
  const compare = () => {
    if (before && after && before.id !== after.id) setComparison(compareEstimateRevisions(before, after));
  };
  return (
    <section className="card revision-history-panel">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">{t("estimate.revisionsEyebrow")}</span>
          <h2>{t("estimate.revisionsTitle")}</h2>
          <p className="muted">{t("estimate.revisionsCopy")}</p>
        </div>
        <span className="badge badge-muted">{ordered.length}</span>
      </div>
      <div className="revision-list">
        {ordered.map((snapshot) => (
          <div className="revision-row" key={snapshot.id}>
            <div>
              <strong>{t("estimate.revisionLabel", { revision: snapshot.revision })}</strong>
              <span>{date(snapshot.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {t(`estimate.revisionStatus.${snapshot.status}`)}</span>
            </div>
            <div className="revision-row-total">
              <strong>{number(snapshot.totals.proposed.likely, { maximumFractionDigits: 1 })}</strong>
              <span>{t("common.dayHourShort")} · {snapshot.author}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (window.confirm(t("estimate.restoreConfirm", { revision: snapshot.revision }))) restore(snapshot.id);
            }}>{t("estimate.restoreRevision")}</button>
          </div>
        ))}
      </div>
      {ordered.length > 1 && (
        <div className="revision-compare-controls">
          <SelectField label={t("estimate.compareFrom")} value={beforeId} onValueChange={setBeforeId} options={ordered.map((snapshot) => ({ value: snapshot.id, label: t("estimate.revisionLabel", { revision: snapshot.revision }) }))} />
          <SelectField label={t("estimate.compareTo")} value={afterId} onValueChange={setAfterId} options={ordered.map((snapshot) => ({ value: snapshot.id, label: t("estimate.revisionLabel", { revision: snapshot.revision }) }))} />
          <button className="btn btn-secondary" disabled={!before || !after || before.id === after.id} onClick={compare}>{t("estimate.compareRevisions")}</button>
        </div>
      )}
      {comparison && (
        <div className="revision-comparison-result">
          <div className="revision-comparison-summary">
            <strong>{t("estimate.comparisonSummary", { before: comparison.beforeRevision, after: comparison.afterRevision })}</strong>
            <span>{t("estimate.comparisonTotals", { delta: number(comparison.totals.likely, { maximumFractionDigits: 1 }) })}</span>
          </div>
          <div className="revision-comparison-grid">
            <span>{t("estimate.addedLines")} <strong>{comparison.addedLines}</strong></span>
            <span>{t("estimate.modifiedLines")} <strong>{comparison.modifiedLines}</strong></span>
            <span>{t("estimate.removedLines")} <strong>{comparison.removedLines}</strong></span>
            <span>{t("estimate.methodChanged")} <strong>{comparison.methodChanged ? t("common.yes") : t("common.no")}</strong></span>
          </div>
          <div className="revision-change-list">
            {comparison.lineChanges.map((change) => (
              <div key={change.moduleId} className="revision-change-row">
                <strong>{change.moduleName}</strong>
                <span>{t(`estimate.change.${change.kind}`)} · {change.before ? `${change.before.likely} → ` : ""}{change.after?.likely ?? "—"} {t("common.likely")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ScopeCards({
  workstreams,
  changeStatus,
}: {
  workstreams: ReturnType<typeof useWorkspace>["state"]["workstreams"];
  changeStatus: ReturnType<typeof useWorkspace>["changeModuleStatus"];
}) {
  const { t } = useI18n();
  return (
    <div className="scope-grid">
      {workstreams.map((ws) => (
        <section className="card scope-workstream" key={ws.id}>
          <span className="eyebrow">{t("common.workstream")}</span>
          <h2>{ws.name}</h2>
          <p className="muted">{ws.description}</p>
          <div className="scope-module-list">
            {ws.modules.map((module) => (
              <div className="scope-module" key={module.id}>
                <div>
                  <strong>{module.name}</strong>
                  <p className="muted">{module.features.join(", ")}</p>
                  <CitationChips citations={module.citations} />
                </div>
                <StatusSelect
                  value={module.status}
                  onChange={(value) => changeStatus(module.id, value)}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TableWorkstream({
  workstream,
  lines,
  selectedId,
  select,
  changeStatus,
  edit,
  collapsed,
  toggle,
}: {
  workstream: ReturnType<typeof useWorkspace>["state"]["workstreams"][number];
  lines: EstimateLine[];
  selectedId?: string;
  select: (id: string) => void;
  changeStatus: ReturnType<typeof useWorkspace>["changeModuleStatus"];
  edit: ReturnType<typeof useWorkspace>["editEstimate"];
  collapsed: boolean;
  toggle: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <tr className="workstream-row">
        <th colSpan={7}>
          <button type="button" aria-expanded={!collapsed} onClick={toggle}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span>{workstream.name}</span>
            <small>
              {workstream.modules.length} {t("common.modules")}
            </small>
          </button>
        </th>
      </tr>
      {!collapsed &&
        workstream.modules.map((module) => {
          const line = lines.find((item) => item.moduleId === module.id);
          if (!line) return null;
          return (
            <tr
              key={module.id}
              className={selectedId === line.id ? "selected" : ""}
              onClick={() => select(line.id)}
            >
              <td>
                <strong>{module.name}</strong>
                {line.manualOverride && (
                  <span
                    className="edited-mark"
                    title={t("common.manualOverride")}
                  >
                    {t("estimate.edited")}
                  </span>
                )}
                <small>{module.description}</small>
              </td>
              <td>
                <StatusSelect
                  value={module.status}
                  onChange={(value) => changeStatus(module.id, value)}
                />
              </td>
              {(["low", "likely", "high"] as const).map((key) => (
                <td key={key}>
                  <input
                    aria-label={`${module.name} ${t(`common.${key}`)}`}
                    type="number"
                    min="0"
                    step="0.5"
                    value={line[key]}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      edit(line.id, { [key]: Number(event.target.value) })
                    }
                  />
                </td>
              ))}
              <td>
                <span
                  className={`badge ${line.risk === "high" ? "badge-red" : line.risk === "medium" ? "badge-amber" : "badge-green"}`}
                >
                  {t(`common.${line.risk}`)}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label={t("estimate.review", { name: module.name })}
                  onClick={(event) => {
                    event.stopPropagation();
                    select(line.id);
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </td>
            </tr>
          );
        })}
    </>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: ScopeModule["status"];
  onChange: (value: ScopeModule["status"]) => void;
}) {
  const { t } = useI18n();
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <SelectField
        ariaLabel={t("common.status")}
        size="compact"
        tone={value}
        value={value}
        onValueChange={(next) => onChange(next as ScopeModule["status"])}
        options={[
          { value: "included", label: t("common.included") },
          { value: "optional", label: t("common.optional") },
          { value: "excluded", label: t("common.excluded") },
          { value: "deferred", label: t("common.deferred") },
        ]}
      />
    </div>
  );
}
function Diff({
  before,
  after,
}: {
  before: EstimateLine;
  after: EstimateLine;
}) {
  const { t, number } = useI18n();
  const { state } = useWorkspace();
  const unit =
    state.project.estimationUnit === "day"
      ? t("common.dayShort")
      : t("common.hourShort");
  const delta = after.likely - before.likely;
  return (
    <div className="diff-grid mono">
      <div className="diff-before">
        <span>{t("common.before")}</span>
        <strong>
          {before.low} / {before.likely} / {before.high} {unit}
        </strong>
        <small>{before.rationale}</small>
      </div>
      <div className="diff-after">
        <span>
          {t("common.after")} ·{" "}
          <b>
            {delta >= 0 ? "+" : ""}
            {number(delta)} {unit}
          </b>
        </span>
        <strong>
          {after.low} / {after.likely} / {after.high} {unit}
        </strong>
        <small>{after.rationale}</small>
      </div>
    </div>
  );
}
function Total({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const { t, number } = useI18n();
  const { state } = useWorkspace();
  return (
    <div className={`total ${accent ? "accent" : ""}`}>
      <span>{label}</span>
      <strong>
        {number(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{" "}
        {state.project.estimationUnit === "day"
          ? t("common.dayShort")
          : t("common.hourShort")}
      </strong>
    </div>
  );
}

function InternalReviewPanel({
  summary,
  onSave,
}: {
  summary: string;
  onSave: (summary: string) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(summary);
  const changed = draft.trim() !== summary.trim();
  return (
    <section className="card internal-review-panel no-print" aria-labelledby="internal-review-title">
      <div className="internal-review-heading">
        <div>
          <span className="eyebrow">{t("common.internal")}</span>
          <h2 id="internal-review-title">{t("preview.internalReviewTitle")}</h2>
          <p>{t("preview.internalReviewCopy")}</p>
        </div>
        <span className="badge badge-muted">{t("common.before")} / {t("common.after")}</span>
      </div>
      <label className="field internal-review-field">
        <span className="field-label">{t("preview.summaryLabel")}</span>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} />
      </label>
      <div className="internal-review-actions">
        <span className="muted">{changed ? t("preview.saveReview") : t("preview.reviewUnchanged")}</span>
        <button className="btn btn-secondary" disabled={!changed || !draft.trim()} onClick={() => onSave(draft)}>
          {t("preview.saveReview")}
        </button>
      </div>
    </section>
  );
}

function PreviewScreen() {
  const {
    state,
    recordExport,
    generateClientProposal,
    updateAnalysisSummary,
    updateProposalSettings,
    selectedMethod,
    readiness,
  } = useWorkspace();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"internal" | "client">("internal");
  const modules = state.workstreams.flatMap((w) => w.modules);
  const totals = useMemo(
    () =>
      calculateTotals(
        state.estimateLines,
        modules,
        state.project.contingencyRate,
        state.project.preferences,
      ),
    [
      state.estimateLines,
      modules,
      state.project.contingencyRate,
      state.project.preferences,
    ],
  );
  if (!state.estimateLines.length)
    return (
      <EmptyStep
        title={t("preview.noProposal")}
        copy={t("preview.noProposalCopy")}
        action={t("preview.goScope")}
        onClick={() =>
          location.assign(`/projects/${state.project.id}/estimate`)
        }
      />
    );
  const optional = modules.filter((module) => module.status === "optional");
  const excluded = modules.filter((module) => module.status === "excluded");
  const clientLocale = resolvedClientLanguage(state);
  const proposalSettings: ClientProposalSettings = {
    ...defaultClientProposalSettings(state),
    ...(state.proposalSettings ?? {}),
  };
  const proposalSettingsChanged = Boolean(
    state.proposalSnapshot?.settings &&
      JSON.stringify(state.proposalSnapshot.settings) !== JSON.stringify(proposalSettings),
  );
  const pt = (key: string, values?: Record<string, string | number>) =>
    mode === "client" ? translate(clientLocale, key, values) : t(key, values);
  const unit =
    state.project.estimationUnit === "day"
      ? pt("common.days")
      : pt("common.hours");
  const exportXlsx = (exportMode: "internal" | "client") => {
    const snapshot = state.approvedEstimateSnapshotId
      ? state.estimateSnapshots.find((item) => item.id === state.approvedEstimateSnapshotId) ?? null
      : null;
    const workbook = createXlsxWorkbook(state, snapshot, exportMode, clientLocale === "fr" ? "fr" : "en");
    const blob = new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportMode === "client"
      ? `scopeforge-${state.project.id}-client.xlsx`
      : `scopeforge-${state.project.id}-internal-${snapshot?.revision ?? "draft"}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
    recordExport(exportMode === "internal" ? "XLSX internal" : "XLSX client");
  };
  const assumptions =
    state.project.mode === "demo" &&
    state.project.resolvedProjectLanguage === "fr"
      ? [
          "Les contenus arrivent progressivement.",
          "Les attributions restent contrôlées au lancement.",
          "Les droits d’export sensibles sont confirmés au cadrage.",
        ]
      : state.project.mode === "demo"
        ? [
            "Client content and photography arrive progressively.",
            "Wait-list promotion remains manual for launch.",
            "Refund decisions remain an operations process.",
          ]
        : Array.from(
            new Set(
              state.workstreams.flatMap((workstream) =>
                workstream.modules.flatMap((module) => module.assumptions),
              ),
            ),
          );
  return (
    <>
      <PageHeader
        eyebrow={t("preview.eyebrow")}
        title={t("preview.title")}
        copy={t("preview.copy")}
        action={
          <div className="preview-actions no-print">
            <div className="preview-primary-actions">
              {mode === "internal" && (
                <button className="btn btn-primary" disabled={!readiness.canGenerateProposal} onClick={() => generateClientProposal()}>
                  <ArrowRight size={16} />
                  {state.proposalSnapshot
                    ? t("preview.regenerateClientProposal")
                    : t("preview.generateClientProposal")}
                </button>
              )}
              <div className="view-switch" aria-label={t("preview.viewLabel")}>
                <button
                  aria-pressed={mode === "internal"}
                  onClick={() => setMode("internal")}
                >
                  {t("common.internal")}
                </button>
                <button
                  aria-pressed={mode === "client"}
                  disabled={!state.proposalSnapshot}
                  title={!state.proposalSnapshot ? t("preview.clientViewLocked") : undefined}
                  onClick={() => setMode("client")}
                >
                  {t("common.clientReady")}
                </button>
                <i className={mode} />
              </div>
            </div>
            <div className="preview-export-actions">
              {mode === "internal" && (
                <button className="btn" onClick={() => exportXlsx("internal")}>
                  <Download size={16} />
                  {t("exports.xlsxInternal")}
                </button>
              )}
              {mode === "client" && state.proposalSnapshot && (
                <button className="btn" onClick={() => exportXlsx("client")}>
                  <Download size={16} />
                  {t("exports.xlsxClient")}
                </button>
              )}
              {mode === "internal" && (
                <button className="btn" onClick={() => window.print()}>
                  <Printer size={16} />
                  {t("preview.printInternal")}
                </button>
              )}
              {mode === "client" && state.proposalSnapshot?.document && (
                <button className="btn btn-primary" onClick={() => {
                  recordExport("PDF client");
                  router.push(`/projects/${state.project.id}/proposals/${state.proposalSnapshot?.id}/document`);
                }}>
                  <FileText size={16} />
                  {t("preview.openClientPdf")}
                </button>
              )}
            </div>
          </div>
        }
      />
      <div className={`view-safety no-print ${mode}`}>
        <ShieldCheck size={16} />
        <span>
          {mode === "client"
            ? t("preview.clientSafe")
            : t("preview.internalSafe")}
        </span>
        <small>
          {t("exports.clientLanguage", {
            language: clientLocale.toUpperCase(),
          })}
        </small>
      </div>
      {mode === "internal" && state.analysis && (
        <InternalReviewPanel
          summary={state.analysis.executiveSummary}
          onSave={updateAnalysisSummary}
        />
      )}
      {mode === "internal" && (
        <details className="card proposal-settings-panel no-print">
          <summary>
            <span>
              <Settings2 size={17} />
              <strong>{t("preview.documentSettings")}</strong>
            </span>
            <small>{proposalSettingsChanged ? t("preview.settingsPending") : t("preview.documentSettingsCopy")}</small>
          </summary>
          <div className="proposal-settings-body">
            {proposalSettingsChanged && state.proposalSnapshot && (
              <div className="proposal-settings-pending" role="status">
                <Info size={17} aria-hidden="true" />
                <div>
                  <strong>{t("preview.settingsPendingTitle")}</strong>
                  <span>{t("preview.settingsPending")}</span>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={generateClientProposal}>
                  {t("preview.regenerateClientProposal")}
                </button>
              </div>
            )}
            <div className="proposal-settings-grid">
              <SelectField
                label={t("preview.documentType")}
                value={proposalSettings.documentType}
                onValueChange={(value) => updateProposalSettings({ documentType: value as ClientProposalSettings["documentType"] })}
                options={[
                  { value: "estimate", label: t("preview.documentEstimate") },
                  { value: "proposal", label: t("preview.documentProposal") },
                  { value: "quote", label: t("preview.documentQuote") },
                ]}
              />
              <label className="field"><span className="field-label">{t("preview.documentTitle")}</span><input value={proposalSettings.title} onChange={(event) => updateProposalSettings({ title: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.issuerName")}</span><input value={proposalSettings.issuerName} onChange={(event) => updateProposalSettings({ issuerName: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.clientName")}</span><input value={proposalSettings.clientName} onChange={(event) => updateProposalSettings({ clientName: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.documentReference")}</span><input value={proposalSettings.reference} onChange={(event) => updateProposalSettings({ reference: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.issueDate")}</span><input type="date" value={proposalSettings.issueDate} onChange={(event) => updateProposalSettings({ issueDate: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.validityDays")}</span><input type="number" min="0" max="365" value={proposalSettings.validityDays} onChange={(event) => updateProposalSettings({ validityDays: Number(event.target.value) })} /></label>
              <SelectField
                label={t("preview.pricingMode")}
                value={proposalSettings.pricingMode}
                onValueChange={(value) => updateProposalSettings({ pricingMode: value as ClientProposalSettings["pricingMode"] })}
                options={[
                  { value: "fixed_price", label: t("estimate.fixedPrice") },
                  { value: "time_and_materials", label: t("estimate.timeMaterials") },
                  { value: "effort_only", label: t("preview.effortOnly") },
                ]}
              />
              <SelectField
                label={t("preview.effortDisplay")}
                value={proposalSettings.effortDisplay}
                onValueChange={(value) => updateProposalSettings({ effortDisplay: value as ClientProposalSettings["effortDisplay"] })}
                options={[
                  { value: "low", label: t("preview.lowOnly") },
                  { value: "likely", label: t("preview.likelyOnly") },
                  { value: "high", label: t("preview.highOnly") },
                  { value: "range", label: t("preview.rangeOnly") },
                  { value: "full", label: t("preview.fullRange") },
                ]}
              />
              <label className="field">
                <span className="field-label">{state.project.estimationUnit === "day" ? t("preview.clientDailyRate") : t("preview.clientHourlyRate")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!proposalSettings.showPrices || proposalSettings.pricingMode === "effort_only"}
                  value={proposalSettings.clientRate ?? selectedMethod?.referenceRate ?? ""}
                  onChange={(event) => updateProposalSettings({ clientRate: event.target.value === "" ? null : Number(event.target.value) })}
                />
                <small>{proposalSettings.clientRate === null ? t("preview.rateInherited") : t("preview.rateOverridden")}</small>
              </label>
              <label className="field"><span className="field-label">{t("projects.currency")}</span><input value={proposalSettings.currency} maxLength={8} onChange={(event) => updateProposalSettings({ currency: event.target.value.toUpperCase() })} /></label>
              <label className="field"><span className="field-label">{t("preview.discountRate")}</span><input type="number" min="0" max="100" step="0.1" value={proposalSettings.discountRate * 100} onChange={(event) => updateProposalSettings({ discountRate: Number(event.target.value) / 100 })} /></label>
              <label className="field"><span className="field-label">{t("preview.taxRate")}</span><input type="number" min="0" max="100" step="0.1" disabled={!proposalSettings.showTaxes} value={proposalSettings.taxRate * 100} onChange={(event) => updateProposalSettings({ taxRate: Number(event.target.value) / 100 })} /></label>
            </div>
            {proposalSettings.pricingMode !== "effort_only" && (
              <div className="proposal-rate-note">
                <span>{selectedMethod?.referenceRate ? t("preview.rateUsed", { rate: selectedMethod.referenceRate, currency: proposalSettings.currency }) : t("preview.rateMissing")}</span>
                <InlineHelp label={t("preview.rateHelpLabel")}>{t("preview.rateHelp")}</InlineHelp>
              </div>
            )}
            <div className="proposal-settings-toggles">
              <ProposalToggle checked={proposalSettings.showPrices} disabled={proposalSettings.pricingMode === "effort_only"} label={t("preview.showPrices")} help={t("preview.showPricesHelp")} onChange={(checked) => updateProposalSettings({ showPrices: checked })} />
              <ProposalToggle checked={proposalSettings.showRates} disabled={!proposalSettings.showPrices || proposalSettings.pricingMode === "effort_only"} label={t("preview.showRates")} help={t("preview.showRatesHelp")} onChange={(checked) => updateProposalSettings({ showRates: checked })} />
              <ProposalToggle checked={proposalSettings.showEffort} label={t("preview.showEffort")} help={t("preview.showEffortHelp")} onChange={(checked) => updateProposalSettings({ showEffort: checked })} />
              <ProposalToggle checked={proposalSettings.showContext} label={t("preview.showContext")} help={t("preview.showContextHelp")} onChange={(checked) => updateProposalSettings({ showContext: checked })} />
              <ProposalToggle checked={proposalSettings.showAssumptions} label={t("preview.showAssumptions")} help={t("preview.showAssumptionsHelp")} onChange={(checked) => updateProposalSettings({ showAssumptions: checked })} />
              <ProposalToggle checked={proposalSettings.showExclusions} label={t("preview.showExclusions")} help={t("preview.showExclusionsHelp")} onChange={(checked) => updateProposalSettings({ showExclusions: checked })} />
              <ProposalToggle checked={proposalSettings.showConditions} label={t("preview.showConditions")} help={t("preview.showConditionsHelp")} onChange={(checked) => updateProposalSettings({ showConditions: checked })} />
              <ProposalToggle checked={proposalSettings.showTaxes} label={t("preview.showTaxes")} help={t("preview.showTaxesHelp")} onChange={(checked) => updateProposalSettings({ showTaxes: checked })} />
              <ProposalToggle checked={proposalSettings.showPlanning} label={t("preview.showPlanning")} help={t("preview.showPlanningHelp")} onChange={(checked) => updateProposalSettings({ showPlanning: checked })} />
              <ProposalToggle checked={proposalSettings.showOptions} label={t("preview.showOptions")} help={t("preview.showOptionsHelp")} onChange={(checked) => updateProposalSettings({ showOptions: checked })} />
              <ProposalToggle checked={proposalSettings.showAcceptance} label={t("preview.showAcceptance")} help={t("preview.showAcceptanceHelp")} onChange={(checked) => updateProposalSettings({ showAcceptance: checked })} />
            </div>
            <div className="proposal-terms-grid">
              <label className="field"><span className="field-label">{t("preview.paymentTerms")}</span><textarea rows={3} value={proposalSettings.paymentTerms} onChange={(event) => updateProposalSettings({ paymentTerms: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.startConditions")}</span><textarea rows={3} value={proposalSettings.startConditions} onChange={(event) => updateProposalSettings({ startConditions: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.clientResponsibilities")}</span><textarea rows={3} value={proposalSettings.clientResponsibilities} onChange={(event) => updateProposalSettings({ clientResponsibilities: event.target.value })} /></label>
              <label className="field"><span className="field-label">{t("preview.changePolicy")}</span><textarea rows={3} value={proposalSettings.changePolicy} onChange={(event) => updateProposalSettings({ changePolicy: event.target.value })} /></label>
            </div>
          </div>
        </details>
      )}
      <article
        lang={mode === "client" ? clientLocale : undefined}
        className={`card proposal-document proposal-${mode}`}
      >
        <header className="proposal-cover">
          <div>
            <div className="eyebrow">
              {pt(
                state.project.mode === "demo"
                  ? "preview.proposalLabelDemo"
                  : "preview.proposalLabelLive",
              )}
            </div>
            <h1>{state.project.name}</h1>
            <p>
              {pt("preview.prepared", {
                date: formatDateFor(
                  mode === "client" ? clientLocale : locale,
                  new Date(),
                  { dateStyle: "medium" },
                ),
              })}
            </p>
          </div>
          <BrandLogo variant="mark" className="proposal-brand" />
        </header>
        {mode === "internal" && state.proposalSnapshot && (
          <div className="proposal-version-note no-print">
            {t("readiness.generated", {
              revision: state.estimateSnapshots.find((snapshot) => snapshot.id === state.proposalSnapshot?.estimateSnapshotId)?.revision ?? "—",
            })}
          </div>
        )}
        <section className="proposal-intro">
          <span className="proposal-section-number">01</span>
          <div>
            <h2>{pt("preview.contextObjectives")}</h2>
            <p>{state.analysis?.executiveSummary}</p>
            <div className="objective-grid">
              <div>
                <strong>{pt("preview.outcome")}</strong>
                <span>{pt("preview.outcomeCopy")}</span>
              </div>
              <div>
                <strong>{pt("preview.launchShape")}</strong>
                <span>{pt("preview.launchShapeCopy")}</span>
              </div>
              <div>
                <strong>{pt("preview.operatingModel")}</strong>
                <span>{pt("preview.operatingModelCopy")}</span>
              </div>
            </div>
          </div>
        </section>
        <section className="proposal-scope">
          <span className="proposal-section-number">02</span>
          <div>
            <h2>{pt("preview.includedScope")}</h2>
            {state.workstreams.map((workstream) => (
              <div className="proposal-workstream" key={workstream.id}>
                <h3>{workstream.name}</h3>
                {workstream.modules
                  .filter((module) => module.status === "included")
                  .map((module) => {
                    const line = state.estimateLines.find(
                      (item) => item.moduleId === module.id,
                    );
                    return (
                      <div className="proposal-module" key={module.id}>
                        <div>
                          <strong>{module.name}</strong>
                          <p>{module.description}</p>
                          {mode === "internal" && (
                            <div className="internal-signals">
                              <span
                                className={`badge badge-${line?.risk === "high" ? "red" : line?.risk === "medium" ? "amber" : "green"}`}
                              >
                                {line?.risk && t(`common.${line.risk}`)}{" "}
                                {t("common.risk")}
                              </span>
                              <span className="badge badge-muted">
                                {line?.confidence &&
                                  t(`common.${line.confidence}`)}{" "}
                                {t("common.confidence")}
                              </span>
                              <CitationChips citations={module.citations} />
                            </div>
                          )}
                        </div>
                        {(mode === "internal" ||
                          state.project.preferences.showEffortInClient) && (
                          <span className="mono">
                            {line?.low}-{line?.high} {unit}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </section>
        {mode === "internal" || state.project.preferences.showEffortInClient ? (
          <section className="proposal-effort">
            <span>
              <small>{pt("preview.effort")}</small>
              <strong className="mono">
                {totals.proposed.low.toFixed(1)}-
                {totals.proposed.high.toFixed(1)} {unit}
              </strong>
            </span>
            <span>
              <small>{pt("preview.planningCase")}</small>
              <strong className="mono">
                {totals.proposed.likely.toFixed(1)} {unit}
              </strong>
            </span>
            <span>
              <small>{pt("preview.calendar")}</small>
              <strong>10-14 {pt("preview.weeks")}</strong>
            </span>
            {mode === "internal" && (
              <div className="internal-math">
                {t("preview.base")} {totals.base.likely} +{" "}
                {t("common.reserve").toLowerCase()} {totals.reserve.likely} (
                {state.project.contingencyRate * 100}%)
              </div>
            )}
          </section>
        ) : (
          <div className="client-effort-hidden">
            {pt("preview.clientEffortHidden")}
          </div>
        )}
        <section className="proposal-columns">
          <div className="proposal-panel proposal-options">
            <span className="proposal-section-number">03</span>
            <h2>{pt("common.options")}</h2>
            {optional.map((module) => {
              const line = state.estimateLines.find(
                (item) => item.moduleId === module.id,
              );
              return (
                <div className="proposal-option" key={module.id}>
                  <strong>{module.name}</strong>
                  {(mode === "internal" ||
                    state.project.preferences.showEffortInClient) && (
                    <span className="mono">
                      {line?.low}-{line?.high} {unit}
                    </span>
                  )}
                  <p>{module.description}</p>
                </div>
              );
            })}
          </div>
          <div className="proposal-panel proposal-exclusions">
            <span className="proposal-section-number">04</span>
            <h2>{pt("preview.exclusions")}</h2>
            <ul>
              {excluded.map((module) => (
                <li key={module.id}>{module.name}</li>
              ))}
            </ul>
          </div>
          <div className="proposal-panel proposal-assumptions">
            <h2>{pt("preview.assumptions")}</h2>
            <ul>
              {assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </div>
        </section>
        {mode === "internal" && (
          <section className="internal-appendix">
            <div>
              <span className="proposal-section-number">05</span>
              <h2>{t("preview.internalRecord")}</h2>
            </div>
            {state.decisions.map((decision) => (
              <div className="internal-decision-entry" key={decision.id}>
                <div className="internal-decision-meta">
                  <span className="badge badge-muted">{decision.sourceQuestionId ?? "—"}</span>
                  <span className="badge badge-green">{t("common.recorded")}</span>
                </div>
                <div className="internal-decision-body">
                  <small>{t("preview.questionLabel")}</small>
                  <strong>
                    {state.questions.find((question) => question.id === decision.sourceQuestionId)?.text ??
                      t("preview.decisionWithoutQuestion")}
                  </strong>
                  <p><span>{t("preview.answerLabel")} :</span> {decision.statement}</p>
                </div>
              </div>
            ))}
            <h3>{t("preview.recentActivity")}</h3>
            {state.activity
              .slice(-4)
              .reverse()
              .map((item) => (
                <p className="activity-line" key={item.id}>
                  {item.label}
                  <time>
                    {formatDateFor(locale, item.createdAt, {
                      timeStyle: "short",
                    })}
                  </time>
                </p>
              ))}
          </section>
        )}
        <footer>
          {pt(
            state.project.mode === "demo"
              ? "preview.footerDemo"
              : "preview.footerLive",
          )}
        </footer>
      </article>
    </>
  );
}
