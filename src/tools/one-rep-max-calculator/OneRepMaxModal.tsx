import { useEffect, useRef, useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { DumbbellMark } from '../../shared/components/DumbbellMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { ONE_RM_DISCLAIMER } from '../../shared/disclaimers';
import { copyText } from '../../shared/lib/copy';
import { FORMULA_NAMES, FORMULA_ORDER, formatWeight, loadFor } from './calculate';
import { planLine, resultText } from './format';
import { CTA_TEXT, CTA_URL, POWERED_TEXT, POWERED_URL } from './links';
import type { Guidance, OneRmResult } from './types';

const sectionCls = 'mb-1 text-[11px] font-bold uppercase tracking-wide text-fb-teal';
const linkCls =
  'rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange';
const thCls = 'px-2.5 py-1.5 text-left font-semibold';
const tdCls = 'px-2.5 py-1.5';

interface OneRepMaxModalProps {
  open: boolean;
  result: OneRmResult | null;
  guidance: Guidance | null;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onCtaClick: (text: string, url: string) => void;
}

/** Results in the same modal as the other tools: the estimate, the formulas, the load chart, the guidance and the CTA. */
export function OneRepMaxModal({ open, result, guidance, regenerating, onClose, onRegenerate, onCtaClick }: OneRepMaxModalProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!result || !guidance) return null;

  const { input, oneRm, formulas, average, high, low, alreadyMax, chart } = result;
  const unit = input.unit;
  const spread = high !== low;

  const copy = async () => {
    if (!(await copyText(resultText(result, guidance)))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<DumbbellMark size={18} className="shrink-0" />}
      title="Your One Rep Max"
      subtitle={`${input.exercise} · ${formatWeight(input.weight)} ${unit} × ${input.reps} ${input.reps === 1 ? 'rep' : 'reps'}`}
      footer={
        <div>
          <CTASection
            headline="Run this for every client, inside your own app."
            body="FitBudd gives coaches a branded fitness app: programming, check-ins, payments. Zero commission."
            ctaText={CTA_TEXT}
            ctaUrl={CTA_URL}
            onCtaClick={() => onCtaClick(CTA_TEXT, CTA_URL)}
            microCopy="No credit card required · Built for coaches, trainers and gyms"
          />
          <p className="mt-2 text-center text-[11px] text-gray-400">
            <a href={POWERED_URL} target="_blank" rel="noopener noreferrer" onClick={() => onCtaClick(POWERED_TEXT, POWERED_URL)} className="underline-offset-2 hover:text-gray-600 hover:underline">
              {POWERED_TEXT}
            </a>
          </p>
        </div>
      }
    >
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint px-3 py-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{input.exercise}</p>
        <p className="leading-none">
          <span data-one-rm className="text-[40px] font-bold text-gray-900">{formatWeight(oneRm)}</span>
          <span className="ml-1 text-[15px] font-semibold text-gray-500">{unit}</span>
        </p>
        <p className="mt-1 text-[12px] text-gray-600">{alreadyMax ? "That's already your one rep max. Solid lift." : 'Estimated One Rep Max (Epley)'}</p>
      </div>

      {input.reps > 12 && (
        <p role="note" className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-[12px] text-gray-700">
          Note: Estimates are most accurate between 2 and 10 reps.
        </p>
      )}

      <section>
        <h3 className={sectionCls}>Coach&apos;s read</h3>
        <p data-summary className="text-[12px] leading-relaxed text-gray-700">{guidance.summary}</p>
      </section>

      {!alreadyMax && (
        <section>
          <button
            type="button"
            onClick={() => setShowFormulas((v) => !v)}
            aria-expanded={showFormulas}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange"
          >
            Compare across 6 formulas
            <span aria-hidden="true" className={`text-gray-500 transition-transform ${showFormulas ? 'rotate-180' : ''}`}>▾</span>
          </button>
          {showFormulas && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                    <th scope="col" className={thCls}>Formula</th>
                    <th scope="col" className={`${thCls} text-right`}>Estimated 1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {FORMULA_ORDER.map((key) => (
                    <tr key={key} data-formula={key} className="border-t border-gray-100">
                      <td className={`${tdCls} text-gray-800`}>{FORMULA_NAMES[key]}</td>
                      <td className={`${tdCls} text-right font-medium text-gray-900`}>
                        {spread && formulas[key] === high && <span className="mr-1.5 rounded bg-fb-tint px-1.5 py-px text-[10px] font-semibold text-fb-teal">Highest</span>}
                        {spread && formulas[key] === low && <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-px text-[10px] font-semibold text-gray-500">Lowest</span>}
                        {formatWeight(formulas[key])} {unit}
                      </td>
                    </tr>
                  ))}
                  <tr data-formula="average" className="border-t border-gray-200 bg-gray-50">
                    <td className={`${tdCls} font-bold text-gray-900`}>Average</td>
                    <td className={`${tdCls} text-right font-bold text-gray-900`}>{formatWeight(average)} {unit}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className={sectionCls}>Training load chart</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                <th scope="col" className={thCls}>% of 1RM</th>
                <th scope="col" className={thCls}>Weight</th>
                <th scope="col" className={thCls}>Reps</th>
                <th scope="col" className={thCls}>Zone</th>
              </tr>
            </thead>
            <tbody>
              {chart.map((z) => (
                <tr key={z.pct} data-zone={z.pct} className={`border-t border-gray-100 ${z.pct === 100 ? 'font-bold text-gray-900' : z.key ? 'bg-orange-50/60 text-gray-800' : 'text-gray-700'}`}>
                  <td className={tdCls}>{z.pct}%</td>
                  <td className={`${tdCls} font-medium`}>{formatWeight(z.weight)} {unit}</td>
                  <td className={tdCls}>{z.reps}</td>
                  <td className={tdCls}>{z.zone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className={sectionCls}>Warm-up to the first working set</h3>
        <ol className="flex flex-wrap gap-1.5">
          {guidance.warmup.map((step, i) => (
            <li key={i} data-warmup className="rounded-lg border border-gray-200 px-2 py-1 text-[12px] text-gray-700">
              <span className="font-semibold text-gray-900">{formatWeight(loadFor(oneRm, step.percent, unit))} {unit}</span> × {step.reps}
              <span className="text-gray-400"> · {formatWeight(step.percent)}%</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className={sectionCls}>Four-week plan{input.goal ? ` for ${input.goal.toLowerCase()}` : ''}</h3>
        <ol className="flex flex-col gap-1.5">
          {guidance.plan.map((week) => (
            <li key={week.week} data-plan-week={week.week} className="rounded-lg border border-gray-200 px-2.5 py-2">
              <p className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-semibold text-gray-900">Week {week.week} · {week.focus}</span>
                <span data-plan-line className="shrink-0 text-[12px] font-semibold text-fb-orange">{planLine(week, result)}</span>
              </p>
              {week.note && <p className="mt-0.5 text-[12px] leading-snug text-gray-600">{week.note}</p>}
            </li>
          ))}
        </ol>
        <p className="mt-1 text-[11px] leading-snug text-gray-400">
          Plan weights are rounded to the nearest {unit === 'kg' ? '2.5 kg' : '5 lbs'} so the bar can be loaded.
        </p>
      </section>

      <section>
        <h3 className={sectionCls}>Coaching tips</h3>
        <ul className="flex flex-col gap-1">
          {guidance.tips.map((tip) => (
            <li key={tip} data-tip className="flex items-start gap-1.5 text-[12px] leading-snug text-gray-700">
              <span aria-hidden="true" className="mt-px font-bold text-fb-orange">✓</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={copy}
        className="h-10 w-full rounded-lg border border-fb-teal text-sm font-semibold text-fb-teal transition-colors hover:bg-fb-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {copied ? '✓ Copied' : 'Copy Results'}
      </button>
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={onRegenerate} disabled={regenerating} aria-busy={regenerating} className={`${linkCls} disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline`}>
          {regenerating ? 'Regenerating…' : '↻ Regenerate guidance'}
        </button>
        <button type="button" onClick={onClose} className={linkCls}>
          Recalculate
        </button>
      </div>
      <span aria-live="polite" className="sr-only">{copied ? 'Results copied to clipboard' : ''}</span>

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">Disclaimer: {ONE_RM_DISCLAIMER}</p>
    </ToolModal>
  );
}
