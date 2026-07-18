import { EstimateLineSchema, type EstimateLine, type EstimationPreferences, type ScopeModule } from "./schemas";

export type EstimateTotals = {
  base: { low: number; likely: number; high: number };
  reserve: { low: number; likely: number; high: number };
  proposed: { low: number; likely: number; high: number };
  options: { low: number; likely: number; high: number };
};

const empty = () => ({ low: 0, likely: 0, high: 0 });

export function calculateTotals(lines: EstimateLine[], modules: ScopeModule[], contingencyRate: number, preferences?: Pick<EstimationPreferences, "includeReserveInOptions" | "rounding">): EstimateTotals {
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
  const increment = preferences?.rounding ?? 0.1;
  const round = (value: number) => Number((Math.ceil(value / increment) * increment).toFixed(6));
  const reserve = { low: round(base.low * contingencyRate), likely: round(base.likely * contingencyRate), high: round(base.high * contingencyRate) };
  const optionTotals = preferences?.includeReserveInOptions ? { low: options.low + round(options.low * contingencyRate), likely: options.likely + round(options.likely * contingencyRate), high: options.high + round(options.high * contingencyRate) } : options;
  return {
    base,
    reserve,
    proposed: { low: base.low + reserve.low, likely: base.likely + reserve.likely, high: base.high + reserve.high },
    options: optionTotals,
  };
}

export function validateRange(low: number, likely: number, high: number) {
  return Number.isFinite(low) && low >= 0 && low <= likely && likely <= high;
}
