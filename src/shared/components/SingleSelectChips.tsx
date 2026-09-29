import { MultiSelectChips } from './MultiSelectChips';

interface SingleSelectChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T | null;
  onChange: (value: T | null) => void;
  required?: boolean;
}

/** Chip group where only one option can be active (built on MultiSelectChips). */
export function SingleSelectChips<T extends string>({
  label,
  options,
  selected,
  onChange,
  required,
}: SingleSelectChipsProps<T>) {
  return (
    <MultiSelectChips
      label={label}
      options={options}
      selected={selected ? [selected] : []}
      required={required}
      onChange={(next) => {
        // Toggling the active chip clears it; picking another replaces it.
        const added = next.find((v) => v !== selected);
        onChange(added ?? (next.length ? next[0] : null));
      }}
    />
  );
}
