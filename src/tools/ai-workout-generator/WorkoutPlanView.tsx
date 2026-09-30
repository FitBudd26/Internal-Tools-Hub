import type { ReactNode } from 'react';
import { exerciseMeta } from './format';
import type { RoutineItem, WorkoutPlan } from './types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-fb-teal">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-full border border-fb-tint-border bg-fb-tint px-2.5 py-0.5">
      <span className="text-xs font-bold text-fb-teal">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
    </span>
  );
}

function Routine({ items, kind }: { items: RoutineItem[]; kind: 'warmup' | 'cooldown' }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.movement} data-routine={kind} className="rounded-lg bg-gray-50 px-2.5 py-1.5">
          <p className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="min-w-0 font-medium text-gray-800">{item.movement}</span>
            <span className="shrink-0 text-[11px] text-gray-500">{item.duration}</span>
          </p>
          {item.notes && <p className="text-[11px] leading-snug text-gray-500">{item.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

/** The whole session on screen: format, warm-up, exercises, cool-down and the coach's notes. */
export function WorkoutPlanView({ plan }: { plan: WorkoutPlan }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        {plan.trainingFormat && <p className="text-[13px] font-medium leading-snug text-gray-800">{plan.trainingFormat}</p>}
        {plan.goalSummary && <p className="mt-1 text-[12px] leading-snug text-gray-600">{plan.goalSummary}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Stat label="Warm-up" value={plan.warmup.length} />
          <Stat label="Exercises" value={plan.mainWorkout.length} />
          <Stat label="Cool-down" value={plan.cooldown.length} />
        </div>
      </div>

      <Section title="Warm-up">
        <Routine items={plan.warmup} kind="warmup" />
      </Section>

      <Section title="Main workout">
        <ol className="flex flex-col gap-1.5">
          {plan.mainWorkout.map((ex, i) => (
            <li key={ex.exercise} data-exercise={ex.exercise} className="rounded-lg border border-gray-200 px-2.5 py-2">
              <p className="text-[13px] font-semibold leading-snug text-gray-900">
                {i + 1}. {ex.exercise}
              </p>
              <p className="text-[11px] font-semibold text-fb-orange">{exerciseMeta(ex)}</p>
              {ex.notes && <p className="mt-0.5 text-[12px] leading-snug text-gray-600">{ex.notes}</p>}
              {ex.modification && <p className="mt-0.5 text-[12px] leading-snug text-fb-teal">Modification: {ex.modification}</p>}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Cool-down">
        <Routine items={plan.cooldown} kind="cooldown" />
      </Section>

      {(
        [
          ['Progression', plan.progression],
          ['Weekly split', plan.weeklySplitRecommendation],
          ['Trainer notes', plan.trainerNotes],
        ] as const
      ).map(([title, text]) =>
        text ? (
          <Section key={title} title={title}>
            <p className="text-[12px] leading-snug text-gray-700">{text}</p>
          </Section>
        ) : null,
      )}
    </div>
  );
}
