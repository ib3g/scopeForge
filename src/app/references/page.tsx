"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { ReferenceCase } from "@/domain/schemas";
import { LanguageSelector, useI18n } from "@/i18n";
import { defaultReferenceCases, referenceCaseRepository } from "@/infrastructure/estimation-library";

export default function ReferencesPage() {
  const { t } = useI18n();
  const [references, setReferences] = useState<ReferenceCase[]>(defaultReferenceCases);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", summary: "", tags: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => setReferences(referenceCaseRepository.list());
  const create = () => {
    if (!form.title.trim()) return;
    const base = defaultReferenceCases[0];
    referenceCaseRepository.save({ ...base, id: `reference-${Date.now().toString(36)}`, title: form.title.trim(), summary: form.summary.trim() || base.summary, tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean), provenance: "user_decision", date: new Date().toISOString().slice(0, 10) });
    setForm({ title: "", summary: "", tags: "" });
    refresh();
  };
  const exportReference = (reference: ReferenceCase) => {
    const blob = new Blob([JSON.stringify(reference, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${reference.id}.json`; link.click(); URL.revokeObjectURL(url);
  };
  const importReference = (file: File) => { void file.text().then((value) => { referenceCaseRepository.import(JSON.parse(value)); refresh(); }).catch(() => undefined); };
  const visible = references.filter((reference) => reference.status === "active" && `${reference.title} ${reference.sector} ${reference.tags.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return (
    <main className="landing library-page" id="main-content">
      <header className="landing-nav"><Link href="/" className="brand"><span className="brand-name">ScopeForge</span></Link><LanguageSelector /></header>
      <div className="library-shell"><div className="library-heading"><div><Link href="/" className="eyebrow">{t("library.backToProjects")}</Link><h1>{t("references.title")}</h1><p>{t("references.description")}</p></div><div className="library-heading-actions"><button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>{t("library.import")}</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) importReference(file); }} /></div></div>
        <div className="library-create card"><div><h2>{t("library.createReference")}</h2><p className="muted">{t("references.contextOnly")}</p></div><div className="library-form"><input aria-label={t("library.referenceTitle")} placeholder={t("library.referenceTitle")} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><input aria-label={t("library.referenceSummary")} placeholder={t("library.referenceSummary")} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /><input aria-label={t("library.tags")} placeholder={t("library.tags")} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} /><button className="btn btn-primary" onClick={create}>{t("common.create")}</button></div></div>
        <label className="library-search"><span>{t("common.search")}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("common.search")} /></label>
        <div className="library-grid">{visible.map((reference) => <article className="card library-card" key={reference.id}><div className="library-card-top"><span className="badge badge-muted">{reference.language.toUpperCase()}</span><span className="badge badge-blue">{reference.projectType}</span></div><h2>{reference.title}</h2><p>{reference.summary}</p><div className="library-tags">{reference.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="library-card-meta"><span>{reference.sector}</span><span>{reference.date}</span></div><div className="library-actions"><button className="btn btn-ghost btn-sm" onClick={() => exportReference(reference)}>{t("library.export")}</button><button className="btn btn-ghost btn-sm" onClick={() => { referenceCaseRepository.archive(reference.id); refresh(); }}>{t("library.archive")}</button></div></article>)}</div>
      </div>
    </main>
  );
}
