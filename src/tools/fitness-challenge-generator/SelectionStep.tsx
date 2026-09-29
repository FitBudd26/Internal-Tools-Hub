import { MultiSelectChips } from '../../shared/components/MultiSelectChips';
import { SingleSelectChips } from '../../shared/components/SingleSelectChips';
import {
  AUDIENCE_TYPES,
  CHALLENGE_TYPES,
  DURATIONS,
  EQUIPMENT_OPTIONS,
  FITNESS_LEVELS,
  MEASUREMENT_OPTIONS,
  type ChallengeInput,
} from './types';

interface SelectionStepProps {
  /** 1 = what/who/level, 2 = duration/equipment/measurements. */
  part: 1 | 2;
  input: ChallengeInput;
  onChange: (next: ChallengeInput) => void;
}

/** Challenge setup inputs, split over two compact screens to avoid scrolling. */
export function SelectionStep({ part, input, onChange }: SelectionStepProps) {
  const set = <K extends keyof ChallengeInput>(key: K, value: ChallengeInput[K]) =>
    onChange({ ...input, [key]: value });

  if (part === 1) {
    return (
      <>
        <MultiSelectChips
          label="What kind of challenge do you want to create?"
          required
          options={CHALLENGE_TYPES}
          selected={input.challengeTypes}
          onChange={(v) => set('challengeTypes', v)}
        />
        <MultiSelectChips
          label="Who is this challenge for?"
          required
          options={AUDIENCE_TYPES}
          selected={input.audienceTypes}
          onChange={(v) => set('audienceTypes', v)}
        />
        <MultiSelectChips
          label="Applicable fitness levels"
          required
          options={FITNESS_LEVELS}
          selected={input.fitnessLevels}
          onChange={(v) => set('fitnessLevels', v)}
        />
      </>
    );
  }

  return (
    <>
      <SingleSelectChips
        label="How long should the challenge run?"
        required
        options={DURATIONS}
        selected={input.duration}
        onChange={(v) => set('duration', v)}
      />
      <MultiSelectChips
        label="Available equipment"
        required
        options={EQUIPMENT_OPTIONS}
        selected={input.equipment}
        onChange={(v) => set('equipment', v)}
      />
      <MultiSelectChips
        label="Measurement preferences"
        required
        options={MEASUREMENT_OPTIONS}
        selected={input.measurements}
        onChange={(v) => set('measurements', v)}
      />
    </>
  );
}
