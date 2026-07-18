import { notFound } from "next/navigation";
import { ProjectScreen } from "@/ui/project-screen";
import { WorkspaceShell } from "@/ui/workspace-shell";

const steps = new Set(["sources", "analysis", "questions", "estimate", "preview"]);
export default async function DemoStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params; if (!steps.has(step)) notFound();
  return <WorkspaceShell><ProjectScreen step={step}/></WorkspaceShell>;
}
