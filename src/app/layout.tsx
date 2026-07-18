import type { Metadata } from "next";
import "./globals.css";
import { WorkspaceProvider } from "@/ui/workspace-provider";

export const metadata: Metadata = { title: "ScopeForge", description: "Turn messy project inputs into a decision-ready estimate." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><WorkspaceProvider>{children}</WorkspaceProvider></body></html>;
}
