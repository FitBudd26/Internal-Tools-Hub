import type { ReactNode } from 'react';
import type { Challenge } from './types';
import { CTASection } from '../../shared/components/CTASection';
import { PDFDownloadButton } from './PDFDownloadButton';
import { CTA_TEXT, CTA_URL } from './tracking';

interface ChallengePreviewProps {
  challenge: Challenge;
  onPdfDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
  onRestart: () => void;
}

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

export function ChallengePreview({
  challenge: c,
  onPdfDownloaded,
  onCtaClick,
  onRestart,
}: ChallengePreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-fb-teal">
          Your Ready-to-Run Fitness Challenge
        </p>
        <h2 className="mt-0.5 text-base font-bold leading-tight text-gray-900">
          {c.challengeName}
        </h2>
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

      <PDFDownloadButton challenge={c} onDownloaded={onPdfDownloaded} />
      <p className="-mt-1 text-center text-[11px] text-gray-400">
        Client-ready, branding-neutral PDF with a day-by-day check-in tracker
      </p>

      <CTASection
        headline="Run this challenge inside your own branded fitness app."
        body="You created the challenge. Now deploy it to clients with daily tasks, check-ins, streaks and results in one place."
        ctaText={CTA_TEXT}
        ctaUrl={CTA_URL}
        onCtaClick={onCtaClick}
        microCopy="No credit card required · 30-day free trial"
        socialProof="Trusted by 10,000+ fitness coaches, personal trainers, gym owners, and studios growing with FitBudd every day."
      />

      <button
        type="button"
        onClick={onRestart}
        className="mx-auto rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
      >
        ↻ Create another challenge
      </button>
    </div>
  );
}
