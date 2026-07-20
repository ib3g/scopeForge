"use client";

import { ArrowLeft, Download, FileCheck2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientDocumentModel } from "@/domain/schemas";
import { projectRepository } from "@/infrastructure/project-repository";

type LoadState = "loading" | "ready" | "failed" | "missing";
const pdfRequestCache = new Map<string, Promise<Uint8Array>>();

function pdfCacheKey(document: ClientDocumentModel) {
  return `${document.id}:${document.generatedAt}`;
}

function requestPdf(document: ClientDocumentModel) {
  const key = pdfCacheKey(document);
  const existing = pdfRequestCache.get(key);
  if (existing) return existing;
  const request = fetch("/api/proposals/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document }),
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error ?? "PDF generation failed");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const signature = new TextDecoder("ascii").decode(bytes.subarray(0, 5));
    if (bytes.byteLength === 0) throw new Error("The generated PDF is empty.");
    if (signature !== "%PDF-") throw new Error("The server returned an invalid PDF file.");
    return bytes;
  }).catch((error) => {
    pdfRequestCache.delete(key);
    throw error;
  });
  pdfRequestCache.set(key, request);
  return request;
}

function PdfPagePreview({ bytes, title, onError }: { bytes: Uint8Array; title: string; onError: (error: Error) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    const renderTasks: Array<{ cancel: () => void; promise: Promise<unknown> }> = [];

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const task = pdfjs.getDocument({ data: bytes.slice() });
        loadingTask = task;
        const pdf = await task.promise;
        const container = containerRef.current;
        if (cancelled || !container) return;
        container.replaceChildren();

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.45 });
          const canvas = window.document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("The PDF preview canvas is unavailable.");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.className = "client-document-page";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${title} — ${pageNumber} / ${pdf.numPages}`);
          container.append(canvas);
          const renderTask = page.render({ canvas, canvasContext: context, viewport });
          renderTasks.push(renderTask);
          await renderTask.promise;
        }
      } catch (cause) {
        if (!cancelled) onError(cause instanceof Error ? cause : new Error("PDF preview failed"));
      }
    })();

    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
      void loadingTask?.destroy();
    };
  }, [bytes, onError, title]);

  return <div ref={containerRef} className="client-document-pages" aria-label={title} />;
}

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
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
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
    let cancelled = false;
    let nextUrl: string | null = null;
    void requestPdf(document).then((bytes) => {
      if (cancelled) return;
      const blob = new Blob([bytes.slice().buffer], { type: "application/pdf" });
      nextUrl = URL.createObjectURL(blob);
      setPdfBytes(bytes);
      setPdfUrl(nextUrl);
      setState("ready");
    }).catch((cause: unknown) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : "PDF generation failed");
      setState("failed");
    });
    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [document]);

  const filename = useMemo(() => document ? `${document.settings.reference}.pdf`.replace(/[^a-z0-9_.-]/gi, "-") : "scopeforge-proposal.pdf", [document]);
  const retry = () => {
    setState("loading");
    setError(null);
    if (document) pdfRequestCache.delete(pdfCacheKey(document));
    setPdfBytes(null);
    setDocument((current) => current ? { ...current } : current);
  };
  const previewError = useCallback((cause: Error) => {
    setError(cause.message);
    setState("failed");
  }, []);

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
        {state === "ready" && pdfBytes && (
          <PdfPagePreview bytes={pdfBytes} title={t.title} onError={previewError} />
        )}
      </section>
    </main>
  );
}
