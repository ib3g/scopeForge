"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("ScopeForge controlled error", { name: error.name, digest: error.digest ?? null });
  }, [error]);
  return (
    <main className="route-error-page">
      <AlertTriangle size={24} />
      <h1>{t("errors.pageFailedTitle")}</h1>
      <p>{t("errors.pageFailedCopy")}</p>
      <div><button className="btn btn-primary" onClick={reset}><RefreshCw size={16} />{t("errors.retry")}</button><Link className="btn" href="/">{t("errors.dashboardAction")}</Link></div>
    </main>
  );
}
