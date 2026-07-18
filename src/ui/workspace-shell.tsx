"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, Download, Eye, Menu, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "./workspace-provider";

const steps = [
  ["sources", "Sources"], ["analysis", "Analysis"], ["questions", "Clarifications"], ["estimate", "Scope & estimate"], ["preview", "Proposal"],
] as const;

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, reset } = useWorkspace();
  const [navOpen, setNavOpen] = useState(false);
  const active = Math.max(0, steps.findIndex(([slug]) => pathname.includes(`/${slug}`)));
  const openQuestions = state.questions.filter((question) => question.status === "open").length;
  const completed = [state.sources.length > 0, !!state.analysis, state.decisions.length > 0, state.estimateLines.length > 0, state.project.status === "ready_to_export"];
  const progress = Math.round((completed.filter(Boolean).length / steps.length) * 100);
  const nextAction = !state.analysis ? "Analyze the source set" : !state.questions.length ? "Generate clarification questions" : !state.decisions.length ? "Record a blocking decision" : !state.workstreams.length ? "Build the consolidated scope" : !state.estimateLines.length ? "Generate effort ranges" : "Review and export the proposal";
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scopeforge-morrow-ridge.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="workspace">
    <button className="mobile-nav-toggle btn no-print" aria-label={navOpen ? "Close workflow navigation" : "Open workflow navigation"} aria-expanded={navOpen} onClick={() => setNavOpen(!navOpen)}>{navOpen ? <X size={18}/> : <Menu size={18}/>}<span>Workflow</span></button>
    {navOpen && <button className="nav-backdrop no-print" aria-label="Close workflow navigation" onClick={() => setNavOpen(false)}/>}
    <aside className={`sidebar no-print ${navOpen ? "open" : ""}`}>
      <Link href="/" className="brand"><span className="brand-mark">S</span><span className="brand-name">ScopeForge</span></Link>
      <div className="nav-project"><div className="nav-project-title"><strong>Morrow Ridge</strong><span className="badge badge-dark">Fictional</span></div><span>{state.project.sector}</span><div className="nav-progress" aria-label={`${progress}% workflow complete`}><i style={{ width: `${progress}%` }}/></div></div>
      <ol className="step-list">{steps.map(([slug, label], index) => <li key={slug}><Link aria-current={active === index ? "step" : undefined} onClick={() => setNavOpen(false)} className={`step-link ${active === index ? "active" : ""}`} href={`/projects/demo/${slug}`}><span className="step-dot">{completed[index] && index !== active ? <Check size={14}/> : index + 1}</span><span className="step-label">{label}<small className="step-state">{completed[index] ? "Complete" : index === active ? "In progress" : "Not started"}{slug === "questions" && openQuestions ? ` · ${openQuestions} open` : ""}</small></span></Link></li>)}</ol>
      <div className="sidebar-next"><span>Recommended next</span><strong>{nextAction}</strong></div>
      <div className="sidebar-foot"><p>Every AI recommendation stays under your control.</p><button className="btn btn-ghost btn-sm" onClick={() => { reset(); router.push("/projects/demo/sources"); setNavOpen(false); }}><RotateCcw size={14}/> Reset demo</button></div>
    </aside>
    <div className="main-shell">
      <header className="topbar no-print"><div className="status-line"><span className="badge badge-green">Demo data</span><strong>{state.project.name}</strong>{openQuestions > 0 && <span className="open-count">{openQuestions} open</span>}</div><div className="top-actions"><button className="btn" onClick={() => router.push("/projects/demo/preview")}><Eye size={16}/><span className="label">Preview</span></button><button className="btn btn-primary" onClick={exportData}><Download size={16}/><span className="label">Export JSON</span></button></div></header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
