/**
 * Acceptance test for the Intake Form Generator's Gemini route.
 *
 *   BASE=http://localhost:5173 node scripts/intake-acceptance.mjs [out-dir]
 *
 * Posts four trainer personas to BASE/api/generate-intake (the dev server
 * with GEMINI_API_KEY in .env, or a deployment) and checks each answer:
 * question count inside the requested range, unique ids, no duplicate
 * questions, options on every choice question, no off-niche vocabulary
 * (a yoga form must not talk about one rep maxes). Then it compares the
 * personas pairwise: the forms must differ meaningfully in wording and in
 * section titles. Each questionnaire is saved as JSON in out-dir so
 * scripts/intake-pdf-check.mjs can build the real PDFs from them.
 * Exit 0 pass · 1 fail · 2 route not configured (no Gemini key).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BASE = (process.env.BASE ?? 'http://localhost:5173').replace(/\/$/, '');
const outDir = resolve(process.argv[2] ?? '.acceptance');
mkdirSync(outDir, { recursive: true });

const RANGES = { quick: [10, 14], standard: [16, 22], comprehensive: [24, 30] };
const PERSONAS = [
  {
    key: 'online-weight-loss',
    label: 'Online weight-loss coach for busy professionals',
    body: { businessType: 'Online Fitness Coach', specializations: ['Weight Loss / Fat Loss'], clientele: ['Busy Professionals'], format: 'Online Coaching', length: 'standard' },
    expect: ['schedule|work|hours|time', 'eat|nutrition|meal|food', 'equipment|home|space', 'check-in|check in|accountab|communicat|message'],
    forbid: ['one rep max|1rm|personal record|\\bpr\\b', 'bodybuild|posing|physique competition', 'competition schedule|season'],
  },
  {
    key: 'in-person-strength',
    label: 'In-person strength & conditioning coach for advanced athletes',
    body: { businessType: 'Strength & Conditioning Coach', specializations: ['Strength Training'], clientele: ['Advanced Athletes'], format: 'In-Person Training', length: 'comprehensive' },
    expect: ['strength|lift|load|squat|deadlift|press', 'recover|sleep', 'sport|competi|perform', 'equipment|facility|gym'],
    forbid: ['yoga|pilates|mindful', 'weight loss|fat loss|diet plan'],
  },
  {
    key: 'yoga-beginners',
    label: 'Yoga instructor for beginners, group classes',
    body: { businessType: 'Yoga Instructor', specializations: ['Yoga & Mindfulness'], clientele: ['Beginners'], format: 'Group Coaching', length: 'quick' },
    expect: ['yoga|practice|pose|mat', 'class|group', 'flexib|mobil|stiff|comfort|access'],
    forbid: ['one rep max|1rm|personal record|\\bpr\\b|max strength|barbell', 'bodybuild|physique', 'competition'],
  },
  {
    key: 'hybrid-parents',
    label: 'Hybrid trainer, muscle building + lifestyle, busy parents',
    body: { businessType: 'Hybrid Fitness Coach', specializations: ['Muscle Building', 'Lifestyle & Habit Coaching'], clientele: ['Busy Parents'], format: 'Hybrid Coaching', length: 'standard', requirements: 'Ask about home equipment and which days they can come in person.' },
    expect: ['equipment|home', 'in person|in-person|remote|online', 'family|child|kid|parent|schedule|day'],
    forbid: ['competition schedule', 'posing'],
  },
];

const STOP = new Set('a an the and or of to in on for with your you do does have has how what which when are is be any from that this we us our will would like about please if it its as at by'.split(' '));
const words = (q) => new Set(q.sections.flatMap((s) => s.questions.map((x) => x.question)).join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
const jaccard = (a, b) => { const inter = [...a].filter((w) => b.has(w)).length; return inter / Math.max(1, new Set([...a, ...b]).size); };

let failures = 0;
const results = [];
for (const p of PERSONAS) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/generate-intake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.body) });
  } catch (err) {
    console.error(`${p.key}: request failed (${err.message}). Is the dev server running at ${BASE}?`);
    process.exit(1);
  }
  const ms = Date.now() - t0;
  const data = await res.json().catch(() => ({}));
  if (res.status === 503) {
    console.error(`Route not configured: set GEMINI_API_KEY (in .env for npm run dev, or on Vercel).`);
    process.exit(2);
  }
  if (!res.ok) {
    failures += 1;
    console.error(`FAIL ${p.key}: HTTP ${res.status} ${JSON.stringify(data)} after ${ms} ms`);
    continue;
  }
  const q = data.questionnaire;
  const problems = [];
  const all = q.sections.flatMap((s) => s.questions);
  const [min, max] = RANGES[p.body.length];
  if (all.length < min || all.length > max) problems.push(`${all.length} questions, expected ${min}-${max}`);
  if (new Set(all.map((x) => x.id)).size !== all.length) problems.push('duplicate ids');
  const keys = all.map((x) => x.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  if (new Set(keys).size !== keys.length) problems.push('duplicate questions');
  for (const x of all) {
    if ((x.type === 'single_select' || x.type === 'multi_select') && x.options.length < 2) problems.push(`choice question without options: ${x.question.slice(0, 40)}`);
    if (/[–—]/.test(x.question)) problems.push(`dash in: ${x.question.slice(0, 40)}`);
    if (/\b(name|date of birth|signature)\b/i.test(x.question) && /your (full )?name|date of birth|sign/i.test(x.question)) problems.push(`asks for name/dob/signature: ${x.question.slice(0, 50)}`);
  }
  const corpus = JSON.stringify(q).toLowerCase();
  for (const re of p.expect) if (!new RegExp(re).test(corpus)) problems.push(`expected theme missing: /${re}/`);
  for (const re of p.forbid) if (new RegExp(re).test(corpus)) problems.push(`off-niche vocabulary present: /${re}/`);
  const mix = all.filter((x) => x.type !== 'short_text' && x.type !== 'long_text').length / all.length;
  if (mix < 0.3) problems.push(`only ${Math.round(mix * 100)}% structured (select/yes-no/rating/number) questions`);

  writeFileSync(join(outDir, `${p.key}.json`), JSON.stringify(data, null, 2));
  results.push({ ...p, q, ms, attempt: data.attempt, trimmed: Boolean(data.trimmed), model: data.model });
  console.log(`\n== ${p.label} (${ms} ms, model ${data.model}, attempt ${data.attempt}${data.trimmed ? ', trimmed' : ''})`);
  console.log(`   "${q.formTitle}" · ${all.length} questions · ${q.sections.length} sections: ${q.sections.map((s) => s.title).join(' | ')}`);
  for (const x of all.slice(0, 4)) console.log(`   - [${x.type}${x.required ? '' : ', optional'}] ${x.question}${x.options.length ? ` (${x.options.slice(0, 4).join(' / ')}${x.options.length > 4 ? ' / …' : ''})` : ''}`);
  if (problems.length) {
    failures += 1;
    console.error(`   FAIL: ${problems.join('; ')}`);
  } else {
    console.log('   PASS');
  }
}

if (results.length > 1) {
  console.log('\n== Pairwise similarity (Jaccard of question vocabulary; sections shared)');
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const a = results[i], b = results[j];
      const sim = jaccard(words(a.q), words(b.q));
      const sharedSections = a.q.sections.filter((s) => b.q.sections.some((t) => t.title.toLowerCase() === s.title.toLowerCase())).length;
      const verdict = sim > 0.45 ? 'TOO SIMILAR' : 'ok';
      if (sim > 0.45) failures += 1;
      console.log(`   ${a.key} vs ${b.key}: vocabulary overlap ${(sim * 100).toFixed(0)}%, ${sharedSections} shared section title(s) → ${verdict}`);
    }
  }
}
console.log(failures ? `\n${failures} check(s) failed` : `\nAll personas passed. Questionnaires saved in ${outDir}; build their PDFs with: node scripts/intake-pdf-check.mjs .pdf-check ${outDir}/*.json`);
process.exit(failures ? 1 : 0);
