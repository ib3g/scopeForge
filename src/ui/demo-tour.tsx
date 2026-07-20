"use client";

import { ArrowRight, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";

export const demoTourStorageKey = (projectId: string) =>
  `scopeforge-demo-tour-v1:${projectId}`;

const tourSteps = [
  { slug: "sources", key: "sources" },
  { slug: "analysis", key: "analysis" },
  { slug: "analysis", key: "citation" },
  { slug: "questions", key: "question" },
  { slug: "estimate", key: "scope" },
  { slug: "estimate", key: "adjust" },
  { slug: "estimate", key: "review" },
  { slug: "estimate", key: "approve" },
  { slug: "preview", key: "proposal" },
  { slug: "preview", key: "export" },
] as const;

type StoredTour = { step: number; dismissed: boolean };

function readTour(projectId: string): StoredTour {
  try {
    const stored = localStorage.getItem(demoTourStorageKey(projectId));
    return stored
      ? (JSON.parse(stored) as StoredTour)
      : { step: 0, dismissed: false };
  } catch {
    return { step: 0, dismissed: false };
  }
}

export function DemoTour({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [tour, setTour] = useState<StoredTour | null>(null);

  useEffect(() => {
    queueMicrotask(() => setTour(readTour(projectId)));
    const restart = () => {
      setTour({ step: 0, dismissed: false });
    };
    window.addEventListener("scopeforge:restart-demo-tour", restart);
    return () =>
      window.removeEventListener("scopeforge:restart-demo-tour", restart);
  }, [projectId]);

  useEffect(() => {
    if (!tour) return;
    localStorage.setItem(demoTourStorageKey(projectId), JSON.stringify(tour));
  }, [projectId, tour]);

  const step = tourSteps[Math.min(tour?.step ?? 0, tourSteps.length - 1)];
  const target = useMemo(
    () => `/projects/${projectId}/${step.slug}`,
    [projectId, step.slug],
  );
  if (!tour || tour.dismissed) return null;

  const next = () => {
    if (tour.step >= tourSteps.length - 1) {
      setTour({ step: tour.step, dismissed: true });
      return;
    }
    const nextStep = tourSteps[tour.step + 1];
    setTour({ step: tour.step + 1, dismissed: false });
    if (!pathname.includes(`/${nextStep.slug}`))
      router.push(`/projects/${projectId}/${nextStep.slug}`);
  };

  return (
    <aside className="demo-tour no-print" aria-label={t("tour.title")}>
      <div className="demo-tour-heading">
        <span>{t("tour.progress", { current: tour.step + 1, total: tourSteps.length })}</span>
        <button
          className="icon-button"
          aria-label={t("tour.skip")}
          onClick={() => setTour({ ...tour, dismissed: true })}
        >
          <X size={15} />
        </button>
      </div>
      <strong>{t(`tour.${step.key}Title`)}</strong>
      <p>{t(`tour.${step.key}Copy`)}</p>
      <div className="demo-tour-actions">
        {!pathname.includes(`/${step.slug}`) && (
          <button className="btn btn-ghost btn-sm" onClick={() => router.push(target)}>
            {t("tour.openStep")}
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={next}>
          {tour.step === tourSteps.length - 1 ? t("tour.finish") : t("tour.next")}
          <ArrowRight size={14} />
        </button>
      </div>
    </aside>
  );
}
