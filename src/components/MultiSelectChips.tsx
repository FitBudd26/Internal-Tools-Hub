interface MultiSelectChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  required?: boolean;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 6.2 5 8.7l4.5-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MultiSelectChips<T extends string>({
  label,
  options,
  selected,
  onChange,
  required = false,
}: MultiSelectChipsProps<T>) {
  const toggle = (option: T) => {
    onChange(
      selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option],
    );
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-bold text-gray-900">
        {label}
        {required && (
          <span className="text-fb-orange" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </span>
      <div
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(option)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange ${
                isSelected
                  ? 'border-fb-orange bg-fb-orange text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-fb-accent hover:text-gray-900'
              }`}
            >
              {isSelected && <CheckIcon />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
