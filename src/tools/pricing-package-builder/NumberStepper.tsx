import { useEffect, useState } from 'react';

interface NumberStepperProps {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

const stepCls =
  'flex h-full w-10 shrink-0 items-center justify-center text-lg text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:text-gray-300';

/** Minus, a typed number, plus. Typing is committed on blur or Enter and clamped to the range. */
export function NumberStepper({ id, value, min, max, onChange }: NumberStepperProps) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => setRaw(String(value)), [value]);
  const commit = () => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) setRaw(String(value));
    else {
      const next = Math.min(max, Math.max(min, n));
      setRaw(String(next));
      onChange(next);
    }
  };
  return (
    <div className="flex h-10 items-stretch overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-fb-orange focus-within:ring-2 focus-within:ring-fb-orange/25">
      <button type="button" aria-label="Fewer clients" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={`${stepCls} border-r border-gray-200`}>
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={(e) => setRaw(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold text-gray-900 outline-none"
      />
      <button type="button" aria-label="More clients" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={`${stepCls} border-l border-gray-200`}>
        +
      </button>
    </div>
  );
}
