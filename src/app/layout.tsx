import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";

export const metadata: Metadata = {
  title: "ScopeForge — Project scoping and estimation",
  description:
    "Turn meeting notes, briefs and project documents into a structured scope and an initial estimate your team can review.",
  openGraph: {
    title: "ScopeForge",
    description:
      "Estimate projects faster from the documents you already have.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
