/** Small inline icons for the question editor (no icon library in the bundle). */

function Icon({ d, className = 'h-3.5 w-3.5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const ChevronUpIcon = () => <Icon d="M4 10l4-4 4 4" />;
export const ChevronDownIcon = () => <Icon d="M4 6l4 4 4-4" />;
export const PencilIcon = () => <Icon d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />;
export const TrashIcon = () => <Icon d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8h5.6l.7-8" />;
export const DownloadIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <Icon className={className} d="M8 2.5v8m0 0L5 7.5m3 3l3-3M3 11.5v2h10v-2" />
);
export const CheckIcon = ({ className = 'h-3.5 w-3.5' }: { className?: string }) => <Icon className={className} d="M3 8.5l3 3 7-7" />;
