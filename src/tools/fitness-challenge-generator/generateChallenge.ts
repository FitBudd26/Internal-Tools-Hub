import type {
  AudienceType,
  Challenge,
  ChallengeInput,
  ChallengeType,
  DailyRule,
  PdfSection,
  WeeklyTheme,
} from './types';

/**
 * Deterministic, client-side challenge framework generator.
 *
 * A challenge here is a set of rules, behaviours, targets, accountability
 * mechanics, weekly themes and scoring that layers on top of a coach's
 * existing program. It never prescribes exercises, sets, reps or daily
 * workouts. Same inputs always produce the same framework.
 */

function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const NAMES: Record<ChallengeType, string[]> = {
  'Fat Loss': ['Metabolic Ignite Challenge', 'Lean Momentum Challenge', 'Metabolic Reset Challenge'],
  'Muscle Building': ['Build Season Challenge', 'Progressive Gains Challenge', 'Lean Mass Standard Challenge'],
  'Habit Building': ['Strong Habits Challenge', 'Performance Habits Challenge', 'Habit Foundations Challenge'],
  'Consistency / Accountability': [
    'Consistency Builder Challenge',
    'The {N}-Day Accountability Sprint',
    'The Client Compliance Challenge',
  ],
  Strength: ['Strength Standard Challenge', 'Strength Habits Challenge', 'The Progressive Strength Challenge'],
  Conditioning: ['Conditioning Edge Challenge', 'Engine Builder Challenge', 'Work Capacity Challenge'],
  'Mobility & Recovery': ['Mobility Reset Challenge', 'Recovery & Readiness Challenge', 'Move Well Challenge'],
  'Lifestyle / Wellness': ['Balanced Living Challenge', 'Daily Wellness Standard Challenge', 'Whole-Life Habits Challenge'],
  'Community Engagement': ['The Member Momentum Challenge', 'Community Streak Challenge', 'Team Accountability Challenge'],
};

const FOCUS: Record<ChallengeType, string> = {
  'Fat Loss': 'Metabolic Compliance',
  'Muscle Building': 'Training & Nutrition Consistency',
  'Habit Building': 'Habit Compliance',
  'Consistency / Accountability': 'Accountability',
  Strength: 'Strength Standards',
  Conditioning: 'Conditioning',
  'Mobility & Recovery': 'Mobility & Recovery',
  'Lifestyle / Wellness': 'Lifestyle Compliance',
  'Community Engagement': 'Community Accountability',
};

const OBJECTIVE: Record<ChallengeType, string> = {
  'Fat Loss': 'improve metabolic efficiency, nutrition compliance and recovery',
  'Muscle Building': 'protect training consistency, protein intake and recovery so muscle-building work compounds',
  'Habit Building': 'install the daily non-negotiables that make results stick',
  'Consistency / Accountability': 'show up daily and log it, so adherence becomes the metric that matters',
  Strength: 'protect training frequency, effort quality and recovery around your existing strength program',
  Conditioning: 'build weekly work capacity through movement targets and effort awareness',
  'Mobility & Recovery': 'turn mobility, sleep and stress management into daily habits that improve readiness',
  'Lifestyle / Wellness': 'balance movement, nutrition, sleep and stress with simple daily standards',
  'Community Engagement': 'turn participation into a shared game with streaks, check-ins and recognition',
};

const HABIT_LABEL: Record<ChallengeType, string> = {
  'Fat Loss': 'metabolic',
  'Muscle Building': 'nutrition & recovery',
  'Habit Building': 'keystone',
  'Consistency / Accountability': 'accountability',
  Strength: 'performance',
  Conditioning: 'conditioning',
  'Mobility & Recovery': 'recovery',
  'Lifestyle / Wellness': 'wellness',
  'Community Engagement': 'community',
};

const HABITS: Record<ChallengeType, string[]> = {
  'Fat Loss': ['Protein-first meal', 'No liquid calories', 'Water target: about 3 L (100 oz)', 'No ultra-processed snacks'],
  'Muscle Building': ['Protein at every meal', "Hit the day's protein target", 'A meal within two hours after training', '7+ hours of sleep'],
  'Habit Building': ['Complete your one keystone habit (chosen on day 1)', 'Prepare tomorrow the night before', 'Two-minute rule: start, even on low-energy days'],
  'Consistency / Accountability': ['Log the day before 9 pm', "Plan tomorrow's session time", 'Tell your accountability partner you are done'],
  Strength: ['Log RPE for your main work', 'No skipped warm-ups', '7+ hours of sleep', 'Protein at every meal'],
  Conditioning: ['One steady-state movement block (20-30 min)', 'Note heart rate or RPE after sessions', 'Hydrate before and after training'],
  'Mobility & Recovery': ['10-minute mobility block', '7+ hours of sleep', 'Stress score (1-10) logged', 'Screen-free 30 minutes before bed'],
  'Lifestyle / Wellness': ['10 minutes outside', 'Screen-free hour before bed', 'Water target: about 2-3 L (70-100 oz)', 'One home-cooked meal'],
  'Community Engagement': ['Post your check-in in the group', 'Encourage one other participant', 'Share one win from the day'],
};

type Group = 'clients' | 'members' | 'community' | 'workplace' | 'social';

const AUDIENCE_GROUP: Record<AudienceType, Group> = {
  '1-on-1 Clients': 'clients',
  'Group Coaching Clients': 'clients',
  'Gym Members': 'members',
  'Studio Members': 'members',
  'Online Community': 'community',
  'Corporate / Workplace Groups': 'workplace',
  'Social Media Audience': 'social',
};

const GROUP_LABEL: Record<Group, string> = {
  clients: 'Coaching Clients',
  members: 'Gym & Studio Members',
  community: 'Online Communities',
  workplace: 'Workplace Teams',
  social: 'Your Social Audience',
};

const GROUP_NOUN: Record<Group, string> = {
  clients: 'clients',
  members: 'members',
  community: 'community members',
  workplace: 'participants',
  social: 'participants',
};

const LOADED_EQUIPMENT = new Set<string>(['Dumbbells', 'Barbell', 'Machines', 'Kettlebells', 'Mixed Equipment']);

function unitLabel(selected: readonly string[], metric: string, imperial: string, m: string, i: string): string | null {
  const hasM = selected.includes(metric);
  const hasI = selected.includes(imperial);
  return hasM && hasI ? `${m} / ${i}` : hasM ? m : hasI ? i : null;
}

function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const present = <T,>(items: (T | null | false | undefined)[]): T[] =>
  items.filter((x): x is T => Boolean(x));

/** How many weekly themes a challenge of this length has. */
export function weeksFor(days: number): number {
  return days <= 7 ? 1 : days <= 14 ? 2 : days <= 21 ? 3 : 4;
}

/** Workout programming the generator must never contain (also used to gate model output). */
export const PROGRAMMING_RE = /\b(reps?|sets|squats?|push-?ups?|burpees?|deadlifts?|bench press|lunges?|pull-?ups?|planks?|lose weight fast|burn fat|miracle)\b/i;

/** Ordered PDF sections built from the framework fields (shared by both generation paths). */
export function buildPdfSections(c: Omit<Challenge, 'pdfSections'>): PdfSection[] {
  const focus = c.subtitle.replace(/^\d+-Day\s+/i, '').replace(/\s+Challenge for .*$/i, '');
  const overview = `A ${c.durationDays}-day ${focus.toLowerCase()} challenge for ${c.designedFor.toLowerCase()}: ${c.dailyRules.length} daily non-negotiables, ${c.weeklyThemes.length === 1 ? 'one theme' : `${c.weeklyThemes.length} weekly themes`}, an optional scoring system and a day-by-day check-in tracker. It layers on top of your existing training program, with no programming changes required.`;
  return [
    { heading: 'Challenge Overview', paragraphs: [overview] },
    { heading: 'Designed For', paragraphs: [c.designedFor, `Level: ${c.level}`] },
    { heading: 'Duration', paragraphs: [c.duration] },
    { heading: 'Objective', paragraphs: [c.objective] },
    { heading: 'How It Works', paragraphs: [c.howItWorks, 'Participants must complete all required actions to mark a day as complete.'] },
    { heading: 'Daily Challenge Rules', numbered: c.dailyRules },
    { heading: 'Weekly Plan', bullets: c.weeklyThemes.map((t) => `${t.label}: ${t.name}. Focus: ${t.focus}. Coach tip: ${t.coachTip}`) },
    { heading: 'Client Instructions', paragraphs: c.clientInstructions },
    { heading: 'Progress Tracking', bullets: c.progressTracking },
    { heading: 'Check-in Tracker', tracker: true },
    { heading: 'Coach Notes', bullets: c.coachingNotes },
    { heading: 'Scoring System (Optional)', bullets: c.scoringSystem },
  ];
}

export function weeklyThemes(days: number, primary: ChallengeType, community: boolean, mixed: boolean): WeeklyTheme[] {
  const baseline = {
    name: 'Consistency & Baseline',
    focus: 'Showing up daily and logging it',
    coachTip: 'Emphasise "don\'t break the chain": completion beats intensity in week one.',
  };
  const quality =
    primary === 'Community Engagement' || (community && primary === 'Consistency / Accountability')
      ? { name: 'Group Momentum', focus: 'Visible participation', coachTip: 'Pair people up and post the first leaderboard.' }
      : primary === 'Mobility & Recovery' || primary === 'Lifestyle / Wellness'
        ? { name: 'Recovery Habits', focus: 'Sleep, mobility and stress', coachTip: 'Normalise recovery as performance, not time off.' }
        : primary === 'Habit Building' || primary === 'Consistency / Accountability'
          ? { name: 'Habit Stacking', focus: 'Attaching the new actions to existing routines', coachTip: 'Ask each participant exactly when and where the habit happens.' }
          : {
              name: 'Intensity Awareness',
              focus: 'Effort quality in every session',
              coachTip: mixed ? 'Use RPE tracking instead of load chasing; keep effort cues relative, never absolute.' : 'Use RPE tracking instead of load chasing.',
            };
  const sustain =
    quality.name === 'Recovery Habits'
      ? { name: 'Progress Check', focus: 'Reviewing trends, not single days', coachTip: "Share each participant's completion percentage so far." }
      : { name: 'Recovery & Sustainability', focus: 'Sleep, mobility and stress management', coachTip: 'Normalise recovery as performance.' };
  const peak = { name: 'Peak Compliance', focus: 'Completion streaks', coachTip: 'Use public recognition and shoutouts.' };

  if (days <= 7) {
    return [{ label: 'Days 1-7', name: 'Consistency Sprint', focus: 'Seven straight completed days', coachTip: 'Daily reminders matter more than motivation speeches.' }];
  }
  if (days <= 14) return [{ label: 'Week 1', ...baseline }, { label: 'Week 2', ...peak }];
  if (days <= 21) return [{ label: 'Week 1', ...baseline }, { label: 'Week 2', ...quality }, { label: 'Week 3', ...peak }];
  return [
    { label: 'Week 1', ...baseline },
    { label: 'Week 2', ...quality },
    { label: 'Week 3', ...sustain },
    { label: days > 28 ? `Days 22-${days}` : 'Week 4', ...peak },
  ];
}

export function generateChallenge(input: ChallengeInput): Challenge {
  const types: ChallengeType[] = input.challengeTypes.length ? input.challengeTypes : ['Consistency / Accountability'];
  const primary = types[0];
  const days = parseInt(input.duration ?? '28', 10) || 28;
  const seed = hashString(
    JSON.stringify([types, input.audienceTypes, input.fitnessLevels, days, input.equipment, input.measurements]),
  );

  const groups = [...new Set(input.audienceTypes.map((a) => AUDIENCE_GROUP[a]))];
  const has = (g: Group) => groups.includes(g);
  const community = types.includes('Community Engagement') || has('community');
  const workplace = has('workplace');
  const social = has('social');
  const mixed = input.fitnessLevels.includes('Mixed Levels') || input.fitnessLevels.length > 1;
  const beginnerOnly = input.fitnessLevels.length === 1 && input.fitnessLevels[0] === 'Beginner';
  const loads = input.equipment.some((e) => LOADED_EQUIPMENT.has(e));
  const noKit =
    input.equipment.length > 0 && input.equipment.every((e) => e === 'No Equipment' || e === 'Bodyweight Only');
  const noun = GROUP_NOUN[groups[0] ?? 'clients'];
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const habitLabel = HABIT_LABEL[primary];

  const nameTemplates = NAMES[primary];
  const challengeName = nameTemplates[seed % nameTemplates.length].replace('{N}', String(days));
  const focus = [...new Set(types.slice(0, 2).map((t) => FOCUS[t]))].join(' & ');
  const forLabel = (groups.length ? groups : ['clients' as Group]).slice(0, 2).map((g) => GROUP_LABEL[g]).join(' & ');
  const subtitle = `${days}-Day ${focus} Challenge for ${forLabel}`;

  const objective = `Help ${noun} ${joinClauses(types.slice(0, 2).map((t) => OBJECTIVE[t]))} by completing daily non-negotiable actions, without replacing their existing training program.`;

  const howItWorks = present([
    `${Noun} earn a daily completion score by finishing the required actions below. No programming changes required: this challenge layers on top of your current training plan.`,
    community && 'Group visibility does the motivating: streaks, check-ins and shoutouts are part of the design.',
    workplace && 'Participation is deliberately simple so completion rates stay high across mixed schedules and fitness backgrounds.',
    social && 'Every task doubles as a public prompt, so participation creates reach and inbound leads.',
  ]).join(' ');

  // Habit check: two per selected type, four at most, topped up from the primary type.
  const habits: string[] = [];
  for (const t of types) for (const h of HABITS[t].slice(0, 2)) if (!habits.includes(h) && habits.length < 4) habits.push(h);
  for (const h of HABITS[primary]) if (!habits.includes(h) && habits.length < 3) habits.push(h);

  const movementTarget = beginnerOnly ? '6,000-8,000 steps' : '8,000-10,000 steps';
  const dailyRules: DailyRule[] = [
    {
      title: 'Complete the assigned training session',
      details: present([
        'Coach-programmed or self-led (the challenge stays workout-agnostic)',
        'Planned rest days count as complete when the plan says rest',
        mixed && 'Scale to the plan you are on: completion counts, not intensity',
      ]),
    },
    {
      title: 'Hit the daily movement target',
      details: present([
        `${movementTarget}, or 20-30 minutes of steady movement on non-training days`,
        mixed && 'Choose a personal target inside the range on day 1 and keep it for the whole challenge',
        workplace && 'Walking meetings and commute steps count',
      ]),
    },
    { title: `Complete one ${habitLabel} habit check`, details: habits },
    {
      title: 'Accountability check-in',
      details: [
        community || social
          ? 'Post your check-in where the group can see it (app, community or story)'
          : workplace
            ? 'Mark the day complete on the team tracker'
            : 'Log completion in the app or form',
        'Rate energy 1-10 (and note sleep hours if you track them)',
      ],
    },
  ];

  const themes = weeklyThemes(days, primary, community, mixed);

  const scoringSystem = present([
    'Daily completion = 1 point',
    'Perfect week (every day complete) = +3 bonus points',
    'No-miss streak of 7+ days = +5 points',
    workplace
      ? 'Report team completion rate (%) each week rather than individual rankings'
      : community
        ? 'Group leaderboard: post the top 5 and the most-improved every week'
        : 'Optional leaderboard for groups',
    social && 'Public check-in counts as completion; tagging a friend earns +1',
  ]);

  const weightUnit = unitLabel(input.measurements, 'Kilograms (kg)', 'Pounds (lb)', 'kg', 'lb');
  const lengthUnit = unitLabel(input.measurements, 'Centimeters (cm)', 'Inches (in)', 'cm', 'in');
  const bodyComp = types.some((t) => t === 'Fat Loss' || t === 'Muscle Building' || t === 'Lifestyle / Wellness');
  const progressTracking = present([
    'Daily completion: Yes / No',
    'Weekly completion percentage',
    'Step or movement-minute averages',
    'Energy and fatigue trends (1-10)',
    weightUnit &&
      (bodyComp
        ? `Body weight (${weightUnit}), same day and time each week`
        : `Optional: body weight (${weightUnit}) if relevant to the participant's goals`),
    lengthUnit && bodyComp && `Waist and hip measurements (${lengthUnit}), every two weeks`,
    loads &&
      types.some((t) => t === 'Strength' || t === 'Muscle Building') &&
      `Top working loads for main lifts (${weightUnit ?? 'kg / lb'}): watch the trend, not records`,
    types.some((t) => t === 'Mobility & Recovery' || t === 'Lifestyle / Wellness') &&
      'Sleep hours and a morning readiness score (1-10)',
    bodyComp && 'Before/after photos if appropriate for the participant',
  ]);

  const coachingNotes = present([
    'Works with any training split or class schedule',
    mixed
      ? 'Every rule scales across levels: completion is the standard, not intensity'
      : 'Rules are written for one level; tighten targets if the group is stronger than expected',
    'Encourages daily engagement without extra programming work',
    'Runs well inside a branded coaching app: daily tasks, check-ins and streaks in one place',
    noKit
      ? 'Needs no equipment, which suits remote clients, workplace groups and travel weeks'
      : 'Equipment only affects what you track (for example loads), never whether someone can take part',
    community && 'Run a leaderboard and post weekly shoutouts; recognition beats reminders',
    workplace && 'Keep it simple: one tracker, one weekly summary email, one closing recognition',
    social && 'Use each daily rule as a public prompt and ask participants to tag you. It is a lead-generation asset',
    has('members') && 'Post the weekly theme on the floor and in your app so members see it every visit',
  ]);

  const clientInstructions = [
    `Welcome to the ${challengeName}. For the next ${days} days you complete four simple actions every day, on top of your normal training.`,
    `Each day: finish your session, hit your movement target, tick your ${habitLabel} habit check, and log your check-in before bed.`,
    'Every week has a focus (see the weekly plan). Read it on day one of the week: it tells you what to pay attention to.',
    'Miss a day? Restart your streak the next morning. The goal is consistency, not perfection.',
    community || social
      ? 'Check in where everyone can see it. Your visible streak helps the whole group.'
      : 'Your coach sees your log; ask questions early rather than skipping days.',
  ];

  const designedFor = input.audienceTypes.join(', ') || 'Coaching clients';
  const level = input.fitnessLevels.join(', ') || 'All levels';
  const duration = `${days} Days`;

  const core = {
    challengeName,
    subtitle,
    designedFor,
    level,
    duration,
    durationDays: days,
    objective,
    howItWorks,
    dailyRules,
    weeklyThemes: themes,
    scoringSystem,
    progressTracking,
    coachingNotes,
    clientInstructions,
  };
  return { ...core, pdfSections: buildPdfSections(core) };
}

/** `Metabolic Ignite Challenge` → `metabolic-ignite-challenge` (for file names). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'fitbudd-fitness-challenge';
}
