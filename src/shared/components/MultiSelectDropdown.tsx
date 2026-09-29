import { useEffect, useId, useRef, useState } from 'react';

interface MultiSelectDropdownProps<T extends string> {
  label: string;
  labelHint?: string;
  placeholder: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  required?: boolean;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.5 7.5 10 12l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true" focusable="false">
      <path
        d="M2.5 7.5 5.5 10.5 11.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Multi-select in a dropdown, styled like SelectDropdown: the trigger
 * summarises the selection (names + count), the panel stays open while
 * picking, and Done, Clear, Escape or a click outside close it.
 */
export function MultiSelectDropdown<T extends string>({
  label,
  labelHint,
  placeholder,
  options,
  selected,
  onChange,
  required = false,
}: MultiSelectDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onFocusOut = (e: FocusEvent) => {
      if (e.relatedTarget && !wrapRef.current?.contains(e.relatedTarget as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const wrap = wrapRef.current;
    wrap?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      wrap?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  const toggle = (option: T) =>
    onChange(
      selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option],
    );
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1 block text-sm font-bold text-gray-900">
        {label}
        {labelHint && <span className="font-normal text-gray-400"> {labelHint}</span>}
        {required && (
          <span className="text-fb-orange" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm outline-none transition-colors ${
          open
            ? 'border-fb-orange ring-2 ring-fb-orange/25'
            : 'border-gray-300 hover:border-gray-400 focus-visible:border-fb-orange focus-visible:ring-2 focus-visible:ring-fb-orange/25'
        }`}
      >
        <span className={`truncate ${selected.length ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected.length ? selected.join(', ') : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {selected.length > 1 && (
            <span
              aria-label={`${selected.length} selected`}
              className="rounded-full bg-fb-orange/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-fb-orange"
            >
              {selected.length}
            </span>
          )}
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute z-50 mt-1 w-full animate-[dd-in_120ms_ease-out] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="max-h-52 overflow-auto py-1">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(option)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-fb-tint focus-visible:bg-fb-tint focus-visible:outline-none ${
                    isSelected ? 'font-medium text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-fb-orange bg-fb-orange text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <TickIcon />}
                  </span>
                  <span className="truncate">{option}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              disabled={selected.length === 0}
              className="rounded text-xs font-medium text-gray-500 hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:invisible"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded px-2 py-1 text-xs font-semibold text-fb-teal hover:bg-fb-teal/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-teal"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
