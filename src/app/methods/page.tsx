"use client";

import Link from "next/link";
import { useState } from "react";
import type { EstimationMethod } from "@/domain/schemas";
import { LanguageSelector, useI18n } from "@/i18n";
import { defaultEstimationMethods, estimationMethodRepository } from "@/infrastructure/estimation-library";

export default function MethodsPage() {
  const { t } = useI18n();
  const [methods, setMethods] = useState<EstimationMethod[]>(defaultEstimationMethods);
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const refresh = () => setMethods(estimationMethodRepository.list());
  const create = () => {
    if (!form.name.trim()) return;
    const base = defaultEstimationMethods[0];
    estimationMethodRepository.save({ ...base, id: `method-${Date.now().toString(36)}`, name: form.name.trim(), description: form.description.trim() || base.description, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setForm({ name: "", description: "" });
    refresh();
  };
  const toggleArchive = (method: EstimationMethod) => {
    if (method.status === "active") estimationMethodRepository.archive(method.id);
    else estimationMethodRepository.restore(method.id);
    refresh();
  };
  return (
    <main className="landing library-page" id="main-content">
      <header className="landing-nav"><Link href="/" className="brand"><span className="brand-name">ScopeForge</span></Link><LanguageSelector /></header>
      <div className="library-shell">
        <div className="library-heading"><div><Link href="/" className="eyebrow">{t("library.backToProjects")}</Link><h1>{t("methods.title")}</h1><p>{t("methods.description")}</p></div><button className="btn btn-secondary" onClick={() => setShowArchived(!showArchived)}>{showArchived ? t("methods.active") : t("methods.archived")}</button></div>
        <div className="library-create card"><div><h2>{t("library.createMethod")}</h2><p className="muted">{t("methods.referenceHelp")}</p></div><div className="library-form"><input aria-label={t("library.methodName")} placeholder={t("library.methodName")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input aria-label={t("library.methodDescription")} placeholder={t("library.methodDescription")} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><button className="btn btn-primary" onClick={create}>{t("common.create")}</button></div></div>
        <div className="library-grid">{methods.filter((method) => method.status === (showArchived ? "archived" : "active")).map((method) => <article className="card library-card" key={method.id}><div className="library-card-top"><span className="badge badge-muted">{method.status === "active" ? t("methods.active") : t("methods.archived")}</span><span className="badge badge-blue">{method.primaryUnit}</span></div><h2>{method.name}</h2><p>{method.description}</p><div className="library-stat-row"><span>{t("methods.reserve")}</span><strong>{Math.round(method.reserveRate * 100)}%</strong><span>{t("methods.unit")}</span><strong>{method.primaryUnit}</strong></div><div className="library-tags">{method.workstreams.map((workstream) => <span key={workstream}>{workstream}</span>)}</div><div className="library-actions"><button className="btn btn-ghost btn-sm" onClick={() => { estimationMethodRepository.duplicate(method.id); refresh(); }}>{t("library.duplicate")}</button><button className="btn btn-ghost btn-sm" onClick={() => toggleArchive(method)}>{method.status === "active" ? t("library.archive") : t("library.restore")}</button></div></article>)}</div>
      </div>
    </main>
  );
}
