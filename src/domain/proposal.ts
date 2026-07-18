import type { EstimateLine, ScopeModule, WorkspaceState } from "./schemas";

export type ClientProposal = {
  project: { name: string; description: string };
  modules: Array<{ name: string; description: string; features: string[]; status: ScopeModule["status"]; effort: Pick<EstimateLine, "low" | "likely" | "high"> }>;
};

export function toClientProposal(state: WorkspaceState): ClientProposal {
  const lines = new Map(state.estimateLines.map((line) => [line.moduleId, line]));
  return {
    project: { name: state.project.name, description: state.project.description },
    modules: state.workstreams.flatMap((workstream) => workstream.modules).filter((module) => module.status !== "deferred").map((module) => {
      const line = lines.get(module.id);
      return { name: module.name, description: module.description, features: module.features, status: module.status, effort: { low: line?.low ?? 0, likely: line?.likely ?? 0, high: line?.high ?? 0 } };
    }),
  };
}
