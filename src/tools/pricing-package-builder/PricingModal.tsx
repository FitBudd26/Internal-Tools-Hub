import { useEffect, useRef, useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { copyText } from '../../shared/lib/copy';
import { priceUnit, strategyText } from './format';
import { tierRevenue } from './generatePricing';
import { CTA_TEXT, CTA_URL, SEE_TEXT, SEE_URL } from './links';
import { TIERS, TIER_LABEL, money, type PricingPackage, type PricingStrategy } from './types';

const sectionCls = 'mb-1 text-[11px] font-bold uppercase tracking-wide text-fb-teal';
const linkCls =
  'rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-2.5 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-[13px] font-bold text-gray-900">{value}</p>
    </div>
  );
}

function PackageCard({ pkg, highlighted, unit }: { pkg: PricingPackage; highlighted: boolean; unit: string }) {
  return (
    <li data-tier={pkg.tier} className={`rounded-xl border px-3 py-2.5 ${highlighted ? 'border-fb-orange bg-orange-50/60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
            {TIER_LABEL[pkg.tier]}
            {highlighted && <span className="rounded-full bg-fb-teal px-1.5 py-px text-[9px] font-semibold normal-case tracking-normal text-white">Most Popular</span>}
          </p>
          <p data-package-name className="text-[14px] font-bold leading-snug text-gray-900">{pkg.name}</p>
        </div>
        <p className="shrink-0 text-right">
          <span data-package-price className="text-[18px] font-bold text-gray-900">{money(pkg.priceMonthly)}</span>
          <span className="text-[11px] text-gray-500">{unit}</span>
        </p>
      </div>
      <p className="mt-0.5 text-[12px] italic leading-snug text-gray-600">{pkg.tagline}</p>
      <ul className="mt-1.5 flex flex-col gap-0.5">
        {pkg.includes.map((item) => (
          <li key={item} data-include className="flex items-start gap-1.5 text-[12px] leading-snug text-gray-700">
            <span aria-hidden="true" className="mt-px font-bold text-fb-orange">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 border-t border-gray-200/70 pt-1.5 text-[11px] leading-snug text-gray-600">
        <span className="font-semibold uppercase tracking-wide text-gray-500">Ideal for </span>
        {pkg.idealFor}
      </p>
      <p className="mt-1 inline-block rounded bg-fb-tint px-1.5 py-0.5 text-[10px] font-medium text-fb-teal">{pkg.deliverySummary}</p>
    </li>
  );
}

interface PricingModalProps {
  open: boolean;
  strategy: PricingStrategy | null;
  subtitle: string;
  regenerating: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onStartOver: () => void;
  onCtaClick: (text: string, url: string) => void;
}

/** Results in the same modal as the other tools: packages, strategy notes, revenue projection and the CTA. */
export function PricingModal({ open, strategy, subtitle, regenerating, onClose, onRegenerate, onStartOver, onCtaClick }: PricingModalProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!strategy) return null;

  const { packages, strategyNotes, pricing, figures } = strategy;
  const unit = priceUnit(pricing.isGroup);
  const rev = tierRevenue(pricing);
  const clients = { starter: pricing.starterClients, core: pricing.coreClients, premium: pricing.premiumClients };
  const people = pricing.isGroup ? 'members' : 'clients';

  const copy = async () => {
    if (!(await copyText(strategyText(strategy)))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Pricing Strategy Is Ready"
      subtitle={subtitle}
      footer={
        <div>
          <CTASection
            headline="Ready to sell these packages?"
            body="Trainers on FitBudd sell packages directly from their own branded app and website, with zero commission on payments. Set up your packages, automate onboarding, and start collecting payments in minutes."
            ctaText={CTA_TEXT}
            ctaUrl={CTA_URL}
            onCtaClick={() => onCtaClick(CTA_TEXT, CTA_URL)}
            microCopy="No credit card required · Built for coaches, trainers and gyms"
          />
          <p className="mt-2 text-center text-[11px] text-gray-500">
            Want a closer look first?{' '}
            <a href={SEE_URL} target="_blank" rel="noopener noreferrer" onClick={() => onCtaClick(SEE_TEXT, SEE_URL)} className="font-semibold text-fb-teal underline">
              {SEE_TEXT}
            </a>
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Price range" value={`${money(pricing.starter)} - ${money(pricing.premium)}`} />
        <Stat label="Capacity" value={`${figures.maxClients} ${people}`} />
        <Stat label="Projected /mo" value={money(figures.totalRevenue)} />
      </div>

      <section>
        <h3 className={sectionCls}>Three-tier package structure</h3>
        <ul className="flex flex-col gap-1.5">
          {packages.map((pkg) => (
            <PackageCard key={pkg.tier} pkg={pkg} highlighted={pkg.tier === 'core'} unit={unit} />
          ))}
        </ul>
      </section>

      <section>
        <h3 className={sectionCls}>Pricing strategy notes</h3>
        <ol className="flex flex-col gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
          {strategyNotes.map((note, i) => (
            <li key={i} data-note className="flex items-start gap-2">
              <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-orange-50 text-[10px] font-bold text-fb-orange">{i + 1}</span>
              <p className="text-[12px] leading-relaxed text-gray-700">{note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className={sectionCls}>Revenue projection</h3>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-2.5 py-1.5 text-left font-semibold">Tier</th>
                <th className="px-2.5 py-1.5 text-center font-semibold">{pricing.isGroup ? 'Members' : 'Clients'}</th>
                <th className="px-2.5 py-1.5 text-center font-semibold">Price</th>
                <th className="px-2.5 py-1.5 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => (
                <tr key={tier} data-revenue-row={tier} className="border-t border-gray-100">
                  <td className="px-2.5 py-1.5 font-medium text-gray-900">{TIER_LABEL[tier]}</td>
                  <td className="px-2.5 py-1.5 text-center text-gray-600">{clients[tier]}</td>
                  <td className="px-2.5 py-1.5 text-center text-gray-600">{money(pricing[tier])}</td>
                  <td className="px-2.5 py-1.5 text-right font-medium text-gray-900">{money(rev[tier])}</td>
                </tr>
              ))}
              <tr data-revenue-row="total" className="border-t border-gray-200 bg-gray-50">
                <td className="px-2.5 py-1.5 font-bold text-gray-900">Total</td>
                <td className="px-2.5 py-1.5 text-center font-bold text-gray-900">{clients.starter + clients.core + clients.premium}</td>
                <td />
                <td className="px-2.5 py-1.5 text-right text-[13px] font-bold text-fb-orange">{money(figures.totalRevenue)}/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-gray-400">
          A projection at full capacity from your own inputs, not a forecast or a guarantee of income.
        </p>
      </section>

      <button
        type="button"
        onClick={copy}
        className="h-10 w-full rounded-lg border border-fb-teal text-sm font-semibold text-fb-teal transition-colors hover:bg-fb-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {copied ? '✓ Copied' : 'Copy Packages and Strategy'}
      </button>
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={onRegenerate} disabled={regenerating} aria-busy={regenerating} className={`${linkCls} disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline`}>
          {regenerating ? 'Regenerating…' : '↻ Regenerate'}
        </button>
        <button type="button" onClick={onStartOver} className={linkCls}>
          Start over with different inputs
        </button>
      </div>
      <span aria-live="polite" className="sr-only">{copied ? 'Packages and strategy copied to clipboard' : ''}</span>
    </ToolModal>
  );
}
