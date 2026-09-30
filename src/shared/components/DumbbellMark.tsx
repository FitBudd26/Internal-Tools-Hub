/** Orange rounded-square mark with a white dumbbell, for gym and training tool headers. */
export function DumbbellMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="#ff7a00" />
      <g fill="#fff">
        <rect x="9" y="11.1" width="6" height="1.8" rx="0.9" />
        <rect x="6.2" y="8" width="2.4" height="8" rx="1.2" />
        <rect x="15.4" y="8" width="2.4" height="8" rx="1.2" />
        <rect x="3.5" y="9.6" width="2" height="4.8" rx="1" />
        <rect x="18.5" y="9.6" width="2" height="4.8" rx="1" />
      </g>
    </svg>
  );
}
