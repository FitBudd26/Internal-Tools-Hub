/**
 * Automated checks for the Intake Form Generator PDF.
 *
 *   node scripts/intake-pdf-check.mjs [out-dir] [questionnaire.json ...]
 *
 * Bundles src/tools/intake-form-generator/generatePdf.ts for Node with esbuild,
 * builds every fixture (10, 20 and 30 questions, edge cases) in US Letter and
 * A4, plus any questionnaire JSON files given (for example the output of
 * scripts/intake-acceptance.mjs), and checks each PDF: valid file, page
 * count, every question present, "Page X of Y" on every page, client name
 * and date fields, no empty pages. Exit code 1 when a check fails.
 * Render the pages for a visual pass with scripts/render-pdf-pages.swift.
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
const outDir = resolve(outArg ?? join(root, '.pdf-check'));
mkdirSync(outDir, { recursive: true });

// Bundle the browser module for Node; jsPDF stays external and resolves to its Node build.
const entry = `
  export { buildIntakePdf, pdfSafe } from '${join(root, 'src/tools/intake-form-generator/generatePdf.ts').replace(/\\/g, '/')}';
  export { countQuestions, pdfFileName } from '${join(root, 'src/tools/intake-form-generator/questionUtils.ts').replace(/\\/g, '/')}';
  export { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO } from '${join(root, 'src/shared/logo.ts').replace(/\\/g, '/')}';
`;
// The bundle lives inside the repo so Node resolves the external jspdf from node_modules.
const bundleDir = join(root, 'node_modules', '.cache', 'intake-pdf-check');
mkdirSync(bundleDir, { recursive: true });
const bundlePath = join(bundleDir, 'pdf-bundle.mjs');
await esbuild.build({
  stdin: { contents: entry, resolveDir: root, loader: 'ts' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['jspdf'],
  outfile: bundlePath,
  logLevel: 'silent',
});
const lib = await import(pathToFileURL(bundlePath).href);
const { SAMPLES } = await import(pathToFileURL(join(here, 'fixtures/intake-samples.mjs')).href);

const cases = Object.entries(SAMPLES).map(([name, make]) => ({ name, questionnaire: make() }));
for (const f of jsonFiles) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  const questionnaire = data.questionnaire ?? data;
  cases.push({ name: f.replace(/^.*\//, '').replace(/\.json$/, ''), questionnaire });
}

/** Every content stream inflated (the PDF is compressed), so text operators can be searched. */
function decodedStreams(buf) {
  const raw = buf.toString('latin1');
  const out = [];
  // 'endstream' also ends in 'stream': only match the opening keyword, and skip past each terminator.
  const re = /(?<!end)stream\r?\n/g;
  let m;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    // The dictionary's /Length is exact; trimming whitespace could eat a trailing byte of deflate data.
    const declared = /\/Length\s+(\d+)[^>]*>>\s*$/.exec(raw.slice(Math.max(0, m.index - 200), m.index));
    let stop = declared ? Math.min(start + Number(declared[1]), end) : end;
    if (!declared && stop > start && raw[stop - 1] === '\n') stop -= raw[stop - 2] === '\r' ? 2 : 1;
    const chunk = buf.subarray(start, stop);
    try {
      out.push(inflateSync(chunk).toString('latin1'));
    } catch {
      out.push(chunk.toString('latin1'));
    }
    re.lastIndex = end + 'endstream'.length;
  }
  return out;
}

/** PDF string escaping as jsPDF writes it (WinAnsi text inside parentheses). */
const pdfEscape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

let failures = 0;
const rows = [];
for (const { name, questionnaire } of cases) {
  for (const pageSize of ['letter', 'a4']) {
    const withLogo = pageSize === 'letter' && name === 'standardOnlineWeightLoss';
    const options = {
      pageSize,
      coachName: withLogo ? 'Summit Coaching Co.' : name === 'comprehensiveStrength' ? 'Ironworks Performance' : '',
      coachLogo: withLogo ? { dataUrl: lib.FITBUDD_LOGO_PNG, ratio: lib.FITBUDD_LOGO_RATIO } : null,
    };
    const problems = [];
    let pages = 0;
    try {
      const doc = await lib.buildIntakePdf(questionnaire, options);
      const buf = Buffer.from(doc.output('arraybuffer'));
      const file = join(outDir, `${name}-${pageSize}.pdf`);
      writeFileSync(file, buf);
      const raw = buf.toString('latin1');
      const streams = decodedStreams(buf);
      const text = raw + '\n' + streams.join('\n');
      if (!raw.startsWith('%PDF-')) problems.push('not a PDF');
      pages = doc.getNumberOfPages();
      const pageObjects = (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
      if (pageObjects !== pages) problems.push(`page objects ${pageObjects} != ${pages}`);
      const footers = (text.match(/\(Page \d+ of \d+\)/g) ?? []).length;
      if (footers !== pages) problems.push(`page numbers on ${footers}/${pages} pages`);
      if (!text.includes('(Client name)')) problems.push('client name field missing');
      if (!text.includes('(Date)')) problems.push('date field missing');
      // Every question's opening words must be in the file (the first wrapped line always starts the question).
      const questions = questionnaire.sections.flatMap((s) => s.questions);
      const expected = lib.countQuestions(questionnaire);
      if (questions.length !== expected) problems.push('question count mismatch');
      for (const q of questions) {
        const start = pdfEscape(lib.pdfSafe(q.question).split(' ').slice(0, 3).join(' '));
        if (start && !text.includes(start)) problems.push(`missing question: "${q.question.slice(0, 40)}"`);
      }
      // No empty pages: every page content stream carries text operators (images and fonts are large anyway).
      const emptyStreams = streams.filter((s) => s.length < 200 && !s.includes('BT')).length;
      if (emptyStreams > 0) problems.push(`${emptyStreams} near-empty content stream(s)`);
      const maxPages = Math.ceil(expected / 4) + 2;
      if (pages > maxPages) problems.push(`${pages} pages for ${expected} questions looks sparse`);
      rows.push({ case: name, size: pageSize, questions: expected, pages, file: file.replace(root + '/', ''), ok: problems.length === 0 });
    } catch (err) {
      problems.push(`threw: ${err instanceof Error ? err.message : err}`);
      rows.push({ case: name, size: pageSize, questions: '-', pages, file: '-', ok: false });
    }
    if (problems.length) {
      failures += 1;
      console.error(`FAIL ${name} ${pageSize}: ${problems.join('; ')}`);
    }
  }
}
console.table(rows);
console.log(failures ? `${failures} PDF(s) failed checks` : `All ${rows.length} PDFs passed. Output: ${outDir}`);
process.exit(failures ? 1 : 0);
