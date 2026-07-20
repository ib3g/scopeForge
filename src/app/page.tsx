"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import {
  Archive,
  ArrowRight,
  Check,
  Copy,
  FileText,
  FolderPlus,
  MoreHorizontal,
  Quote,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ClientOutputLanguage,
  ProjectLanguage,
  WorkspaceState,
} from "@/domain/schemas";
import { createInitialState } from "@/infrastructure/demo-data";
import { createFrenchDemoState } from "@/infrastructure/demo-data-fr";
import {
  createEmptyProject,
  duplicateProject,
  projectRepository,
  projectSummary,
} from "@/infrastructure/project-repository";
import { LanguageSelector, useI18n } from "@/i18n";
import { BrandLogo } from "@/ui/brand-logo";
import { SelectField } from "@/ui/primitives/select-field";
import { Modal } from "@/ui/primitives/drawer";

type CreateForm = {
  name: string;
  clientName: string;
  sector: string;
  projectLanguage: ProjectLanguage;
  clientOutputLanguage: ClientOutputLanguage;
  estimationUnit: "day" | "hour";
  currency: string;
  contingencyRate: number;
};
const emptyForm: CreateForm = {
  name: "",
  clientName: "",
  sector: "",
  projectLanguage: "auto",
  clientOutputLanguage: "same_as_project",
  estimationUnit: "day",
  currency: "EUR",
  contingencyRate: 0.15,
};

export default function Home() {
  const router = useRouter();
  const { t, date, locale } = useI18n();
  const [projects, setProjects] = useState<WorkspaceState[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceState>();
  const [renaming, setRenaming] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const [publicDemo, setPublicDemo] = useState(false);
  const [publicNoticeOpen, setPublicNoticeOpen] = useState(false);

  const refresh = () => setProjects(projectRepository.list());
  useEffect(() => {
    // Keep the server and first client render identical, then hydrate the local repository.
    queueMicrotask(refresh);
  }, []);
  useEffect(() => {
    void fetch("/api/ai/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ deploymentProfile?: string }> : null)
      .then((configuration) => setPublicDemo(configuration?.deploymentProfile === "public_demo"))
      .catch(() => undefined);
  }, []);
  const visible = useMemo(
    () =>
      projects.filter(
        (state) =>
          Boolean(state.project.archivedAt) === (filter === "archived") &&
          `${state.project.name} ${state.project.clientName} ${state.project.sector}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
      ),
    [projects, query, filter],
  );

  const loadDemo = (language: "en" | "fr") => {
    const state =
      language === "fr" ? createFrenchDemoState() : createInitialState();
    projectRepository.save(state);
    router.push(`/projects/${state.project.id}/sources`);
  };
  const create = () => {
    if (!form.name.trim()) return;
    const state = createEmptyProject(form);
    projectRepository.save(state);
    setCreateOpen(false);
    setForm(emptyForm);
    router.push(`/projects/${state.project.id}/sources`);
  };
  const requestProjectCreation = () => {
    if (publicDemo) setPublicNoticeOpen(true);
    else setCreateOpen(true);
  };
  const archive = (state: WorkspaceState) => {
    projectRepository.save({
      ...state,
      project: {
        ...state.project,
        archivedAt: state.project.archivedAt ? null : new Date().toISOString(),
      },
    });
    refresh();
  };
  const duplicate = (state: WorkspaceState) => {
    projectRepository.save(duplicateProject(state));
    refresh();
  };
  const saveRename = (state: WorkspaceState) => {
    if (renameValue.trim())
      projectRepository.save({
        ...state,
        project: { ...state.project, name: renameValue.trim() },
      });
    setRenaming(undefined);
    refresh();
  };

  return (
    <main className="landing dashboard-page" id="main-content">
      <header className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="ScopeForge">
          <BrandLogo priority />
        </Link>
        <div className="landing-nav-actions">
          <span className="landing-event">{t("onboarding.buildWeek")}</span>
          <LanguageSelector />
        </div>
      </header>
      <section className="landing-hero dashboard-hero">
        <div className="landing-copy">
          <div className="landing-kicker">
            <span>{t("onboarding.kicker")}</span>
            <i />
          </div>
          <h1>{t("onboarding.title")}</h1>
          <p>{t("onboarding.copy")}</p>
          <div className="landing-actions">
            <button
              className="btn btn-primary landing-cta"
              aria-label={t("onboarding.openDemo")}
              onClick={() => loadDemo(locale)}
            >
              {t("onboarding.openDemo")} <ArrowRight size={17} />
            </button>
            <button
              className="btn btn-ghost landing-cta"
              onClick={requestProjectCreation}
            >
              <FolderPlus size={17} />
              {t("onboarding.createProject")}
            </button>
          </div>
          <div className="landing-proof">
            <span>
              <Check size={14} />
              {t("onboarding.proofProvenance")}
            </span>
            <span>
              <Check size={14} />
              {t("onboarding.proofTotals")}
            </span>
            <span>
              <Check size={14} />
              {t("onboarding.proofReview")}
            </span>
          </div>
        </div>
        <figure className="product-frame">
          <div
            className="product-preview"
            aria-label={t("onboarding.previewLabel")}
          >
            <div className="preview-orbit">
              <span>
                84<small>%</small>
              </span>
              <i>{t("onboarding.evidenceCoverage")}</i>
            </div>
            <div className="preview-window">
              <div className="preview-top">
                <BrandLogo variant="mark" decorative />
                <strong>Calyra</strong>
                <span>FR + EN</span>
              </div>
              <div className="preview-heading">
                <span>{t("onboarding.previewSection")}</span>
                <strong>{t("onboarding.previewTitle")}</strong>
              </div>
              <div className="preview-grid">
                <article>
                  <FileText />
                  <span>{t("onboarding.programmeBrief")}</span>
                  <strong>{t("onboarding.programmeContribution")}</strong>
                  <small>4 citations · FR</small>
                </article>
                <article>
                  <Sparkles />
                  <span>{t("onboarding.functionalWorkshop")}</span>
                  <strong>{t("onboarding.workshopContribution")}</strong>
                  <small>6 citations · FR</small>
                </article>
                <article>
                  <Quote />
                  <span>{t("onboarding.technicalMemo")}</span>
                  <strong>{t("onboarding.technicalContribution")}</strong>
                  <small>3 citations · EN/FR</small>
                </article>
              </div>
              <div className="preview-decision">
                <Check />
                <span>
                  <strong>{t("onboarding.decisionRecorded")}</strong>
                  <small>{t("onboarding.demoRecordedDecision")}</small>
                </span>
              </div>
            </div>
          </div>
          <figcaption>
            <strong>Calyra</strong>
            <span>{t("onboarding.traceableRecord")}</span>
          </figcaption>
        </figure>
      </section>

      <section className="projects-section" aria-labelledby="projects-title">
        <div className="projects-heading">
          <div>
            <span className="eyebrow">{t("projects.dashboardEyebrow")}</span>
            <h2 id="projects-title">{t("projects.dashboardTitle")}</h2>
            <p>{t("projects.dashboardCopy")}</p>
          </div>
          <div className="projects-heading-actions">
            <Link className="btn btn-ghost" href="/methods">{t("library.methods")}</Link>
            <Link className="btn btn-ghost" href="/references">{t("library.references")}</Link>
            <button className="btn btn-primary" onClick={requestProjectCreation}><FolderPlus size={16} />{t("projects.newProject")}</button>
          </div>
        </div>
        <div className="projects-toolbar">
          <label>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("projects.searchPlaceholder")}
            />
          </label>
          <div className="filter-group">
            <button
              className={`btn btn-sm ${filter === "active" ? "btn-primary" : ""}`}
              onClick={() => setFilter("active")}
            >
              {t("projects.active")}
            </button>
            <button
              className={`btn btn-sm ${filter === "archived" ? "btn-primary" : ""}`}
              onClick={() => setFilter("archived")}
            >
              {t("projects.archived")}
            </button>
          </div>
        </div>
        {visible.length ? (
          <div className="project-grid">
            {visible.map((state) => {
              const summary = projectSummary(state);
              const language =
                summary.resolvedProjectLanguage ?? summary.projectLanguage;
              return (
                <article className="project-card" key={summary.id}>
                  <div className="project-card-top">
                    <span className="project-monogram">
                      {summary.name
                        .split(/\s+/)
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        className="project-menu-trigger"
                        aria-label={`${t("common.project")} · ${summary.name}`}
                      >
                        <MoreHorizontal size={18} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="project-menu-content"
                          sideOffset={7}
                          align="end"
                          collisionPadding={12}
                        >
                          <DropdownMenu.Item
                            onSelect={() => {
                              setRenaming(summary.id);
                              setRenameValue(summary.name);
                            }}
                          >
                            <span>{t("common.rename")}</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => duplicate(state)}>
                            <Copy size={14} />
                            <span>{t("common.duplicate")}</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => archive(state)}>
                            <Archive size={14} />
                            <span>
                              {summary.archivedAt
                                ? t("projects.restoreProject")
                                : t("common.archive")}
                            </span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item
                            className="destructive"
                            onSelect={() => setDeleteTarget(state)}
                          >
                            <Trash2 size={14} />
                            <span>{t("common.delete")}</span>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                  {renaming === summary.id ? (
                    <div className="rename-row">
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRename(state);
                          if (event.key === "Escape") setRenaming(undefined);
                        }}
                      />
                      <button
                        className="btn btn-sm"
                        onClick={() => saveRename(state)}
                      >
                        {t("common.save")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3>{summary.name}</h3>
                      <p>
                        {summary.clientName ||
                          summary.sector ||
                          t("projects.emptyTitle")}
                      </p>
                    </>
                  )}
                  <div className="project-meta">
                    <span
                      className={`badge ${summary.mode === "demo" ? "badge-amber" : "badge-green"}`}
                    >
                      {summary.mode === "demo"
                        ? t("projects.demoProject")
                        : t("projects.liveProject")}
                    </span>
                    <span className="badge badge-green">
                      {language === "fr"
                        ? t("common.french")
                        : language === "en"
                          ? t("common.english")
                          : t("common.automatic")}
                    </span>
                    <span>
                      {summary.sourceCount} {t("common.sources")}
                    </span>
                    <span>
                      {t("projects.updated", {
                        date: date(summary.updatedAt, { dateStyle: "medium" }),
                      })}
                    </span>
                  </div>
                  <div className="project-progress">
                    <span>
                      {t("projects.progress", { count: summary.progress })}
                    </span>
                    <div className="nav-progress">
                      <i style={{ width: `${summary.progress}%` }} />
                    </div>
                  </div>
                  <button
                    className="project-open"
                    onClick={() =>
                      router.push(`/projects/${summary.id}/sources`)
                    }
                  >
                    {t("projects.openProject")}
                    <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-step projects-empty">
            <span className="empty-step-icon">
              <FolderPlus />
            </span>
            <h3>{t("projects.noProjects")}</h3>
            <p>{t("projects.noProjectsCopy")}</p>
          </div>
        )}
      </section>

      <Modal
        open={publicNoticeOpen}
        onOpenChange={setPublicNoticeOpen}
        eyebrow={t("onboarding.publicDemoEyebrow")}
        title={t("onboarding.publicDemoTitle")}
        description={t("onboarding.publicDemoCopy")}
        closeLabel={t("common.close")}
        footer={
          <button className="btn btn-primary" onClick={() => {
            setPublicNoticeOpen(false);
            loadDemo(locale);
          }}>
            {t("onboarding.openDemo")}
          </button>
        }
      >
        <p className="muted-copy">{t("onboarding.publicDemoLocal")}</p>
      </Modal>
      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        eyebrow={t("projects.newProject")}
        title={t("projects.emptyTitle")}
        closeLabel={t("common.close")}
        footer={
          <>
            <button className="btn" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              disabled={!form.name.trim()}
              onClick={create}
            >
              {t("common.create")}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <label className="field wide">
            <span className="field-label">{t("projects.name")}</span>
            <input
              autoFocus
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span className="field-label">{t("projects.clientOptional")}</span>
            <input
              value={form.clientName}
              onChange={(event) =>
                setForm({ ...form, clientName: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span className="field-label">{t("projects.sectorOptional")}</span>
            <input
              value={form.sector}
              onChange={(event) =>
                setForm({ ...form, sector: event.target.value })
              }
            />
          </label>
          <SelectField
            label={t("projects.projectLanguage")}
            value={form.projectLanguage}
            onValueChange={(value) =>
              setForm({ ...form, projectLanguage: value })
            }
            options={[
              { value: "auto", label: t("common.automatic") },
              { value: "fr", label: t("common.french") },
              { value: "en", label: t("common.english") },
            ]}
          />
          <SelectField
            label={t("projects.clientLanguage")}
            value={form.clientOutputLanguage}
            onValueChange={(value) =>
              setForm({ ...form, clientOutputLanguage: value })
            }
            options={[
              { value: "same_as_project", label: t("common.sameAsProject") },
              { value: "fr", label: t("common.french") },
              { value: "en", label: t("common.english") },
            ]}
          />
          <SelectField
            label={t("projects.estimationUnit")}
            value={form.estimationUnit}
            onValueChange={(value) =>
              setForm({ ...form, estimationUnit: value as "day" | "hour" })
            }
            options={[
              { value: "day", label: t("common.days") },
              { value: "hour", label: t("common.hours") },
            ]}
          />
          <SelectField
            label={t("projects.currency")}
            value={form.currency}
            onValueChange={(value) => setForm({ ...form, currency: value })}
            options={["EUR", "USD", "GBP", "MAD"].map((value) => ({
              value,
              label: value,
            }))}
          />
          <SelectField
            className="wide"
            label={t("projects.contingency")}
            value={String(form.contingencyRate)}
            onValueChange={(value) =>
              setForm({ ...form, contingencyRate: Number(value) })
            }
            options={[
              { value: "0.1", label: "10%" },
              { value: "0.15", label: "15%" },
              { value: "0.2", label: "20%" },
            ]}
          />
        </div>
      </Modal>
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        destructive
        title={t("projects.deleteProject")}
        description={
          deleteTarget
            ? t("projects.deleteConfirm", { name: deleteTarget.project.name })
            : undefined
        }
        closeLabel={t("common.close")}
        footer={
          <>
            <button className="btn" onClick={() => setDeleteTarget(undefined)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (deleteTarget)
                  projectRepository.remove(deleteTarget.project.id);
                setDeleteTarget(undefined);
                refresh();
              }}
            >
              {t("common.delete")}
            </button>
          </>
        }
      />
    </main>
  );
}
