import type { ReactNode } from 'react';
import type { Challenge } from './types';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-fb-tint-border bg-white p-2.5">
      <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
      <div className="mt-1 text-[13px] leading-snug text-gray-700">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** On-screen preview of the generated framework (content only; the modal adds PDF + CTA). */
export function ChallengePreview({ challenge: c }: { challenge: Challenge }) {
  return (
    <>
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        <h3 className="text-base font-bold leading-tight text-gray-900">{c.challengeName}</h3>
        <p className="mt-0.5 text-[13px] text-gray-600">{c.subtitle}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
          <dt className="font-semibold text-gray-900">Who it’s for</dt>
          <dd className="text-gray-700">{c.designedFor}</dd>
          <dt className="font-semibold text-gray-900">Level</dt>
          <dd className="text-gray-700">{c.level}</dd>
          <dt className="font-semibold text-gray-900">Duration</dt>
          <dd className="text-gray-700">{c.duration}</dd>
        </dl>
      </div>

      <Section title="Objective">
        <p>{c.objective}</p>
      </Section>

      <Section title="How it works">
        <p>{c.howItWorks}</p>
      </Section>

      <Section title="Daily challenge rules">
        <ol className="list-decimal space-y-1 pl-4">
          {c.dailyRules.map((rule) => (
            <li key={rule.title}>
              <span className="font-semibold text-gray-900">{rule.title}</span>
              <ul className="list-disc pl-4 text-gray-600">
                {rule.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Weekly structure">
        <div className="grid gap-1.5">
          {c.weeklyThemes.map((t) => (
            <div key={t.label} className="rounded-md bg-fb-tint px-2 py-1.5">
              <p className="font-semibold text-gray-900">
                {t.label} · {t.name}
              </p>
              <p className="text-gray-700">Focus: {t.focus}</p>
              <p className="text-gray-500">Coach tip: {t.coachTip}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Scoring system (optional)">
        <Bullets items={c.scoringSystem} />
      </Section>

      <Section title="Progress tracking">
        <Bullets items={c.progressTracking} />
      </Section>

      <details className="rounded-lg border border-fb-tint-border bg-white p-2.5 text-[13px] leading-snug text-gray-700">
        <summary className="cursor-pointer font-bold text-gray-900">Coaching notes</summary>
        <div className="mt-1">
          <Bullets items={c.coachingNotes} />
        </div>
      </details>

      <details className="rounded-lg border border-fb-tint-border bg-white p-2.5 text-[13px] leading-snug text-gray-700">
        <summary className="cursor-pointer font-bold text-gray-900">
          Client-facing instructions (reusable)
        </summary>
        <div className="mt-1 space-y-1">
          {c.clientInstructions.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </details>
    </>
  );
}
