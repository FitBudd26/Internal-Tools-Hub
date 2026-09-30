import type { Exercise } from './types';

/** "3" + "10" reads "3 sets · 10 reps"; "3 rounds" + "40s work" is left as written. */
export function exerciseMeta(ex: Exercise, separator = ' · '): string {
  const count = (value: string, unit: string) => (/^\d+(-\d+)?$/.test(value.trim()) ? `${value.trim()} ${unit}` : value.trim());
  return [count(ex.sets, 'sets'), count(ex.reps, 'reps'), `Rest ${ex.rest}`, ex.tempo ? `Tempo ${ex.tempo}` : ''].filter(Boolean).join(separator);
}
