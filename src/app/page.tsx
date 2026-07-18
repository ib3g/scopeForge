"use client";

import { ArrowRight, Check, FileText, Quote, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/ui/workspace-provider";

export default function Home() {
  const router = useRouter(); const { reset } = useWorkspace();
  const open = () => { reset(); router.push("/projects/demo/sources"); };
  return <main className="landing">
    <header className="landing-nav"><div className="landing-brand"><span className="brand-mark">S</span><span>ScopeForge</span></div><span>OpenAI Build Week 2026</span></header>
    <section className="landing-hero">
      <div className="landing-copy">
        <div className="eyebrow">Work & Productivity</div>
        <h1>Turn project evidence into a decision-ready estimate.</h1>
        <p>Consolidate cited evidence into decisions, an editable estimate, and a client-ready proposal.</p>
        <button className="btn btn-primary landing-cta" onClick={open}>Load demo project <ArrowRight size={18} strokeWidth={1.8}/></button>
      </div>
      <figure className="product-frame">
        <div className="product-preview" aria-label="ScopeForge product preview">
          <div className="preview-rail"><span className="brand-mark">S</span><i/><i/><i className="active"/><i/><i/></div>
          <div className="preview-workspace"><div className="preview-top"><span className="badge badge-green">3 sources</span><strong>Morrow Ridge retreat platform</strong><span>82% covered</span></div><div className="preview-heading"><span>Consolidated evidence</span><strong>What each source adds to the scope</strong></div><div className="preview-grid"><article><FileText/><span>Experience brief</span><strong>Introduces guest discovery</strong><small>4 cited findings</small></article><article><Sparkles/><span>Operations workshop</span><strong>Complements with applications and deposits</strong><small>6 cited findings</small></article><article><Quote/><span>Readiness notes</span><strong>Refines privacy and delivery</strong><small>3 cited findings</small></article></div><div className="preview-decision"><Check/><span><strong>Decision recorded</strong><small>Wait-list promotion stays manual for launch</small></span></div></div>
        </div>
        <figcaption><strong>Morrow Ridge demo</strong><span>Three fictional sources, traceable decisions, human-controlled AI changes</span></figcaption>
      </figure>
    </section>
  </main>;
}
