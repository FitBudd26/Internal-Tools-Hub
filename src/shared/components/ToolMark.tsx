/** Orange rounded-square mark with a check glyph, for tool headers. */
export function ToolMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="20" rx="5" fill="#ff7a00" />
      <path
        d="M5.5 10.5l3 3 6-6.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
