import type { Exercise, Goal, Guidance, OneRmResult, PlanWeek, WarmupStep } from './types';
import { formatWeight } from './calculate';

/**
 * Built-in training guidance, the fallback behind Gemini (see
 * aiGuidance.ts). Like the model's answer it speaks in percentages of the
 * max; the tool turns them into weights.
 */

const PLANS: Record<Goal, PlanWeek[]> = {
  Strength: [
    { week: 1, focus: 'Volume base', sets: 4, reps: '6', percent: 75, note: 'Every rep should look the same. Stop the set if bar speed drops sharply.' },
    { week: 2, focus: 'Build', sets: 4, reps: '5', percent: 80, note: 'Same technique with more load. Rest 2 to 3 minutes between sets.' },
    { week: 3, focus: 'Heavy triples', sets: 5, reps: '3', percent: 85, note: 'The heaviest week. Leave one good rep in reserve on every set.' },
    { week: 4, focus: 'Deload', sets: 3, reps: '5', percent: 70, note: 'Less load, crisp reps. Retest with a set of 3 to 5 next week.' },
  ],
  'Muscle Building': [
    { week: 1, focus: 'Volume base', sets: 4, reps: '10', percent: 67.5, note: 'Control the lowering for 2 to 3 seconds on every rep.' },
    { week: 2, focus: 'Build', sets: 4, reps: '8', percent: 72.5, note: 'Finish each set with 1 or 2 reps in reserve.' },
    { week: 3, focus: 'Overreach', sets: 5, reps: '8', percent: 75, note: 'One more set than last week. Rest 60 to 90 seconds.' },
    { week: 4, focus: 'Deload', sets: 3, reps: '10', percent: 62.5, note: 'Half the effort, full range. Let the joints recover.' },
  ],
  Endurance: [
    { week: 1, focus: 'Base', sets: 3, reps: '15', percent: 60, note: 'Steady tempo, breathe every rep, rest 45 to 60 seconds.' },
    { week: 2, focus: 'Build', sets: 3, reps: '15', percent: 62.5, note: 'Same reps with a little more load. Keep the rest short.' },
    { week: 3, focus: 'Density', sets: 4, reps: '15', percent: 65, note: 'An extra set. Technique must hold in the last five reps.' },
    { week: 4, focus: 'Deload', sets: 2, reps: '15', percent: 55, note: 'Easy week. Move well and recover.' },
  ],
  'General Fitness': [
    { week: 1, focus: 'Groove the lift', sets: 3, reps: '8', percent: 70, note: 'Smooth, repeatable reps. Finish with 2 or 3 in reserve.' },
    { week: 2, focus: 'Build', sets: 3, reps: '8', percent: 72.5, note: 'A small jump in load with the same reps.' },
    { week: 3, focus: 'Heavier sets', sets: 4, reps: '6', percent: 77.5, note: 'Fewer reps, more load. Rest about 2 minutes.' },
    { week: 4, focus: 'Deload', sets: 2, reps: '8', percent: 65, note: 'Lighter week before the next block starts.' },
  ],
};

/** A ramp to the first working set of each plan. */
const WARMUPS: Record<Goal, WarmupStep[]> = {
  Strength: [{ percent: 40, reps: 8 }, { percent: 50, reps: 5 }, { percent: 60, reps: 3 }, { percent: 70, reps: 2 }],
  'Muscle Building': [{ percent: 35, reps: 10 }, { percent: 45, reps: 6 }, { percent: 55, reps: 4 }, { percent: 62.5, reps: 2 }],
  Endurance: [{ percent: 30, reps: 12 }, { percent: 40, reps: 8 }, { percent: 50, reps: 5 }],
  'General Fitness': [{ percent: 35, reps: 8 }, { percent: 50, reps: 5 }, { percent: 60, reps: 3 }],
};

const TIPS: Record<Exercise, string[]> = {
  'Bench Press': [
    'Set the shoulder blades back and down before the bar leaves the rack, and keep them there.',
    'Touch the same spot on the chest every rep; a moving touch point means the load is too heavy.',
    'Use a spotter or safety arms for any set above 85 percent.',
  ],
  Squat: [
    'Brace before you unrack and again at the top of every rep.',
    'Hit the same depth on every rep; count only the reps that reach it.',
    'Set the safety pins just below the bottom position before heavy sets.',
  ],
  Deadlift: [
    'Pull the slack out of the bar before it leaves the floor.',
    'Reset on the floor between reps on heavy sets rather than bouncing the plates.',
    'End the set when the lower back starts to round, whatever the plan says.',
  ],
  'Overhead Press': [
    'Squeeze the glutes and keep the ribs down so the lower back does not arch.',
    'Press in a straight line and move the head through once the bar passes the forehead.',
    'This lift progresses slowly: add the smallest plates you have.',
  ],
  'Barbell Row': [
    'Hold the torso angle fixed; if the chest rises to finish a rep, the load is too heavy.',
    'Pull to the lower ribs and pause for a moment at the top.',
    'Rows estimate less reliably than presses and squats, so treat the max as a guide.',
  ],
  Other: [
    'Use the same setup, range and tempo every session so the numbers stay comparable.',
    'Retest with a set of 3 to 6 reps every four to six weeks.',
    'Stop a set when technique changes, not when the rep count is reached.',
  ],
};

function summaryFor(result: OneRmResult): string {
  const { input, oneRm, low, high, alreadyMax } = result;
  const unit = input.unit;
  const lift = input.exercise === 'Other' ? 'This lift' : `This ${input.exercise.toLowerCase()}`;
  if (alreadyMax) return `${lift} is a true max of ${formatWeight(oneRm)} ${unit}, not an estimate. Program from it directly and retest every four to six weeks.`;
  const spread = low === high ? `all six formulas agree on ${formatWeight(oneRm)} ${unit}` : `the six formulas put it between ${formatWeight(low)} and ${formatWeight(high)} ${unit}`;
  if (input.reps > 10) return `${lift} estimate is ${formatWeight(oneRm)} ${unit}, and ${spread}. Sets above 10 reps estimate less reliably, so confirm it with a set of 3 to 6 reps before programming heavy work.`;
  return `${lift} estimate is ${formatWeight(oneRm)} ${unit}, and ${spread}. A set of ${input.reps} reps is inside the range where estimates are most reliable, so it is safe to program from.`;
}

export function generateGuidance(result: OneRmResult): Guidance {
  const goal: Goal = result.input.goal ?? 'Strength';
  return {
    summary: summaryFor(result),
    warmup: WARMUPS[goal].map((s) => ({ ...s })),
    plan: PLANS[goal].map((w) => ({ ...w })),
    tips: [...TIPS[result.input.exercise]],
  };
}
