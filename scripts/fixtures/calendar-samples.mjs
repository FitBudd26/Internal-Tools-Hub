/**
 * Hand-written calendars in the shape the generation route returns, used only
 * by scripts/calendar-export-check.mjs to exercise the PDF, CSV and .ics
 * exports (3, 10 and 30 posts, two platforms with adaptations, long captions,
 * special characters, formula-looking cells). Test data only, never shipped.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n) => String(n).padStart(2, '0');
function dates(start, days, pattern) {
  const [y, m, d] = start.split('-').map(Number);
  const out = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i, 12);
    if (pattern.includes(dt.getDay())) out.push({ date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`, day: WEEKDAYS[dt.getDay()] });
  }
  return out;
}
const PILLARS = ['Educational', 'Engagement', 'Authority', 'Promotional'];
const FORMATS = { Instagram: ['Reel', 'Carousel', 'Static Image'], Facebook: ['Static Image', 'Text Post', 'Short Video'], LinkedIn: ['Text Post', 'Carousel'] };

function post(i, { date, day }, platforms, long = false) {
  const platform = platforms[i % platforms.length];
  const others = platforms.filter((p) => p !== platform);
  const pillar = PILLARS[i % 4];
  const caption = long
    ? `Paragraph one of a long caption number ${i + 1} explaining a specific idea in detail so that the export has to wrap and flow it across lines without clipping anything.\n\nParagraph two adds a concrete example: 3 sets of 8 reps at a weight you can control, then 2 minutes of rest.\n\nParagraph three closes with a question, a "quote", a 50% claim-free note and a comma, then the CTA.`
    : `Short caption ${i + 1}: one useful idea, one example, one question.\n\nWhich one will you try this week?`;
  return {
    id: `post_${pad(i + 1).padStart(3, '0')}`,
    date,
    day,
    platforms: [platform, ...others.slice(0, 1)],
    pillar,
    format: FORMATS[platform][i % FORMATS[platform].length],
    topic: i === 2 ? '=SUM(A1:A3) looks like a formula and must stay text' : `Topic ${i + 1}: a specific angle for ${platform} about ${pillar.toLowerCase()} content`,
    hook: i === 1 ? '+1 reason your warm-up is "too short", with a comma, and a café' : `Hook ${i + 1}: why this matters more than you think`,
    caption,
    creativeDirection: `Creative direction ${i + 1}: film a 20 second clip, overlay the hook, finish with the CTA on screen.`,
    cta: ['Save this for your next session.', 'Comment with your answer.', 'Send me a message to talk it through.', 'Book a visit this week.'][i % 4],
    hashtags: platform === 'Facebook' ? [] : ['#FitnessCoach', '#StrengthTraining', `#Post${i + 1}`],
    productionNotes: 'Natural light, phone on a tripod, vertical.',
    status: 'draft',
    adaptations: others.slice(0, 1).map((p) => ({ platform: p, format: FORMATS[p][0], hook: `${p} hook ${i + 1}`, caption: `${p} version ${i + 1}: the same idea rewritten for ${p}, shorter and more conversational.` })),
  };
}

function calendar(key, start, days, pattern, platforms, long = false, over = {}) {
  const slots = dates(start, days, pattern);
  const posts = slots.map((s, i) => post(i, s, platforms, long));
  const end = slots.length ? (() => { const [y, m, d] = start.split('-').map(Number); const dt = new Date(y, m - 1, d + days - 1, 12); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; })() : start;
  return {
    calendarTitle: `${days}-Day Fitness Content Calendar`,
    businessType: 'Personal Trainer',
    niches: ['Strength Training'],
    durationDays: days,
    postsPerWeek: pattern.length,
    startDate: start,
    endDate: end,
    timezone: 'Europe/London',
    language: 'English',
    tone: 'Friendly',
    contentStrategy: {
      primaryGoal: 'Generate More Leads',
      goals: ['Generate More Leads'],
      targetAudience: ['Busy Professionals'],
      platforms,
      contentPillars: PILLARS.map((name) => ({ name, targetPercentage: 25, plannedPosts: posts.filter((p) => p.pillar === name).length })),
      summary: 'A fixture calendar that exercises every export path.',
    },
    posts,
    unfilled: 0,
    ...over,
  };
}

export const SAMPLES = {
  week3: () => calendar('week3', '2026-11-04', 7, [1, 3, 5], ['Instagram']),
  twoWeeks10: () => calendar('twoWeeks10', '2026-11-09', 14, [1, 2, 3, 4, 5], ['Instagram', 'Facebook']),
  month30Long: () => calendar('month30Long', '2026-11-29', 30, [0, 1, 2, 3, 4, 5, 6], ['Instagram', 'LinkedIn'], true),
};
