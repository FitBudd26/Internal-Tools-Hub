import { useState } from 'react';

type State = 'idle' | 'busy' | 'done' | 'error';

interface PdfDownloadButtonProps {
  /** Builds and triggers the download; resolves with the file name. */
  onDownload: () => Promise<string>;
  onDownloaded?: (fileName: string) => void;
  label?: string;
  ariaLabel: string;
}

/** Orange primary button that builds a PDF on demand and reports the outcome. */
export function PdfDownloadButton({
  onDownload,
  onDownloaded,
  label = 'Download PDF',
  ariaLabel,
}: PdfDownloadButtonProps) {
  const [state, setState] = useState<State>('idle');

  const handleClick = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      const name = await onDownload();
      setState('done');
      onDownloaded?.(name);
      window.setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
    }
  };

  const text =
    state === 'busy'
      ? 'Preparing PDF…'
      : state === 'done'
        ? '✓ PDF downloaded'
        : state === 'error'
          ? 'Download failed, try again'
          : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={state === 'busy'}
      aria-label={ariaLabel}
      className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange aria-busy:cursor-wait aria-busy:opacity-80"
    >
      {text}
    </button>
  );
}
