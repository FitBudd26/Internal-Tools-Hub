import { CTA_TEXT, CTA_URL } from '../lib/tracking';

export function CTASection() {
  return (
    <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3 text-center">
      <p className="text-[13px] font-semibold text-gray-900">
        ⭐ 92% of personal trainers using FitBudd gave us 5 stars.
      </p>
      <p className="mt-0.5 text-[13px] text-gray-600">
        Build your own fitness app and grow your business.
      </p>
      <a
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2.5 flex h-[46px] w-full items-center justify-center rounded-lg bg-fb-teal text-sm font-semibold text-white transition-colors hover:bg-fb-teal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {CTA_TEXT}
      </a>
    </div>
  );
}
