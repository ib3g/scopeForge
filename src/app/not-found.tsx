"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return <main className="route-error-page"><h1>{t("errors.notFoundTitle")}</h1><p>{t("errors.notFoundCopy")}</p><Link className="btn btn-primary" href="/">{t("errors.dashboardAction")}</Link></main>;
}
