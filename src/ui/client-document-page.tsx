"use client";

import { ArrowLeft, Download, FileCheck2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocumentModel } from "@/domain/schemas";
import { projectRepository } from "@/infrastructure/project-repository";

type LoadState = "loading" | "ready" | "failed" | "missing";

const labels = {
  fr: {
    back: "Retour à la proposition",
    title: "Aperçu du document client",
    description: "Le fichier affiché est le PDF final généré depuis l’estimation validée.",
    download: "Télécharger le PDF",
    loading: "Génération du document PDF",
    loadingCopy: "Mise en page et pagination de la proposition validée.",
    missing: "Cette proposition validée est introuvable ou doit être régénérée.",
    failed: "Le PDF n’a pas pu être généré. La proposition validée est conservée.",
    retry: "Réessayer",
  },
  en: {
    back: "Back to proposal",
    title: "Client document preview",
    description: "The displayed file is the final PDF generated from the approved estimate.",
    download: "Download PDF",
    loading: "Generating PDF document",
    loadingCopy: "Laying out and paginating the approved proposal.",
    missing: "This approved proposal is missing or must be regenerated.",
    failed: "The PDF could not be generated. The approved proposal is preserved.",
    retry: "Retry",
  },
} as const;

export function ClientDocumentPage({ projectId, proposalId }: { projectId: string; proposalId: string }) {
  const router = useRouter();
  const [document, setDocument] = useState<ClientDocumentModel | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const locale = document?.locale ?? "en";
  const t = labels[locale];

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const project = projectRepository.get(projectId);
      const proposal = project?.proposalSnapshot;
      if (!proposal || proposal.id !== proposalId || !proposal.document || proposal.estimateSnapshotId !== proposal.document.estimateSnapshotId) {
        setState("missing");
        return;
      }
      setDocument(proposal.document);
    });
    return () => { cancelled = true; };
  }, [projectId, proposalId]);

  useEffect(() => {
    if (!document) return;
    const controller = new AbortController();
    let nextUrl: string | null = null;
    void fetch("/api/proposals/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "PDF generation failed");
      }
      return response.blob();
    }).then((blob) => {
      nextUrl = URL.createObjectURL(blob);
      setPdfUrl(nextUrl);
      setState("ready");
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "PDF generation failed");
      setState("failed");
    });
    return () => {
      controller.abort();
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [document]);

  const filename = useMemo(() => document ? `${document.settings.reference}.pdf`.replace(/[^a-z0-9_.-]/gi, "-") : "scopeforge-proposal.pdf", [document]);
  const retry = () => {
    setState("loading");
    setError(null);
    setDocument((current) => current ? { ...current } : current);
  };

  return (
    <main className="client-document-workspace">
      <header className="client-document-toolbar">
        <button className="btn btn-ghost" onClick={() => router.push(`/projects/${projectId}/preview`)}>
          <ArrowLeft size={16} />
          {t.back}
        </button>
        <div className="client-document-toolbar-copy">
          <span><FileCheck2 size={16} />{t.title}</span>
          <small>{t.description}</small>
        </div>
        {state === "ready" && pdfUrl && (
          <a className="btn btn-primary" href={pdfUrl} download={filename}>
            <Download size={16} />
            {t.download}
          </a>
        )}
      </header>

      <section className="client-document-stage" aria-live="polite" aria-busy={state === "loading"}>
        {state === "loading" && (
          <div className="client-document-state">
            <span className="document-progress" aria-hidden="true" />
            <strong>{t.loading}</strong>
            <p>{t.loadingCopy}</p>
          </div>
        )}
        {state === "missing" && <div className="client-document-state"><strong>{t.missing}</strong><button className="btn" onClick={() => router.push(`/projects/${projectId}/preview`)}>{t.back}</button></div>}
        {state === "failed" && <div className="client-document-state"><strong>{t.failed}</strong>{error && <p>{error}</p>}<button className="btn" onClick={retry}><RefreshCw size={16} />{t.retry}</button></div>}
        {state === "ready" && pdfUrl && (
          <iframe
            className="client-document-frame"
            src={pdfUrl}
            title={t.title}
          />
        )}
      </section>
    </main>
  );
}
