interface HashMarkProps {
  size?: number;
  className?: string;
}

/**
 * Tool brand mark: FitBudd-orange rounded square with a white hash glyph,
 * drawn with bars so it renders identically everywhere (no font metrics).
 */
export function HashMark({ size = 20, className }: HashMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="24" height="24" rx="6" fill="#ff7a00" />
      <g fill="#fff">
        <rect x="5.2" y="8.6" width="13.6" height="2" rx="1" />
        <rect x="5.2" y="13.4" width="13.6" height="2" rx="1" />
        <rect
          x="8.9"
          y="5.2"
          width="2"
          height="13.6"
          rx="1"
          transform="rotate(8 9.9 12)"
        />
        <rect
          x="13.1"
          y="5.2"
          width="2"
          height="13.6"
          rx="1"
          transform="rotate(8 14.1 12)"
        />
      </g>
    </svg>
  );
}
