import { EstimateLineSchema, type EstimateLine, type ScopeModule } from "./schemas";

export type EstimateTotals = {
  base: { low: number; likely: number; high: number };
  reserve: { low: number; likely: number; high: number };
  proposed: { low: number; likely: number; high: number };
  options: { low: number; likely: number; high: number };
};

const empty = () => ({ low: 0, likely: 0, high: 0 });

export function calculateTotals(lines: EstimateLine[], modules: ScopeModule[], contingencyRate: number): EstimateTotals {
  const status = new Map(modules.map((module) => [module.id, module.status]));
  const base = empty();
  const options = empty();
  for (const line of lines) {
    const parsed = EstimateLineSchema.parse(line);
    const target = status.get(line.moduleId) === "included" ? base : status.get(line.moduleId) === "optional" ? options : null;
    if (!target) continue;
    target.low += parsed.low;
    target.likely += parsed.likely;
    target.high += parsed.high;
  }
  const reserve = {
    low: Math.ceil(base.low * contingencyRate * 10) / 10,
    likely: Math.ceil(base.likely * contingencyRate * 10) / 10,
    high: Math.ceil(base.high * contingencyRate * 10) / 10,
  };
  return {
    base,
    reserve,
    proposed: { low: base.low + reserve.low, likely: base.likely + reserve.likely, high: base.high + reserve.high },
    options,
  };
}

export function validateRange(low: number, likely: number, high: number) {
  return Number.isFinite(low) && low >= 0 && low <= likely && likely <= high;
}
