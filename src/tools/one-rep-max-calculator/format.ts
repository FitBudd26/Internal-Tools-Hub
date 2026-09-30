import { FORMULA_NAMES, FORMULA_ORDER, formatWeight, loadFor } from './calculate';
import type { Guidance, OneRmResult, PlanWeek } from './types';

/** "4 x 6 at 75% (195 lbs)". */
export function planLine(week: PlanWeek, result: OneRmResult): string {
  return `${week.sets} x ${week.reps} at ${formatWeight(week.percent)}% (${formatWeight(loadFor(result.oneRm, week.percent, result.input.unit))} ${result.input.unit})`;
}

/** The whole result as plain text, for the Copy button. */
export function resultText(result: OneRmResult, guidance: Guidance): string {
  const { input, oneRm, formulas, average, chart } = result;
  const u = input.unit;
  const lines = [
    `${input.exercise}: ${formatWeight(input.weight)} ${u} x ${input.reps} ${input.reps === 1 ? 'rep' : 'reps'}`,
    `${result.alreadyMax ? 'One rep max' : 'Estimated one rep max (Epley)'}: ${formatWeight(oneRm)} ${u}`,
    '',
  ];
  if (!result.alreadyMax) {
    lines.push('FORMULAS');
    for (const k of FORMULA_ORDER) lines.push(`${FORMULA_NAMES[k]}: ${formatWeight(formulas[k])} ${u}`);
    lines.push(`Average: ${formatWeight(average)} ${u}`, '');
  }
  lines.push('TRAINING LOAD CHART');
  for (const z of chart) lines.push(`${z.pct}%: ${formatWeight(z.weight)} ${u}, ${z.reps} reps, ${z.zone}`);
  lines.push('', 'WARM-UP');
  for (const s of guidance.warmup) lines.push(`${formatWeight(s.percent)}% x ${s.reps}: ${formatWeight(loadFor(oneRm, s.percent, u))} ${u}`);
  lines.push('', 'FOUR-WEEK PLAN');
  for (const w of guidance.plan) lines.push(`Week ${w.week} (${w.focus}): ${planLine(w, result)}. ${w.note}`);
  lines.push('', 'COACHING TIPS');
  for (const t of guidance.tips) lines.push(`- ${t}`);
  return lines.join('\n');
}
