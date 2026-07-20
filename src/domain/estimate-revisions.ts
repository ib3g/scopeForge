import type { EstimateSnapshot } from "./schemas";

export type RevisionLineChangeKind = "added" | "removed" | "modified";

export type RevisionLineChange = {
  kind: RevisionLineChangeKind;
  moduleId: string;
  moduleName: string;
  before: { low: number; likely: number; high: number } | null;
  after: { low: number; likely: number; high: number } | null;
  delta: { low: number; likely: number; high: number };
};

export type EstimateRevisionComparison = {
  beforeRevision: number;
  afterRevision: number;
  beforeStatus: EstimateSnapshot["status"];
  afterStatus: EstimateSnapshot["status"];
  lineChanges: RevisionLineChange[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
  totals: {
    low: number;
    likely: number;
    high: number;
  };
  relativeLikely: number | null;
  methodChanged: boolean;
  reserveChanged: boolean;
  assumptionsAdded: string[];
  assumptionsRemoved: string[];
  decisionsAdded: string[];
  decisionsRemoved: string[];
  workstreamsAdded: string[];
  workstreamsRemoved: string[];
};

function delta(before: number, after: number) {
  return after - before;
}

function difference(after: string[], before: string[]) {
  const previous = new Set(before);
  return after.filter((item) => !previous.has(item));
}

export function compareEstimateRevisions(
  before: EstimateSnapshot,
  after: EstimateSnapshot,
): EstimateRevisionComparison {
  const beforeLines = new Map(before.estimateLines.map((line) => [line.moduleId, line]));
  const afterLines = new Map(after.estimateLines.map((line) => [line.moduleId, line]));
  const moduleNames = new Map(
    [...before.workstreams, ...after.workstreams].flatMap((workstream) =>
      workstream.modules.map((module) => [module.id, module.name] as const),
    ),
  );
  const ids = [...new Set([...beforeLines.keys(), ...afterLines.keys()])].sort();
  const lineChanges = ids.flatMap<RevisionLineChange>((moduleId) => {
    const previous = beforeLines.get(moduleId);
    const current = afterLines.get(moduleId);
    if (!previous && current) {
      return [{
        kind: "added",
        moduleId,
        moduleName: moduleNames.get(moduleId) ?? moduleId,
        before: null,
        after: { low: current.low, likely: current.likely, high: current.high },
        delta: { low: current.low, likely: current.likely, high: current.high },
      }];
    }
    if (previous && !current) {
      return [{
        kind: "removed",
        moduleId,
        moduleName: moduleNames.get(moduleId) ?? moduleId,
        before: { low: previous.low, likely: previous.likely, high: previous.high },
        after: null,
        delta: { low: -previous.low, likely: -previous.likely, high: -previous.high },
      }];
    }
    if (!previous || !current || (previous.low === current.low && previous.likely === current.likely && previous.high === current.high)) return [];
    return [{
      kind: "modified",
      moduleId,
      moduleName: moduleNames.get(moduleId) ?? moduleId,
      before: { low: previous.low, likely: previous.likely, high: previous.high },
      after: { low: current.low, likely: current.likely, high: current.high },
      delta: { low: delta(previous.low, current.low), likely: delta(previous.likely, current.likely), high: delta(previous.high, current.high) },
    }];
  });
  const beforeWorkstreams = before.workstreams.map((workstream) => workstream.name);
  const afterWorkstreams = after.workstreams.map((workstream) => workstream.name);
  const likelyBefore = before.totals.proposed.likely;
  return {
    beforeRevision: before.revision,
    afterRevision: after.revision,
    beforeStatus: before.status,
    afterStatus: after.status,
    lineChanges,
    addedLines: lineChanges.filter((change) => change.kind === "added").length,
    removedLines: lineChanges.filter((change) => change.kind === "removed").length,
    modifiedLines: lineChanges.filter((change) => change.kind === "modified").length,
    totals: {
      low: after.totals.proposed.low - before.totals.proposed.low,
      likely: after.totals.proposed.likely - before.totals.proposed.likely,
      high: after.totals.proposed.high - before.totals.proposed.high,
    },
    relativeLikely: likelyBefore === 0 ? null : (after.totals.proposed.likely - likelyBefore) / likelyBefore,
    methodChanged: before.methodId !== after.methodId || JSON.stringify(before.methodOverrides) !== JSON.stringify(after.methodOverrides),
    reserveChanged: before.contingencyRate !== after.contingencyRate,
    assumptionsAdded: difference(after.assumptions, before.assumptions),
    assumptionsRemoved: difference(before.assumptions, after.assumptions),
    decisionsAdded: difference(after.decisions.map((decision) => decision.statement), before.decisions.map((decision) => decision.statement)),
    decisionsRemoved: difference(before.decisions.map((decision) => decision.statement), after.decisions.map((decision) => decision.statement)),
    workstreamsAdded: difference(afterWorkstreams, beforeWorkstreams),
    workstreamsRemoved: difference(beforeWorkstreams, afterWorkstreams),
  };
}
