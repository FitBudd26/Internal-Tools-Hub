interface CTASectionProps {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  microCopy?: string;
  socialProof?: string;
  onCtaClick?: () => void;
}

/** Teal-tinted FitBudd conversion block used at the end of every tool. */
export function CTASection({
  headline,
  body,
  ctaText,
  ctaUrl,
  microCopy,
  socialProof,
  onCtaClick,
}: CTASectionProps) {
  return (
    <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3 text-center">
      <p className="text-[13px] font-bold text-gray-900">{headline}</p>
      <p className="mt-1 text-[13px] leading-snug text-gray-600">{body}</p>
      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onCtaClick}
        className="mt-2.5 flex h-[46px] w-full items-center justify-center rounded-lg bg-fb-teal px-3 text-center text-sm font-semibold leading-tight text-white transition-colors hover:bg-fb-teal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal"
      >
        {ctaText}
      </a>
      {microCopy && <p className="mt-1.5 text-[11px] text-gray-500">{microCopy}</p>}
      {socialProof && (
        <p className="mt-2 border-t border-fb-tint-border pt-2 text-[11px] leading-snug text-gray-500">
          {socialProof}
        </p>
      )}
    </div>
  );
}
