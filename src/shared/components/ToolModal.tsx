import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ToolModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Small mark shown before the title (e.g. HashMark / ToolMark). */
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Rendered below the scrollable body, e.g. the FitBudd CTA. */
  footer?: ReactNode;
  closeLabel?: string;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" focusable="false">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Centered results modal shared by every tool: header with mark, title,
 * subtitle and ✕, a scrollable body and an optional footer. Closes on
 * Escape and on backdrop click; moves focus into the panel when opened.
 */
export function ToolModal({
  open,
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  closeLabel = 'Close results',
}: ToolModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-[480px] animate-[dd-in_140ms_ease-out] flex-col overflow-hidden rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 p-3.5 pb-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="flex items-center gap-1.5 text-sm font-bold text-fb-orange"
            >
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-gray-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="shrink-0 rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3.5 pt-3">{children}</div>

        {footer && <div className="border-t border-gray-100 p-3.5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}
