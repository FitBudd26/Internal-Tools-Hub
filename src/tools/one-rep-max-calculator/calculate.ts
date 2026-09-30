import type { FormulaKey, FormulaResults, OneRmInput, OneRmResult, TrainingZone, Unit } from './types';

/**
 * The one rep max maths, ported from the standalone calculator: six
 * published formulas, Epley as the headline, and the training load chart.
 * Nothing here is written by a model.
 */

export const FORMULA_NAMES: Record<FormulaKey, string> = {
  epley: 'Epley',
  brzycki: 'Brzycki',
  lombardi: 'Lombardi',
  mayhew: 'Mayhew',
  oconner: "O'Conner",
  wathan: 'Wathan',
};
export const FORMULA_ORDER: FormulaKey[] = ['epley', 'brzycki', 'lombardi', 'mayhew', 'oconner', 'wathan'];

export function calculate1RM(weight: number, reps: number): FormulaResults {
  if (reps === 1) return { epley: weight, brzycki: weight, lombardi: weight, mayhew: weight, oconner: weight, wathan: weight };
  return {
    epley: Math.round(weight * (1 + reps / 30)),
    brzycki: Math.round((weight * 36) / (37 - reps)),
    lombardi: Math.round(weight * Math.pow(reps, 0.1)),
    mayhew: Math.round((100 * weight) / (52.2 + 41.9 * Math.exp(-0.055 * reps))),
    oconner: Math.round(weight * (1 + reps / 40)),
    wathan: Math.round((100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps))),
  };
}

const ZONES: { pct: number; reps: string; zone: string; key?: boolean }[] = [
  { pct: 100, reps: '1', zone: 'Max Effort' },
  { pct: 95, reps: '1-2', zone: 'Strength: Peak' },
  { pct: 90, reps: '3-4', zone: 'Strength: Heavy' },
  { pct: 85, reps: '4-6', zone: 'Strength / Hypertrophy', key: true },
  { pct: 80, reps: '6-8', zone: 'Hypertrophy: Heavy' },
  { pct: 75, reps: '8-10', zone: 'Hypertrophy: Moderate', key: true },
  { pct: 70, reps: '10-12', zone: 'Hypertrophy: Light' },
  { pct: 65, reps: '12-15', zone: 'Endurance' },
  { pct: 60, reps: '15-20', zone: 'Endurance / Warm-up' },
  { pct: 50, reps: '20+', zone: 'Warm-up / Recovery' },
];

export function trainingChart(oneRm: number): TrainingZone[] {
  return ZONES.map(({ pct, reps, zone, key }) => ({ pct, reps, zone, key: Boolean(key), weight: Math.round((oneRm * pct) / 100) }));
}

/** Most reps a lifter can be asked for at a percentage of the max, from the chart's own zones. */
export function maxRepsAt(percent: number): number {
  if (percent >= 95) return 2;
  if (percent >= 90) return 4;
  if (percent >= 85) return 6;
  if (percent >= 80) return 8;
  if (percent >= 75) return 10;
  if (percent >= 70) return 12;
  if (percent >= 65) return 15;
  return 20;
}

/** A percentage as a weight the bar can actually be loaded to: nearest 5 lbs or 2.5 kg. */
export function loadFor(oneRm: number, percent: number, unit: Unit): number {
  const step = unit === 'kg' ? 2.5 : 5;
  return Math.max(step, Math.round((oneRm * percent) / 100 / step) * step);
}

export const formatWeight = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function calculate(input: OneRmInput): OneRmResult {
  const formulas = calculate1RM(input.weight, input.reps);
  const values = FORMULA_ORDER.map((k) => formulas[k]);
  const oneRm = formulas.epley;
  return {
    input,
    oneRm,
    formulas,
    average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    high: Math.max(...values),
    low: Math.min(...values),
    alreadyMax: input.reps === 1,
    chart: trainingChart(oneRm),
  };
}
