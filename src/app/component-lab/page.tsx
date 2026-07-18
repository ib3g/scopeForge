"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Info,
  LoaderCircle,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { LanguageSelector, useI18n } from "@/i18n";
import { SelectField } from "@/ui/primitives/select-field";
import { Drawer, Modal } from "@/ui/primitives/drawer";

export default function ComponentLab() {
  const { t } = useI18n();
  const [status, setStatus] = useState("included");
  const [currency, setCurrency] = useState("EUR");
  const [tab, setTab] = useState("default");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <main className="component-lab" id="main-content">
      <header className="lab-header">
        <div>
          <span className="eyebrow">{t("lab.route")}</span>
          <h1>{t("lab.title")}</h1>
          <p>{t("lab.copy")}</p>
        </div>
        <LanguageSelector />
      </header>
      <nav className="lab-index" aria-label={t("lab.groups")}>
        <a href="#actions">{t("lab.actions")}</a>
        <a href="#fields">{t("lab.fields")}</a>
        <a href="#status">{t("lab.statuses")}</a>
        <a href="#surfaces">{t("lab.surfaces")}</a>
        <a href="#system">{t("lab.states")}</a>
      </nav>

      <LabSection
        id="actions"
        title={t("lab.buttons")}
        eyebrow={t("lab.group")}
      >
        <div className="lab-row">
          <button className="btn btn-primary">{t("common.confirm")}</button>
          <button className="btn">{t("lab.secondary")}</button>
          <button className="btn btn-ghost">{t("lab.tertiary")}</button>
          <button className="btn btn-danger">
            <Trash2 size={15} />
            {t("common.delete")}
          </button>
          <button className="btn btn-primary" disabled>
            {t("common.loading")}
          </button>
          <span className="tooltip">
            <button className="btn btn-icon" aria-label={t("lab.settings")}>
              <Settings2 />
            </button>
            <span role="tooltip">{t("lab.projectPreferences")}</span>
          </span>
          <button className="btn" onClick={() => setDrawerOpen(true)}>
            {t("lab.openDrawer")}
          </button>
          <button className="btn" onClick={() => setModalOpen(true)}>
            {t("lab.openModal")}
          </button>
        </div>
      </LabSection>
      <LabSection
        id="fields"
        title={t("lab.fieldsTitle")}
        eyebrow={t("lab.group")}
      >
        <div className="lab-form-grid">
          <label className="field">
            <span className="field-label">{t("lab.projectName")}</span>
            <input placeholder={t("lab.projectPlaceholder")} />
            <small>{t("lab.fieldHelp")}</small>
          </label>
          <label className="field field-error">
            <span className="field-label">{t("lab.ranges")}</span>
            <input type="number" defaultValue={7} aria-invalid="true" />
            <small>{t("lab.rangeError")}</small>
          </label>
          <SelectField
            label={t("common.status")}
            value={status}
            onValueChange={setStatus}
            tone={status as "included"}
            options={[
              { value: "included", label: t("common.included") },
              { value: "optional", label: t("common.optional") },
              { value: "excluded", label: t("common.excluded") },
              { value: "deferred", label: t("common.deferred") },
            ]}
          />
          <SelectField
            label={t("projects.currency")}
            value={currency}
            onValueChange={setCurrency}
            options={["EUR", "USD", "GBP", "MAD"].map((value) => ({
              value,
              label: value,
            }))}
          />
          <label className="field wide">
            <span className="field-label">{t("lab.longTextarea")}</span>
            <textarea defaultValue={t("lab.longAnswer")} />
          </label>
        </div>
        <div className="lab-row">
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span>{t("lab.reserveOptions")}</span>
          </label>
          <label className="switch-row">
            <input type="checkbox" role="switch" />
            <span>{t("lab.clientEffort")}</span>
          </label>
        </div>
      </LabSection>
      <LabSection
        id="status"
        title={t("lab.badgesTitle")}
        eyebrow={t("lab.group")}
      >
        <div className="lab-row">
          <span className="badge badge-green">
            <Check />
            {t("common.included")}
          </span>
          <span className="badge badge-amber">
            <Info />
            {t("common.framing")}
          </span>
          <span className="badge badge-red">
            <AlertTriangle />
            {t("common.blocking")}
          </span>
          <span className="badge badge-muted">{t("common.deferred")}</span>
        </div>
        <div className="analysis-tabs">
          {["default", "selected", "disabled"].map((value) => (
            <button
              disabled={value === "disabled"}
              className={`btn btn-sm ${tab === value ? "btn-primary" : ""}`}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              key={value}
            >
              {t(`lab.${value}`)}
            </button>
          ))}
        </div>
        <details className="lab-accordion">
          <summary>{t("lab.contributionSummary")}</summary>
          <p>{t("lab.contributionCopy")}</p>
        </details>
      </LabSection>
      <LabSection
        id="surfaces"
        title={t("lab.surfacesTitle")}
        eyebrow={t("lab.group")}
      >
        <div className="lab-surface-grid">
          <article className="card finding-card">
            <div className="finding-meta">
              <span className="badge badge-muted">{t("lab.requirement")}</span>
              <span className="mono muted">{t("lab.confidenceValue")}</span>
            </div>
            <p>{t("lab.findingCopy")}</p>
            <button className="citation-chip">
              <span>Source 3</span>
              <span>P002</span>
              <i>EN</i>
            </button>
          </article>
          <article className="proposal-diff">
            <div className="diff-heading">
              <span className="badge badge-blue">{t("lab.aiProposal")}</span>
              <small>{t("lab.unchanged")}</small>
            </div>
            <div className="diff-grid mono">
              <div className="diff-before">
                <span>{t("lab.current")}</span>
                <strong>7 / 11 / 16 d</strong>
              </div>
              <div className="diff-after">
                <span>{t("lab.proposed")}</span>
                <strong>7 / 13 / 19 d</strong>
              </div>
            </div>
            <div className="diff-actions">
              <button className="btn btn-success btn-sm">
                {t("common.accept")}
              </button>
              <button className="btn btn-sm">{t("common.modify")}</button>
              <button className="btn btn-danger btn-sm">
                {t("common.reject")}
              </button>
            </div>
          </article>
          <aside className="card copilot-panel lab-copilot">
            <span className="eyebrow">{t("lab.reviewPanel")}</span>
            <h2>{t("lab.secureAdmin")}</h2>
            <p>{t("lab.reviewCopy")}</p>
            <button className="btn btn-primary">
              {t("lab.reviewEstimate")}
              <ChevronRight />
            </button>
          </aside>
        </div>
      </LabSection>
      <LabSection
        id="system"
        title={t("lab.statesTitle")}
        eyebrow={t("lab.group")}
      >
        <div className="lab-state-grid">
          <div className="system-state">
            <LoaderCircle className="spin" />
            <strong>{t("lab.loading")}</strong>
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
          <div className="system-state">
            <Search />
            <strong>{t("lab.empty")}</strong>
            <p>{t("lab.emptyCopy")}</p>
          </div>
          <div className="system-state error-banner">
            <AlertTriangle />
            <strong>{t("lab.failed")}</strong>
            <p>{t("lab.preserved")}</p>
          </div>
          <div className="system-state success-state">
            <Check />
            <strong>{t("lab.decisionRecorded")}</strong>
            <p>{t("lab.decisionCopy")}</p>
          </div>
        </div>
      </LabSection>
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eyebrow={t("lab.provenance")}
        title={t("lab.sourceCitation")}
        description={t("lab.focusHelp")}
        closeLabel={t("common.close")}
      >
        <div className="lab-drawer-demo">
          <span className="badge badge-blue">SRC-03 · P002 · EN</span>
          <blockquote>“Role-based access and an audit trail.”</blockquote>
          <div className="translated-excerpt">
            <span>{t("lab.translation")}</span>
            <p>Accès par rôles et historique des changements.</p>
          </div>
        </div>
      </Drawer>
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        eyebrow={t("lab.confirmation")}
        title={t("lab.archiveTitle")}
        description={t("lab.archiveCopy")}
        closeLabel={t("common.close")}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setModalOpen(false)}
            >
              {t("common.archive")}
            </button>
          </>
        }
      />
    </main>
  );
}

function LabSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lab-section" id={id}>
      <header>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </header>
      <div>{children}</div>
    </section>
  );
}
