import { notFound } from "next/navigation";
import { ProjectScreen } from "@/ui/project-screen";
import { WorkspaceProvider } from "@/ui/workspace-provider";
import { WorkspaceShell } from "@/ui/workspace-shell";

const steps = new Set(["sources", "analysis", "questions", "estimate", "preview"]);

export default async function ProjectStepPage({ params }: { params: Promise<{ projectId: string; step: string }> }) {
  const { projectId, step } = await params;
  if (!steps.has(step) || projectId === "demo") notFound();
  return <WorkspaceProvider projectId={projectId}><WorkspaceShell><ProjectScreen step={step}/></WorkspaceShell></WorkspaceProvider>;
}
