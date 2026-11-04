/**
 * Acceptance test for the Fitness Content Calendar Generator's Gemini route.
 *
 *   BASE=http://localhost:5173 node scripts/calendar-acceptance.mjs [out-dir] [start-date]
 *
 * Posts the spec's three scenarios to BASE/api/generate-calendar (the dev
 * server with GEMINI_API_KEY in .env, or a deployment) and runs the calendar
 * accuracy checks on each answer: the post count matches the duration and
 * frequency, every date sits in the window on a posting weekday with the
 * right weekday name, no duplicate ids or dates, every post is complete
 * (topic, hook, caption, creative direction, CTA, format), every selected
 * platform is used and nothing else, hashtags only where the platform allows,
 * no banned phrases, no invented promotions, business-relevant vocabulary,
 * every pillar represented, varied hooks and CTAs. Each calendar is saved as
 * JSON in out-dir so scripts/calendar-export-check.mjs can build the real
 * PDF, CSV and .ics files from them.
 * Exit 0 pass · 1 fail · 2 route not configured (no Gemini key).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = (process.env.BASE ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = resolve(process.argv[2] ?? '.acceptance-calendar');
mkdirSync(outDir, { recursive: true });
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const START = process.argv[3] ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const POSTING_DAYS = { '3 Posts Per Week': [1, 3, 5], '4 Posts Per Week': [1, 2, 4, 5], '5 Posts Per Week': [1, 2, 3, 4, 5], Daily: [0, 1, 2, 3, 4, 5, 6] };
const DURATION_DAYS = { '7 Days': 7, '14 Days': 14, '30 Days': 30 };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function expectedDates(start, days, frequency) {
  const out = [];
  for (let i = 0; i < days; i++) { const d = parse(start); d.setDate(d.getDate() + i); if (POSTING_DAYS[frequency].includes(d.getDay())) out.push(iso(d)); }
  return out;
}
const BANNED = /unlock your potential|best version of yourself|transform your life|crush your (fitness )?goals|fitness is a journey|no excuses/i;
const PROMO = /\b\d+%\s*off\b|\bdiscount\b|\bpromo code\b|\bcoupon\b|\blimited[- ]time offer\b|\bflash sale\b|\bfree trial\b|\bfree week\b|\bfree class\b/i;
const NO_HASHTAG = new Set(['Threads']);

const SCENARIOS = [
  {
    key: '1-personal-trainer-14d',
    label: 'Test 1: Personal Trainer · Strength Training · Busy Professionals · Instagram · Generate More Leads · 14 days · 5/week',
    body: { businessType: 'Personal Trainer', niches: ['Strength Training'], audiences: ['Busy Professionals'], platforms: ['Instagram'], goals: ['Generate More Leads'], duration: '14 Days', frequency: '5 Posts Per Week' },
    relevant: /strength|lift|squat|deadlift|press|barbell|dumbbell|load|reps?|sets?|progressive|technique|form\b/i,
    audience: /busy|schedule|work|time|desk|meeting|commute|lunch|professional|week/i,
    leadCta: /\bdm\b|message|apply|book|consult|link in bio|call|reply|inbox|enquir|get in touch|reach out/i,
    minLeadCtas: 3,
    forbid: [['bodybuilding competition content', /posing|bodybuilding show|stage ready/i]],
  },
  {
    key: '2-gym-owner-30d',
    label: 'Test 2: Gym Owner · General Fitness · Gym Beginners · Instagram + Facebook · Promote Gym Memberships · 30 days · 4/week',
    body: { businessType: 'Gym Owner', niches: ['General Fitness'], audiences: ['Gym Beginners'], platforms: ['Instagram', 'Facebook'], goals: ['Promote Gym Memberships'], duration: '30 Days', frequency: '4 Posts Per Week' },
    relevant: /gym|member|class|trainer|community|facility|equipment|floor|visit|join/i,
    audience: /beginner|first (time|week|day|visit)|new to|nervous|intimidat|start/i,
    leadCta: /visit|tour|book|join|message|dm|drop by|come in|class/i,
    minLeadCtas: 3,
    forbid: [['invented membership promotion', PROMO]],
  },
  {
    key: '3-yoga-7d',
    label: 'Test 3: Yoga Instructor · Yoga + Mobility & Recovery · Beginners · Instagram · Build Brand Awareness · 7 days · 3/week',
    body: { businessType: 'Yoga Instructor', niches: ['Yoga', 'Mobility & Recovery'], audiences: ['Beginners'], platforms: ['Instagram'], goals: ['Build Brand Awareness'], duration: '7 Days', frequency: '3 Posts Per Week' },
    relevant: /yoga|mobility|pose|breath|stretch|flow|mat|practice|hip|spine|flexib/i,
    audience: /beginner|first|new|gentle|start|simple|easy/i,
    leadCta: null,
    minLeadCtas: 0,
    forbid: [['bodybuilding or heavy-lifting content', /bodybuild|deadlift|bench press|bulk|hypertrophy|barbell/i]],
  },
];

let failures = 0;
const results = [];
for (const s of SCENARIOS) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/generate-calendar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...s.body, startDate: START, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
  } catch (err) {
    console.error(`${s.key}: request failed (${err.message}). Is the dev server running at ${BASE}?`);
    process.exit(1);
  }
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  if (res.status === 503) {
    console.error('Route not configured: set GEMINI_API_KEY (in .env for npm run dev, or on Vercel).');
    process.exit(2);
  }
  if (!res.ok) {
    failures += 1;
    console.error(`FAIL ${s.key}: HTTP ${res.status} ${JSON.stringify(data)} after ${ms} ms`);
    continue;
  }
  const c = data.calendar;
  const problems = [];
  const expected = expectedDates(START, DURATION_DAYS[s.body.duration], s.body.frequency);
  const posts = c.posts;
  console.log(`\n== ${s.label} (${ms} ms, ${data.calls} model call(s), ${posts.length} posts, ${c.unfilled} unfilled)`);
  if (c.unfilled > 0) problems.push(`${c.unfilled} slot(s) unfilled`);
  if (posts.length !== expected.length) problems.push(`${posts.length} posts, expected ${expected.length} for ${s.body.duration} at ${s.body.frequency}`);
  if (posts.map((p) => p.date).join() !== expected.join()) problems.push(`dates differ from the schedule: ${posts.map((p) => p.date).join(',')} vs ${expected.join(',')}`);
  if (new Set(posts.map((p) => p.id)).size !== posts.length) problems.push('duplicate ids');
  if (new Set(posts.map((p) => p.date)).size !== posts.length) problems.push('duplicate dates');
  const pillars = new Set();
  const hookFirstWords = new Map();
  const ctas = new Set();
  const topics = new Set();
  let leadCtas = 0;
  let relevantPosts = 0;
  let audiencePosts = 0;
  const platformsSeen = new Set();
  for (const p of posts) {
    const tag = `${p.id}`;
    if (WEEKDAYS[parse(p.date).getDay()] !== p.day) problems.push(`${tag}: ${p.day} is not the weekday of ${p.date}`);
    if (!p.topic || p.topic.length < 8) problems.push(`${tag}: topic missing`);
    if (!p.hook || p.hook.length < 10) problems.push(`${tag}: hook missing`);
    if (!p.caption || p.caption.length < 60) problems.push(`${tag}: caption missing or too short`);
    if (!p.creativeDirection || p.creativeDirection.length < 20) problems.push(`${tag}: creative direction missing`);
    if (!p.cta || p.cta.length < 5) problems.push(`${tag}: CTA missing`);
    if (!p.format) problems.push(`${tag}: format missing`);
    if (p.status !== 'draft') problems.push(`${tag}: status ${p.status}`);
    for (const pl of p.platforms) { platformsSeen.add(pl); if (!s.body.platforms.includes(pl)) problems.push(`${tag}: platform ${pl} was not selected`); }
    if (s.body.platforms.length > 1 && p.adaptations.length === 0) problems.push(`${tag}: no platform adaptation`);
    if (NO_HASHTAG.has(p.platforms[0]) && p.hashtags.length) problems.push(`${tag}: hashtags on ${p.platforms[0]}`);
    const text = `${p.topic} ${p.hook} ${p.caption} ${p.cta} ${p.adaptations.map((a) => a.caption).join(' ')}`;
    if (BANNED.test(text)) problems.push(`${tag}: banned phrase "${text.match(BANNED)[0]}"`);
    if (/[–—]/.test(text)) problems.push(`${tag}: dash in text`);
    if (/\[(insert|your|add|client)[^\]]*\]/i.test(text)) problems.push(`${tag}: placeholder left in`);
    for (const [label, re] of s.forbid) if (re.test(text)) problems.push(`${tag}: ${label} ("${text.match(re)[0]}")`);
    pillars.add(p.pillar);
    const fw = p.hook.toLowerCase().split(/\s+/)[0];
    hookFirstWords.set(fw, (hookFirstWords.get(fw) ?? 0) + 1);
    ctas.add(p.cta.toLowerCase().trim());
    topics.add(p.topic.toLowerCase().trim());
    if (s.leadCta && s.leadCta.test(p.cta)) leadCtas += 1;
    if (s.relevant.test(text)) relevantPosts += 1;
    if (s.audience.test(text)) audiencePosts += 1;
  }
  for (const pl of s.body.platforms) if (!platformsSeen.has(pl)) problems.push(`platform ${pl} never used`);
  if (posts.length >= 4 && pillars.size < 4) problems.push(`only ${pillars.size} pillars used`);
  const maxFirstWord = Math.max(...hookFirstWords.values());
  if (posts.length >= 5 && maxFirstWord > Math.ceil(posts.length * 0.5)) problems.push(`${maxFirstWord} of ${posts.length} hooks open with the same word`);
  if (ctas.size < Math.ceil(posts.length * 0.6)) problems.push(`only ${ctas.size} distinct CTAs for ${posts.length} posts`);
  if (topics.size !== posts.length) problems.push('repeated topics');
  if (relevantPosts < Math.ceil(posts.length * 0.8)) problems.push(`only ${relevantPosts}/${posts.length} posts use the business's vocabulary`);
  if (audiencePosts < Math.ceil(posts.length * 0.5)) problems.push(`only ${audiencePosts}/${posts.length} posts speak to the audience`);
  if (s.leadCta && leadCtas < s.minLeadCtas) problems.push(`only ${leadCtas} lead-focused CTAs, expected at least ${s.minLeadCtas}`);
  if (!c.contentStrategy?.summary) problems.push('strategy summary missing');

  writeFileSync(join(outDir, `${s.key}.json`), JSON.stringify(data, null, 2));
  results.push({ ...s, c });
  for (const p of posts.slice(0, 4)) console.log(`   - ${p.day.slice(0, 3)} ${p.date} · ${p.platforms.join('+')} · ${p.format} · ${p.pillar}: ${p.topic} → "${p.hook.slice(0, 70)}"`);
  if (posts.length > 4) console.log(`   … ${posts.length - 4} more`);
  console.log(`   pillars: ${c.contentStrategy.contentPillars.map((x) => `${x.name} ${x.plannedPosts}`).join(', ')} · ${ctas.size} distinct CTAs · ${leadCtas} lead CTAs`);
  if (problems.length) {
    failures += 1;
    console.error(`   FAIL: ${problems.join('; ')}`);
  } else {
    console.log('   PASS');
  }
}

if (results.length > 1) {
  console.log('\n== Pairwise difference (shared topics / overlap of topic vocabulary)');
  const words = (c) => new Set(c.posts.flatMap((p) => p.topic.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 4)));
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i], b = results[j];
      const wa = words(a.c), wb = words(b.c);
      const inter = [...wa].filter((w) => wb.has(w)).length;
      const sim = inter / Math.max(1, new Set([...wa, ...wb]).size);
      const shared = a.c.posts.filter((p) => b.c.posts.some((q) => q.topic.toLowerCase() === p.topic.toLowerCase())).length;
      const verdict = sim > 0.4 || shared > 0 ? 'TOO SIMILAR' : 'ok';
      if (verdict !== 'ok') failures += 1;
      console.log(`   ${a.key} vs ${b.key}: vocabulary overlap ${(sim * 100).toFixed(0)}%, ${shared} shared topic(s) → ${verdict}`);
    }
  }
}
console.log(failures ? `\n${failures} check(s) failed` : `\nAll scenarios passed. Calendars saved in ${outDir}; build the exports with: node scripts/calendar-export-check.mjs .export-check-calendar ${outDir}/*.json`);
process.exit(failures ? 1 : 0);
