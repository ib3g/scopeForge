import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";

export const metadata: Metadata = {
  title: "ScopeForge — Evidence to estimate",
  description: "Turn complementary project evidence into a cited scope, a deterministic estimate, and a client-ready proposal.",
  openGraph: { title: "ScopeForge", description: "Evidence to estimate, with every decision traceable.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><I18nProvider>{children}</I18nProvider></body></html>;
}
