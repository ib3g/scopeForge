"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { en } from "./catalogs/en";
import { fr } from "./catalogs/fr";
import { SelectField } from "@/ui/primitives/select-field";

export type InterfaceLocale = "en" | "fr";
export type SupportedLocale = InterfaceLocale | (string & {});
export const INTERFACE_LOCALES: InterfaceLocale[] = ["en", "fr"];
const STORAGE_KEY = "scopeforge-interface-locale-v1";
const catalogs = { en, fr } as const;

function getMessage(locale: InterfaceLocale, path: string): string {
  const value = path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, catalogs[locale]);
  if (typeof value === "string") return value;
  const fallback = path.split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, catalogs.en);
  return typeof fallback === "string" ? fallback : path;
}

function interpolate(message: string, values?: Record<string, string | number>) {
  return message.replace(/\{(\w+)\}/g, (_, key: string) => String(values?.[key] ?? `{${key}}`));
}

export function translate(locale: string, key: string, values?: Record<string, string | number>) {
  return interpolate(getMessage(locale === "fr" ? "fr" : "en", key), values);
}

export function formatDateFor(locale: string, value: Date | string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr" : "en", options ?? { dateStyle: "medium" }).format(typeof value === "string" ? new Date(value) : value);
}

type I18nContextValue = {
  locale: InterfaceLocale;
  setLocale: (locale: InterfaceLocale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  percent: (value: number, options?: Intl.NumberFormatOptions) => string;
  currency: (value: number, currency: string) => string;
  plural: (count: number, one: string, other: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<InterfaceLocale>("en");
  const setLocale = (next: InterfaceLocale) => { localStorage.setItem(STORAGE_KEY, next); setLocaleState(next); };
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") queueMicrotask(() => setLocaleState(stored));
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);
  const value = useMemo<I18nContextValue>(() => ({
    locale, setLocale,
    t: (key, values) => interpolate(getMessage(locale, key), values),
    number: (number, options) => new Intl.NumberFormat(locale, options).format(number),
    date: (value, options) => new Intl.DateTimeFormat(locale, options ?? { dateStyle: "medium" }).format(typeof value === "string" ? new Date(value) : value),
    percent: (number, options) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1, ...options }).format(number),
    currency: (number, currency) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(number),
    plural: (count, one, other) => new Intl.PluralRules(locale).select(count) === "one" ? one : other,
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return <SelectField className={`language-selector ${compact ? "compact" : ""}`} size="compact" ariaLabel={t("preferences.interfaceLanguage")} value={locale} onValueChange={(value) => setLocale(value as InterfaceLocale)} options={[{ value: "en", label: "EN" }, { value: "fr", label: "FR" }]}/>;
}
