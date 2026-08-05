import { CTA_TEXT, CTA_URL, trackCtaClick } from '../lib/tracking';

export function CTASection() {
  return (
    <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3 text-center">
      <p className="text-[13px] font-bold text-gray-900">
        Turn Content Into Clients
      </p>
      <p className="mt-1 text-[13px] leading-snug text-gray-600">
        Posting consistently is easier when your business runs on one system.
        Build your own branded fitness app, manage clients, sell programs, and
        grow with FitBudd.
      </p>
      <a
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackCtaClick}
        className="mt-2.5 flex h-[46px] w-full items-center justify-center rounded-lg bg-fb-teal text-sm font-semibold text-white transition-colors hover:bg-fb-teal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {CTA_TEXT}
      </a>
      <p className="mt-1.5 text-[11px] text-gray-500">
        No credit card required · Built for fitness professionals
      </p>
    </div>
  );
}
