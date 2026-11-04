import type { Nutrition } from './types';
import { NUTRITION_STATUS_LABELS } from './types';

const cell = (label: string, value: number | null, unit: string, strong = false) => (
  <div key={label} className={`rounded-md px-2 py-1.5 ${strong ? 'bg-fb-tint' : 'bg-gray-50'}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
    <div className={`text-[13px] font-bold leading-tight ${strong ? 'text-fb-teal' : 'text-gray-900'}`}>{value === null ? 'n/a' : `${value}${unit}`}</div>
  </div>
);

/** Per-serving figures with an honest status line: calculated from reference data, an AI estimate, or not calculated. */
export function NutritionSummary({ nutrition: n }: { nutrition: Nutrition }) {
  if (n.status === 'not_calculated') {
    return (
      <p className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] leading-snug text-gray-600" role="status">
        <span className="font-semibold text-gray-900">Nutrition not calculated.</span> {NUTRITION_STATUS_LABELS.not_calculated}
      </p>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {cell('Net carbs', n.netCarbs, ' g', true)}
        {cell('Calories', n.calories, ' kcal')}
        {cell('Protein', n.protein, ' g')}
        {cell('Total carbs', n.totalCarbs, ' g')}
        {cell('Fiber', n.fiber, ' g')}
        {cell('Fat', n.fat, ' g')}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-gray-500">
        {n.status === 'estimated' ? '≈ ' : ''}
        {NUTRITION_STATUS_LABELS[n.status]} Net carbs = total carbs − fiber.
      </p>
    </div>
  );
}
