"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock3,
  Download,
  Eye,
  History,
  ListChecks,
  Menu,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LanguageSelector, useI18n } from "@/i18n";
import { resolvedClientLanguage } from "@/infrastructure/project-repository";
import { projectRepository } from "@/infrastructure/project-repository";
import { parseProjectBackup, restoreProjectBackupAsNewProject, serializeProjectBackup } from "@/infrastructure/project-backup";
import { createAnonymizedDiagnosticReport } from "@/infrastructure/local-diagnostics";
import { BrandLogo } from "./brand-logo";
import { Drawer } from "./primitives/drawer";
import { SelectField } from "./primitives/select-field";
import { PercentageField } from "./primitives/percentage-field";
import { DemoTour, demoTourStorageKey } from "./demo-tour";
import { useWorkspace } from "./workspace-provider";

const steps = [
  ["sources", "navigation.sources"],
  ["analysis", "navigation.analysis"],
  ["questions", "navigation.questions"],
  ["estimate", "navigation.estimate"],
  ["preview", "navigation.preview"],
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, date } = useI18n();
  const {
    state,
    reset,
    busy,
    executionMode,
    aiConfiguration,
    storageStatus,
    updateProjectSettings,
    updateEstimationPreferences,
    recordExport,
    operation,
    retryLastAction,
    methods,
    references,
    selectedMethod,
    referenceMatches,
    setEstimationMethod,
    toggleReference,
    compareWithReference,
    setContingency,
    resetMethodOverrides,
    readiness,
    acknowledgeValidationWarning,
  } = useWorkspace();
  const [navOpen, setNavOpen] = useState(false);
  const [panel, setPanel] = useState<"settings" | "timeline" | "readiness">();
  const backupInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const openSettings = () => setPanel("settings");
    const openReadiness = () => setPanel("readiness");
    window.addEventListener("scopeforge:open-settings", openSettings);
    window.addEventListener("scopeforge:open-readiness", openReadiness);
    return () => {
      window.removeEventListener("scopeforge:open-settings", openSettings);
      window.removeEventListener("scopeforge:open-readiness", openReadiness);
    };
  }, []);
  const active = Math.max(
    0,
    steps.findIndex(([slug]) => pathname.includes(`/${slug}`)),
  );
  const openQuestions = state.questions.filter(
    (question) => question.status === "open",
  ).length;
  const completed = [0, 1, 2, 4, 6].map((index) => readiness.milestones[index]?.state === "complete");
  const progress = readiness.progress;
  const base = `/projects/${state.project.id}`;
  const nextMilestone = readiness.milestones.find((milestone) => milestone.state !== "complete");
  const nextAction = nextMilestone ? t(`readiness.${nextMilestone.label}`) : t("readiness.proposal");
  const downloadDiagnostics = () => {
    const blob = new Blob([createAnonymizedDiagnosticReport(state.project.id)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scopeforge-diagnostic-${state.project.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const resolved =
    state.project.resolvedProjectLanguage ??
    (state.project.projectLanguage === "auto"
      ? null
      : state.project.projectLanguage);
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scopeforge-${state.project.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    recordExport("JSON");
  };
  const exportBackup = () => {
    const blob = new Blob([serializeProjectBackup(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scopeforge-project-v1-${state.project.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const restoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const backup = parseProjectBackup(await file.text());
      if (!window.confirm(t("exports.restoreConfirm", { name: String(backup.project.name ?? "project") }))) return;
      const restored = restoreProjectBackupAsNewProject(backup);
      projectRepository.save(restored);
      router.push(`/projects/${restored.project.id}/sources`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t("exports.restoreFailed"));
    }
  };

  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        {t("common.skipToContent")}
      </a>
      <button
        className="mobile-nav-toggle btn no-print"
        aria-label={navOpen ? t("common.close") : t("navigation.workflow")}
        aria-expanded={navOpen}
        onClick={() => setNavOpen(!navOpen)}
      >
        {navOpen ? <X size={18} /> : <Menu size={18} />}
        <span>{t("navigation.workflow")}</span>
      </button>
      {navOpen && (
        <button
          className="nav-backdrop no-print"
          aria-label={t("common.close")}
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside className={`sidebar no-print ${navOpen ? "open" : ""}`}>
        <Link href="/" className="brand">
          <BrandLogo variant="responsive" priority />
        </Link>
        <div className="nav-project">
          <div className="nav-project-title">
            <span className="project-monogram">
              {state.project.name
                .split(/\s+/)
                .map((word) => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <div>
              <strong>{state.project.name}</strong>
              <span>{state.project.sector || t("common.project")}</span>
            </div>
          </div>
          <div className="project-language-row">
            <span className="badge badge-green">
              {resolved?.toUpperCase() ?? "AUTO"}
            </span>
            <span aria-hidden="true">→</span>
            <span className="badge badge-muted">
              {resolvedClientLanguage(state).toUpperCase()}
            </span>
          </div>
          <button className="project-progress-copy" onClick={() => setPanel("readiness")}>
            <span>{t("navigation.projectReadiness")}</span>
            <strong>{progress}%</strong>
            <ListChecks size={14} aria-hidden="true" />
          </button>
          <div className="nav-progress" aria-label={`${progress}%`}>
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="nav-section-label">{t("navigation.workflow")}</span>
        <ol className="step-list">
          {steps.map(([slug, labelKey], index) => (
            <li key={slug}>
              <Link
                aria-current={active === index ? "step" : undefined}
                onClick={() => setNavOpen(false)}
                className={`step-link ${active === index ? "active" : ""}`}
                href={`${base}/${slug}`}
              >
                <span className="step-dot">
                  {completed[index] && index !== active ? (
                    <Check size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="step-label">
                  {t(labelKey)}
                  <small className="step-state">
                    {completed[index]
                      ? t("common.complete")
                      : index === active
                        ? t("common.inProgress")
                        : t("common.notStarted")}
                    {slug === "questions" && openQuestions
                      ? ` · ${t("navigation.openQuestions", { count: openQuestions })}`
                      : ""}
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="sidebar-next">
          <span>{t("navigation.upNext")}</span>
          <strong>{nextAction}</strong>
          <i>→</i>
        </div>
        <div className="sidebar-tools">
          <button
            className="btn btn-ghost btn-sm"
            aria-label={t("navigation.preferences")}
            onClick={() => setPanel("settings")}
          >
            <Settings2 size={15} />
            <span>{t("navigation.preferences")}</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            aria-label={t("navigation.timeline")}
            onClick={() => setPanel("timeline")}
          >
            <History size={15} />
            <span>{t("navigation.timeline")}</span>
          </button>
        </div>
        <div className="sidebar-foot">
          <p>
            <span className="control-dot" />
            {t("navigation.controlNote")}
          </p>
          {state.project.mode === "demo" && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  localStorage.removeItem(demoTourStorageKey(state.project.id));
                  window.dispatchEvent(new Event("scopeforge:restart-demo-tour"));
                  setNavOpen(false);
                }}
              >
                <Eye size={14} />
                <span>{t("navigation.restartTour")}</span>
              </button>
              <button
                className="btn btn-ghost btn-sm"
                aria-label={t("navigation.resetDemo")}
                onClick={() => {
                  if (!window.confirm(t("navigation.resetDemoConfirm"))) return;
                  localStorage.removeItem(demoTourStorageKey(state.project.id));
                  reset();
                  router.push(`${base}/sources`);
                  setNavOpen(false);
                  window.dispatchEvent(new Event("scopeforge:restart-demo-tour"));
                }}
              >
                <RotateCcw size={14} />
                <span>{t("navigation.resetDemo")}</span>
              </button>
            </>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar no-print">
          <div className="status-line">
            <span className="status-pulse" />
            <span className="status-context">
              {t(
                state.project.mode === "demo"
                  ? "navigation.demoWorkspace"
                  : "navigation.projectWorkspace",
              )}
            </span>
            <strong>{state.project.name}</strong>
            {openQuestions > 0 && (
              <span className="open-count">
                {t("navigation.openQuestions", { count: openQuestions })}
              </span>
            )}
          </div>
          <div className="top-actions">
            {operation && (operation.status !== "completed" || busy) && (
              <div className={`ai-operation-chip ${busy ? "is-active" : operation.status === "failed" ? "is-failed" : ""}`} role="status" aria-live="polite" aria-busy={!!busy}>
                <span className="ai-operation-dot" aria-hidden="true" />
                <span>{operation.label}</span>
                <strong>{Math.floor(operation.elapsedMs / 1000)}s</strong>
                {operation.status === "failed" && <button className="btn btn-ghost btn-sm" onClick={() => void retryLastAction()}>{t("errors.retry")}</button>}
              </div>
            )}
            {(busy ||
              operation?.status === "failed" ||
              operation?.status === "cancelled" ||
              executionMode === "not_configured" ||
              executionMode === "error") && (
              <span className={`ai-mode-chip mode-${executionMode ?? "ready"}`}>
                {busy
                  ? t("ai.requesting", {
                      model: aiConfiguration?.primaryModel ?? "GPT-5.6",
                    })
                  : executionMode === "not_configured"
                    ? t("common.aiNotConfigured")
                    : t("common.aiRequestFailed")}
              </span>
            )}
            <LanguageSelector compact />
            <button
              className="btn"
              onClick={() => router.push(`${base}/preview`)}
            >
              <Eye size={16} />
              <span className="label">{t("navigation.previewAction")}</span>
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="btn btn-primary">
                <Download size={16} />
                <span className="label">{t("navigation.exportAction")}</span>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="project-menu-content" sideOffset={7} align="end">
                  <DropdownMenu.Item onSelect={exportData}>{t("exports.json")}</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={exportBackup}>{t("exports.backup")}</DropdownMenu.Item>
                  <DropdownMenu.Item onSelect={() => backupInputRef.current?.click()}>{t("exports.restoreBackup")}</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <input ref={backupInputRef} type="file" accept="application/json,.json" hidden onChange={restoreBackup} />
          </div>
        </header>
        <main id="main-content" className="content">
          {!storageStatus.persistent && (
            <div className="storage-warning" role="alert">
              <AlertTriangle size={18} />
              <div>
                <strong>{t("errors.storageUnavailable")}</strong>
                <span>{t("errors.storageUnavailableCopy")}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={exportBackup}>{t("exports.backup")}</button>
            </div>
          )}
          {children}
        </main>
      </div>
      {state.project.mode === "demo" && <DemoTour projectId={state.project.id} />}
      <Drawer
        open={panel === "readiness"}
        onOpenChange={(open) => setPanel(open ? "readiness" : undefined)}
        eyebrow={t("navigation.checklist")}
        title={t("readiness.title")}
        description={t("readiness.copy")}
        closeLabel={t("common.close")}
      >
        <ReadinessPanel readiness={readiness} onAcknowledge={acknowledgeValidationWarning} onNavigate={() => setPanel(undefined)} />
      </Drawer>
      <Drawer
        open={panel === "settings"}
        onOpenChange={(open) => setPanel(open ? "settings" : undefined)}
        eyebrow={t("navigation.preferences")}
        title={t("preferences.title")}
        description={t("preferences.futureOnly")}
        closeLabel={t("common.close")}
      >
        {renderSettingsPanel()}
      </Drawer>
      <Drawer
        open={panel === "timeline"}
        onOpenChange={(open) => setPanel(open ? "timeline" : undefined)}
        eyebrow={t("navigation.timeline")}
        title={t("decisions.timelineTitle")}
        description={t("decisions.timelineCopy")}
        closeLabel={t("common.close")}
      >
        <div className="timeline-list">
          {state.activity.length ? (
            state.activity
              .slice()
              .reverse()
              .map((item) => (
                <article key={item.id}>
                  <span className="timeline-dot">
                    <Clock3 size={13} />
                  </span>
                  <div>
                    <span className="timeline-kind">
                      {t(
                        `decisions.kind${(item.kind ?? "project")
                          .split("_")
                          .map((part) => part[0].toUpperCase() + part.slice(1))
                          .join("")}`,
                      )}
                    </span>
                    <strong>{item.label}</strong>
                    {(item.before || item.after) && (
                      <p>
                        <del>{item.before}</del>
                        {item.after && <ins>{item.after}</ins>}
                      </p>
                    )}
                    <time>
                      {date(item.createdAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                </article>
              ))
          ) : (
            <p>{t("decisions.noActivity")}</p>
          )}
        </div>
      </Drawer>
    </div>
  );

  function renderSettingsPanel() {
    return (
      <div className="settings-body">
        <section>
          <h3>{t("preferences.general")}</h3>
          <div className="settings-stack">
            <label className="field"><span className="field-label">{t("projects.name")}</span><input value={state.project.name} onChange={(event) => updateProjectSettings({ name: event.target.value })} /></label>
            <label className="field"><span className="field-label">{t("projects.clientOptional")}</span><input value={state.project.clientName} onChange={(event) => updateProjectSettings({ clientName: event.target.value })} /></label>
            <label className="field"><span className="field-label">{t("projects.sectorOptional")}</span><input value={state.project.sector} onChange={(event) => updateProjectSettings({ sector: event.target.value })} /></label>
            <div className="settings-readonly"><span>{t("preferences.mode")}</span><strong>{t(state.project.mode === "demo" ? "ai.demoProject" : "ai.liveProject")}</strong></div>
          </div>
        </section>
        <section>
          <h3>{t("ai.title")}</h3>
          <div className="ai-configuration-grid">
            <div>
              <span>
                {aiConfiguration?.configured
                  ? t("ai.configured")
                  : t("ai.notConfigured")}
              </span>
              <strong>{aiConfiguration?.primaryModel ?? "GPT-5.6"}</strong>
            </div>
            <div>
              <span>{t("ai.projectMode")}</span>
              <strong>
                {t(
                  state.project.mode === "demo"
                    ? "ai.demoProject"
                    : "ai.liveProject",
                )}
              </strong>
            </div>
            <div>
              <span>{t("ai.lastResult")}</span>
              <strong>
                {state.aiExecution
                  ? state.aiExecution.executionMode === "live"
                    ? t("ai.liveResult", {
                        model:
                          state.aiExecution.model ??
                          aiConfiguration?.primaryModel ??
                          "GPT-5.6",
                      })
                    : t("ai.demoResult")
                  : t("ai.noResult")}
              </strong>
              {state.aiExecution && (
                <small>
                  {t("ai.generatedAt", {
                    date: date(state.aiExecution.generatedAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                  <br />
                  {t("ai.promptVersion", {
                    version: state.aiExecution.promptVersion,
                  })}
                  {state.aiExecution.requestId && (
                    <>
                      <br />
                      {t("ai.requestId", {
                        id: state.aiExecution.requestId,
                      })}
                    </>
                  )}
                </small>
              )}
            </div>
          </div>
          {aiConfiguration?.diagnosticsEnabled && (
            <button className="btn btn-ghost btn-sm" onClick={downloadDiagnostics}>
              <Download size={15} />
              {t("ai.exportDiagnostics")}
            </button>
          )}
        </section>
        <section>
          <h3>{t("preferences.languageTitle")}</h3>
          <div className="settings-stack">
            <div>
              <span className="field-label">
                {t("preferences.interfaceLanguage")}
              </span>
              <LanguageSelector />
            </div>
            <SelectField
              label={t("preferences.projectLanguage")}
              value={state.project.projectLanguage}
              onValueChange={(value) =>
                updateProjectSettings({ projectLanguage: value })
              }
              options={languageOptions(true)}
            />
            <SelectField
              label={t("preferences.clientLanguage")}
              value={state.project.clientOutputLanguage}
              onValueChange={(value) =>
                updateProjectSettings({ clientOutputLanguage: value })
              }
              options={[
                { value: "same_as_project", label: t("common.sameAsProject") },
                ...languageOptions(false),
              ]}
            />
          </div>
          <div className="language-policy-note">
            <strong>{resolved?.toUpperCase() ?? "AUTO"}</strong>
            <span>
              {state.project.projectLanguageConfirmed
                ? t("preferences.autoConfirmed")
                : t("preferences.futureOnly")}
            </span>
          </div>
        </section>
        <section>
          <h3>{t("preferences.estimationTitle")}</h3>
          <SelectField
            label={t("methods.select")}
            value={state.project.estimationMethodId ?? ""}
            onValueChange={(value) => setEstimationMethod(value || null)}
            options={methods.filter((method) => method.status === "active").map((method) => ({ value: method.id, label: method.name }))}
          />
          {selectedMethod && (
            <div className="method-summary">
              <p>{selectedMethod.description}</p>
              <div className="method-meta">
                <span>{t("methods.unit")}: {selectedMethod.primaryUnit.replace("person_days", t("common.personDays"))}</span>
                <span>{t("methods.reserve")}: {Math.round(selectedMethod.reserveRate * 100)}%</span>
                <span className={Object.keys(state.project.estimationMethodOverrides).length ? "override-active" : ""}>{Object.keys(state.project.estimationMethodOverrides).length ? t("methods.overridden") : t("methods.inherited")}</span>
              </div>
              {Object.keys(state.project.estimationMethodOverrides).length > 0 && <button className="btn btn-ghost btn-sm method-reset" onClick={resetMethodOverrides}>{t("methods.resetOverrides")}</button>}
            </div>
          )}
          <div className="settings-grid">
            <SelectField
              label={t("projects.estimationUnit")}
              value={state.project.estimationUnit}
              onValueChange={(value) =>
                updateProjectSettings({
                  estimationUnit: value as "day" | "hour",
                })
              }
              options={[
                { value: "day", label: t("common.days") },
                { value: "hour", label: t("common.hours") },
              ]}
            />
            <SelectField
              label={t("projects.currency")}
              value={state.project.currency}
              onValueChange={(value) =>
                updateProjectSettings({ currency: value })
              }
              options={["EUR", "USD", "GBP", "MAD"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <PercentageField
              label={t("estimate.estimateReserve")}
              help={t("estimate.reserveHelp")}
              disabled={Boolean(state.approvedEstimateSnapshotId)}
              value={state.project.contingencyRate}
              onValueChange={setContingency}
            />
            <label className="field">
              <span className="field-label">{t("estimate.teamSize")}</span>
              <input
                type="number"
                min="1"
                max="20"
                value={state.project.preferences.teamSize}
                onChange={(event) =>
                  updateEstimationPreferences({
                    teamSize: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span className="field-label">
                {t("estimate.productiveDays")}
              </span>
              <input
                type="number"
                min="1"
                max="31"
                value={state.project.preferences.productiveDaysPerMonth}
                onChange={(event) =>
                  updateEstimationPreferences({
                    productiveDaysPerMonth: Number(event.target.value),
                  })
                }
              />
            </label>
            <SelectField
              label={t("estimate.rounding")}
              value={String(state.project.preferences.rounding)}
              onValueChange={(value) =>
                updateEstimationPreferences({
                  rounding: Number(value) as 0.5 | 1 | 5,
                })
              }
              options={["0.5", "1", "5"].map((value) => ({
                value,
                label: value,
              }))}
            />
            <SelectField
              label={t("estimate.commercialModel")}
              value={state.project.preferences.commercialModel}
              onValueChange={(value) =>
                updateEstimationPreferences({
                  commercialModel: value as
                    "fixed_price" | "time_and_materials",
                })
              }
              options={[
                { value: "fixed_price", label: t("estimate.fixedPrice") },
                {
                  value: "time_and_materials",
                  label: t("estimate.timeMaterials"),
                },
              ]}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={state.project.preferences.includeReserveInOptions}
              onChange={(event) =>
                updateEstimationPreferences({
                  includeReserveInOptions: event.target.checked,
                })
              }
            />
            <span>{t("estimate.includeReserveOptions")}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={state.project.preferences.showEffortInClient}
              onChange={(event) =>
                updateEstimationPreferences({
                  showEffortInClient: event.target.checked,
                })
              }
            />
            <span>{t("estimate.showEffortClient")}</span>
          </label>
          <SelectField
            label={t("exports.deliverable")}
            value={state.project.preferences.deliverableType}
            onValueChange={(value) =>
              updateEstimationPreferences({
                deliverableType:
                  value as typeof state.project.preferences.deliverableType,
              })
            }
            options={[
              {
                value: "internal_estimate",
                label: t("exports.internalEstimate"),
              },
              { value: "client_summary", label: t("exports.clientSummary") },
              {
                value: "commercial_proposal",
                label: t("exports.commercialProposal"),
              },
              {
                value: "functional_appendix",
                label: t("exports.functionalAppendix"),
              },
              { value: "raw_export", label: t("exports.raw") },
            ]}
          />
          <div className="reference-context-panel">
            <div className="reference-context-heading">
              <div>
                <h4>{t("methods.references")}</h4>
                <p>{t("methods.referenceHelp")}</p>
              </div>
              <span className="badge badge-muted">{state.referenceCaseIds.length}/3</span>
            </div>
            <div className="reference-context-list">
              {references.filter((reference) => reference.status === "active").map((reference) => {
                const selected = state.referenceCaseIds.includes(reference.id);
                const match = referenceMatches.find((item) => item.referenceId === reference.id);
                return (
                  <div className={`reference-context-item ${selected ? "selected" : ""}`} key={reference.id}>
                    <div>
                      <strong>{reference.title}</strong>
                      <span>{reference.projectType} · {reference.sector}</span>
                      {match && <small>{match.score}% · {match.explanation}</small>}
                    </div>
                    <div className="reference-context-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleReference(reference.id)}>
                        {selected ? t("methods.removeReference") : t("methods.selectReference")}
                      </button>
                      {selected && <button className="btn btn-secondary btn-sm" onClick={() => {
                        compareWithReference(reference.id);
                        setPanel(undefined);
                        if (!pathname.endsWith("/estimate")) router.push(`${base}/estimate`);
                        const scrollToComparison = () => {
                          document.getElementById("estimate-comparison")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        };
                        window.setTimeout(scrollToComparison, 180);
                      }}>{t("methods.compare")}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function languageOptions(includeAuto: boolean) {
    return [
      ...(includeAuto ? [{ value: "auto", label: t("common.automatic") }] : []),
      { value: "fr", label: t("common.french") },
      { value: "en", label: t("common.english") },
    ];
  }
}

function ReadinessPanel({
  readiness,
  onAcknowledge,
  onNavigate,
}: {
  readiness: ReturnType<typeof useWorkspace>["readiness"];
  onAcknowledge: (id: string) => void;
  onNavigate: () => void;
}) {
  const { t } = useI18n();
  const stateLabel = (state: string) => t(`readiness.${state}`);
  const warningMessage = (id: string, fallback: string) => {
    const key = id === "blocking-questions"
      ? "readiness.blockingQuestions"
      : id === "critical-inconsistency"
        ? "readiness.criticalInconsistency"
        : id === "open-questions"
          ? "readiness.openQuestions"
          : id === "recognized-inconsistencies"
            ? "readiness.recognizedInconsistencies"
            : id === "no-reference-case"
              ? "readiness.noReference"
              : "";
    return key ? t(key) : fallback;
  };
  return (
    <div className="readiness-panel">
      <div className="readiness-summary">
        <strong>{t("readiness.progress", { done: readiness.completedRequired, total: readiness.totalRequired })}</strong>
        <span>{readiness.progress}%</span>
      </div>
      <div className="readiness-list">
        {readiness.milestones.map((milestone) => (
          <article className={`readiness-item state-${milestone.state}`} key={milestone.id}>
            <span className="readiness-icon" aria-hidden="true">
              {milestone.state === "complete" ? <Check size={15} /> : milestone.state === "attention" ? <AlertTriangle size={15} /> : <span>{milestone.id[0].toUpperCase()}</span>}
            </span>
            <div>
              <strong>{t(`readiness.${milestone.label}`)}</strong>
              <p>{t(`readiness.${milestone.description}`)}</p>
              <span className="readiness-state">{stateLabel(milestone.state)}</span>
            </div>
            {milestone.state !== "complete" && milestone.state !== "optional" && (
              <Link className="btn btn-ghost btn-sm" href={milestone.href} onClick={onNavigate}>
                {t("common.open")}
              </Link>
            )}
          </article>
        ))}
      </div>
      {readiness.warnings.length > 0 && (
        <section className="readiness-warnings">
          <h3>{t("readiness.warning")}</h3>
          {readiness.warnings.map((warning) => (
            <label className={`readiness-warning ${warning.severity}`} key={warning.id}>
              <input type="checkbox" checked={warning.acknowledged} disabled={warning.severity === "blocking"} onChange={() => onAcknowledge(warning.id)} />
              <span>{warningMessage(warning.id, warning.message)}</span>
              {warning.severity === "blocking" && <strong>{t("readiness.blockingWarning")}</strong>}
            </label>
          ))}
        </section>
      )}
    </div>
  );
}
