import type { Recipe } from './types';

export function RecipeCard({ recipe: r, index }: { recipe: Recipe; index: number }) {
  return (
    <article className="rounded-lg border border-fb-tint-border bg-white p-2.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-bold leading-snug text-gray-900">
          {index + 1}. {r.name}
        </h3>
        <span className="shrink-0 rounded-full bg-fb-tint px-2 py-0.5 text-[11px] font-semibold text-fb-teal">
          {r.timeMinutes} min
        </span>
      </div>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {r.mealType} · about {r.nutrition.calories} kcal{r.nutritionSource !== 'estimated' ? '†' : ''} ·{' '}
        {r.nutrition.proteinG} g protein · {r.nutrition.carbsG} g carbs · {r.nutrition.fatG} g fat
      </p>
      <p className="mt-1 text-[13px] leading-snug text-gray-700">{r.description}</p>
      <p className="mt-1 text-[12px] leading-snug text-fb-teal">
        <span className="font-semibold">Goal fit:</span> {r.goalAlignment}
      </p>
      <details className="mt-1.5 text-[13px] leading-snug text-gray-700">
        <summary className="cursor-pointer font-semibold text-gray-900">Ingredients and steps</summary>
        <div className="mt-1 grid gap-2">
          <ul className="list-disc space-y-0.5 pl-4">
            {r.ingredients.map((ing) => (
              <li key={ing}>{ing}</li>
            ))}
          </ul>
          <ol className="list-decimal space-y-0.5 pl-4">
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </details>
      <p className="mt-1.5 rounded-md bg-fb-tint px-2 py-1.5 text-[12px] leading-snug text-gray-700">
        <span className="font-semibold text-gray-900">Coach note:</span> {r.coachingNote}
      </p>
    </article>
  );
}
