/**
 * Automated checks for the Fitness Content Calendar Generator exports.
 *
 *   node scripts/calendar-export-check.mjs [out-dir] [calendar.json ...]
 *
 * Bundles the tool's PDF, CSV and .ics builders for Node with esbuild, builds
 * every fixture (3, 10 and 30 posts, two platforms with adaptations, long
 * captions, special characters) and any calendar JSON files given (for example
 * the output of scripts/calendar-acceptance.mjs), in US Letter and A4, and
 * checks: the PDF is valid, has page numbers on every page, the strategy and
 * calendar overview sections, every topic, every caption opening (nothing
 * clipped) and every platform version, with no empty pages; the CSV has the
 * 13 columns, one row per platform version, round-trips through a CSV parser
 * with captions intact, and neutralises formula-looking cells; the .ics has
 * one event per post. Exit code 1 when a check fails.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);
const esbuild = require(join(root, 'node_modules', 'esbuild'));
const [, , outArg, ...jsonFiles] = process.argv;
const outDir = resolve(outArg ?? join(root, '.export-check-calendar'));
mkdirSync(outDir, { recursive: true });

const T = join(root, 'src/tools/content-calendar-generator').replace(/\\/g, '/');
const entry = `export { buildCalendarPdf, pdfSafe } from '${T}/generatePdf.ts'; export { buildCsv, buildIcs, csvRows, CSV_COLUMNS } from '${T}/exports.ts';`;
const bundleDir = join(root, 'node_modules', '.cache', 'calendar-export-check');
mkdirSync(bundleDir, { recursive: true });
const bundlePath = join(bundleDir, 'bundle.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', external: ['jspdf'], outfile: bundlePath, logLevel: 'silent' });
const lib = await import(pathToFileURL(bundlePath).href);
const { SAMPLES } = await import(pathToFileURL(join(here, 'fixtures/calendar-samples.mjs')).href);

const cases = Object.entries(SAMPLES).map(([name, make]) => ({ name, calendar: make() }));
for (const f of jsonFiles) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  cases.push({ name: f.replace(/^.*\//, '').replace(/\.json$/, ''), calendar: data.calendar ?? data });
}

function decodedStreams(buf) {
  const raw = buf.toString('latin1');
  const out = [];
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    const declared = /\/Length\s+(\d+)[^>]*>>\s*$/.exec(raw.slice(Math.max(0, m.index - 200), m.index));
    let stop = declared ? Math.min(start + Number(declared[1]), end) : end;
    if (!declared && stop > start && raw[stop - 1] === '\n') stop -= raw[stop - 2] === '\r' ? 2 : 1;
    const chunk = buf.subarray(start, stop);
    try { out.push(inflateSync(chunk).toString('latin1')); } catch { out.push(chunk.toString('latin1')); }
    re.lastIndex = end + 'endstream'.length;
  }
  return out;
}
const pdfEscape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const firstWords = (s, n) => pdfEscape(lib.pdfSafe(s).split('\n')[0].split(' ').slice(0, n).join(' '));
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') { /* skip */ }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

let failures = 0;
const rows = [];
for (const { name, calendar } of cases) {
  const posts = calendar.posts;
  const variants = posts.reduce((n, p) => n + 1 + p.adaptations.length, 0);
  /* ---- PDF, both sizes ---- */
  for (const pageSize of ['letter', 'a4']) {
    const problems = [];
    let pages = 0, kb = 0;
    try {
      const doc = await lib.buildCalendarPdf(calendar, { pageSize });
      const buf = Buffer.from(doc.output('arraybuffer'));
      kb = Math.round(buf.length / 1024);
      writeFileSync(join(outDir, `${name}-${pageSize}.pdf`), buf);
      const raw = buf.toString('latin1');
      const streams = decodedStreams(buf);
      const text = raw + '\n' + streams.join('\n');
      if (!raw.startsWith('%PDF-')) problems.push('not a PDF');
      pages = doc.getNumberOfPages();
      const footers = (text.match(/\(Page \d+ of \d+\)/g) ?? []).length;
      if (footers !== pages) problems.push(`page numbers on ${footers}/${pages} pages`);
      if (!text.includes('(CONTENT STRATEGY)')) problems.push('strategy section missing');
      if (!text.includes('(CALENDAR OVERVIEW)')) problems.push('calendar overview missing');
      if (!text.includes('(POST BREAKDOWN')) problems.push('post breakdown missing');
      for (const p of posts) {
        if (!text.includes(firstWords(p.topic, 3))) problems.push(`missing topic "${p.topic.slice(0, 30)}"`);
        if (!text.includes(firstWords(p.caption, 4))) problems.push(`missing caption start of ${p.id}`);
        const lastLine = lib.pdfSafe(p.caption).split('\n').filter(Boolean).pop() ?? '';
        const lastWords = pdfEscape(lastLine.split(' ').slice(-3).join(' '));
        if (lastWords && !text.includes(lastWords)) problems.push(`caption end of ${p.id} not found (clipped?)`);
        for (const a of p.adaptations) if (!text.includes(pdfEscape(lib.pdfSafe(`${a.platform} version`)))) problems.push(`missing ${a.platform} version of ${p.id}`);
      }
      const empty = streams.filter((s) => s.length < 200 && !s.includes('BT')).length;
      if (empty > 0) problems.push(`${empty} near-empty content stream(s)`);
      if (pages > Math.ceil(posts.length / 1.5) + 3) problems.push(`${pages} pages for ${posts.length} posts looks sparse`);
    } catch (err) {
      problems.push(`threw: ${err instanceof Error ? err.message : err}`);
    }
    rows.push({ case: name, kind: `pdf ${pageSize}`, posts: posts.length, pages, kb, ok: problems.length === 0 });
    if (problems.length) { failures += 1; console.error(`FAIL ${name} pdf ${pageSize}: ${problems.join('; ')}`); }
  }
  /* ---- CSV ---- */
  {
    const problems = [];
    const csv = lib.buildCsv(calendar);
    writeFileSync(join(outDir, `${name}.csv`), csv);
    if (!csv.startsWith('﻿')) problems.push('no BOM');
    const parsed = parseCsv(csv.replace(/^﻿/, ''));
    if (parsed[0].join('|') !== lib.CSV_COLUMNS.join('|')) problems.push(`header: ${parsed[0].join('|')}`);
    if (parsed.length - 1 !== variants) problems.push(`${parsed.length - 1} rows, expected ${variants}`);
    if (!parsed.slice(1).every((r) => r.length === 13)) problems.push('a row does not have 13 cells');
    const body = parsed.slice(1);
    posts.forEach((p, i) => {
      const r = body.find((x) => x[0] === p.date && x[2] === p.platforms[0] && x[5].replace(/^'/, '') === p.topic);
      if (!r) problems.push(`row for ${p.id} missing`);
      else if (r[7] !== p.caption) problems.push(`caption of ${p.id} altered in the CSV`);
      if (/^[=+\-@]/.test(p.topic) && r && !r[5].startsWith("'")) problems.push(`formula-looking topic of ${p.id} not neutralised`);
      void i;
    });
    if (!body.every((r) => r[12] === 'Draft')) problems.push('status column');
    rows.push({ case: name, kind: 'csv', posts: posts.length, pages: parsed.length - 1, kb: Math.round(csv.length / 1024), ok: problems.length === 0 });
    if (problems.length) { failures += 1; console.error(`FAIL ${name} csv: ${problems.join('; ')}`); }
  }
  /* ---- ICS ---- */
  {
    const problems = [];
    const ics = lib.buildIcs(calendar, new Date(Date.UTC(2026, 10, 4)));
    writeFileSync(join(outDir, `${name}.ics`), ics);
    const events = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    if (events !== posts.length) problems.push(`${events} events for ${posts.length} posts`);
    if (!ics.startsWith('BEGIN:VCALENDAR\r\n') || !ics.endsWith('END:VCALENDAR\r\n')) problems.push('envelope');
    if (ics.split('\r\n').some((l) => Buffer.byteLength(l) > 75 + 4)) problems.push('a line is longer than 75 octets');
    for (const p of posts) if (!ics.includes(`DTSTART;VALUE=DATE:${p.date.replace(/-/g, '')}`)) problems.push(`no event on ${p.date}`);
    rows.push({ case: name, kind: 'ics', posts: posts.length, pages: events, kb: Math.round(ics.length / 1024), ok: problems.length === 0 });
    if (problems.length) { failures += 1; console.error(`FAIL ${name} ics: ${problems.join('; ')}`); }
  }
}
console.table(rows);
console.log(failures ? `${failures} export(s) failed checks` : `All ${rows.length} exports passed. Output: ${outDir}`);
process.exit(failures ? 1 : 0);
