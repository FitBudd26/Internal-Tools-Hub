import { NutritionSummary } from './NutritionSummary';
import { formatIngredient } from './recipeUtils';
import { REVIEW_STATUS_LABELS, type Recipe } from './types';

const h4 = 'text-[12px] font-bold uppercase tracking-wide text-gray-900';

/** The selected recipe in full: everything the PDF prints, from the same object. */
export function RecipeDetails({ recipe: r }: { recipe: Recipe }) {
  const meets = r.atkinsCompatibility.reviewStatus === 'meets_plan_guidelines';
  return (
    <article className="flex flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3" aria-live="polite">
      <div>
        <h3 className="text-[15px] font-bold leading-tight text-gray-900">{r.name}</h3>
        <p className="mt-1 text-[13px] leading-snug text-gray-700">{r.description}</p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {r.mealType} · {r.cuisine} · Prep {r.prepTime} min · Cook {r.cookTime} min · Total {r.totalTime} min
        </p>
      </div>

      <div className="rounded-md border border-fb-tint-border bg-fb-tint px-2.5 py-2 text-[12px] leading-snug text-gray-700">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-gray-900">{r.atkinsCompatibility.planLabel}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meets ? 'bg-fb-teal text-white' : 'bg-orange-100 text-orange-900'}`}>
            {REVIEW_STATUS_LABELS[r.atkinsCompatibility.reviewStatus]}
          </span>
        </div>
        <p className="mt-1">{r.atkinsCompatibility.suitability}</p>
      </div>

      <section>
        <h4 className={h4}>
          Ingredients <span className="font-normal normal-case tracking-normal text-gray-500">· {r.servingBasis}</span>
        </h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-gray-700">
          {r.ingredients.map((ing, i) => (
            <li key={`${ing.name}-${i}`}>{formatIngredient(ing)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className={h4}>Instructions</h4>
        <ol className="mt-1 list-decimal space-y-1 pl-4 text-[13px] leading-snug text-gray-700">
          {r.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section>
        <h4 className={h4}>Nutrition per serving</h4>
        <div className="mt-1">
          <NutritionSummary nutrition={r.nutrition} />
        </div>
      </section>

      {r.substitutions.length > 0 && (
        <section>
          <h4 className={h4}>Substitutions</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-gray-700">
            {r.substitutions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[12px] leading-snug text-gray-600">
        <span className="font-semibold text-gray-900">Note:</span> {r.nutritionNote}
      </p>
    </article>
  );
}
