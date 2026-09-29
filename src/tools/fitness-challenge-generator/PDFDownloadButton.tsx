import { useState } from 'react';
import type { Challenge } from './types';
import { downloadChallengePdf } from './generatePdf';

type State = 'idle' | 'busy' | 'done' | 'error';

interface PDFDownloadButtonProps {
  challenge: Challenge;
  onDownloaded?: (fileName: string) => void;
}

export function PDFDownloadButton({ challenge, onDownloaded }: PDFDownloadButtonProps) {
  const [state, setState] = useState<State>('idle');

  const handleClick = async () => {
    if (state === 'busy') return;
    setState('busy');
    try {
      const name = await downloadChallengePdf(challenge);
      setState('done');
      onDownloaded?.(name);
      window.setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
    }
  };

  const label =
    state === 'busy'
      ? 'Preparing PDF…'
      : state === 'done'
        ? '✓ PDF downloaded'
        : state === 'error'
          ? 'Download failed — try again'
          : 'Download PDF';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={state === 'busy'}
      aria-label={`Download the ${challenge.challengeName} as a PDF`}
      className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange aria-busy:cursor-wait aria-busy:opacity-80"
    >
      {label}
    </button>
  );
}
