/**
 * Automated checks for the Atkins Diet Recipe Generator PDFs.
 *
 *   node scripts/atkins-pdf-check.mjs [out-dir] [recipe-set.json ...]
 *
 * Bundles src/tools/atkins-recipe-generator/generatePdf.ts for Node with
 * esbuild, builds every fixture (a three-recipe collection, long names and
 * steps with special characters, every nutrition status) and any recipe-set
 * JSON files given (for example the output of scripts/atkins-acceptance.mjs)
 * as the collection PDF and as single-recipe PDFs, in US Letter and A4, and
 * checks each file: valid PDF, page count, every recipe name present, the
 * ingredient / instruction / nutrition sections, "Page X of Y" on every page,
 * the dietary notes, the expected file name. Exit code 1 when a check fails.
 * Render pages for a visual pass with scripts/render-pdf-pages.swift.
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
const outDir = resolve(outArg ?? join(root, '.pdf-check-atkins'));
mkdirSync(outDir, { recursive: true });

const entry = `
  export { buildRecipesPdf, pdfSafe } from '${join(root, 'src/tools/atkins-recipe-generator/generatePdf.ts').replace(/\\/g, '/')}';
  export { recipePdfFileName, COLLECTION_PDF_FILE } from '${join(root, 'src/tools/atkins-recipe-generator/recipeUtils.ts').replace(/\\/g, '/')}';
`;
const bundleDir = join(root, 'node_modules', '.cache', 'atkins-pdf-check');
mkdirSync(bundleDir, { recursive: true });
const bundlePath = join(bundleDir, 'pdf-bundle.mjs');
await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', external: ['jspdf'], outfile: bundlePath, logLevel: 'silent' });
const lib = await import(pathToFileURL(bundlePath).href);
const { SAMPLES } = await import(pathToFileURL(join(here, 'fixtures/atkins-samples.mjs')).href);

const sets = Object.entries(SAMPLES).map(([name, make]) => ({ name, set: make() }));
for (const f of jsonFiles) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  sets.push({ name: f.replace(/^.*\//, '').replace(/\.json$/, ''), set: data.set ?? data });
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
    try {
      out.push(inflateSync(chunk).toString('latin1'));
    } catch {
      out.push(chunk.toString('latin1'));
    }
    re.lastIndex = end + 'endstream'.length;
  }
  return out;
}
const pdfEscape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

let failures = 0;
const rows = [];
async function checkPdf(name, recipes, set, pageSize, fileName) {
  const problems = [];
  let pages = 0;
  let size = 0;
  try {
    const doc = await lib.buildRecipesPdf(recipes, set, { pageSize });
    const buf = Buffer.from(doc.output('arraybuffer'));
    size = buf.length;
    const file = join(outDir, `${name}-${pageSize}-${fileName}`);
    writeFileSync(file, buf);
    const raw = buf.toString('latin1');
    const text = raw + '\n' + decodedStreams(buf).join('\n');
    if (!raw.startsWith('%PDF-')) problems.push('not a PDF');
    pages = doc.getNumberOfPages();
    const footers = (text.match(/\(Page \d+ of \d+\)/g) ?? []).length;
    if (footers !== pages) problems.push(`page numbers on ${footers}/${pages} pages`);
    if (pages > recipes.length * 2 + 1) problems.push(`${pages} pages for ${recipes.length} recipe(s) looks sparse`);
    for (const r of recipes) {
      const start = pdfEscape(lib.pdfSafe(r.name).split(' ').slice(0, 3).join(' '));
      if (start && !text.includes(start)) problems.push(`missing recipe title: "${r.name.slice(0, 40)}"`);
      const firstStep = pdfEscape(lib.pdfSafe(r.instructions[0]).split(' ').slice(0, 3).join(' '));
      if (firstStep && !text.includes(firstStep)) problems.push(`missing first instruction of "${r.name.slice(0, 30)}"`);
      const firstIng = pdfEscape(lib.pdfSafe(r.ingredients[0].name).split(' ').slice(0, 2).join(' '));
      if (firstIng && !text.includes(firstIng)) problems.push(`missing first ingredient of "${r.name.slice(0, 30)}"`);
      if (r.nutrition.status === 'not_calculated' && !text.includes('Nutrition not calculated')) problems.push(`"${r.name.slice(0, 30)}" should say nutrition not calculated`);
      if (r.nutrition.status === 'estimated' && !text.includes('AI estimate')) problems.push(`"${r.name.slice(0, 30)}" should be labelled an AI estimate`);
    }
    const occurrences = (needle) => (text.match(new RegExp(`\\(${needle}`, 'g')) ?? []).length;
    if (occurrences('INGREDIENTS') < recipes.length) problems.push('ingredients heading missing');
    if (occurrences('INSTRUCTIONS') < recipes.length) problems.push('instructions heading missing');
    if (occurrences('NUTRITION PER SERVING') < recipes.length) problems.push('nutrition heading missing');
    if (recipes.some((r) => r.nutrition.status !== 'not_calculated') && !text.includes('(NET CARBS)')) problems.push('net carbs cell missing');
    if (!text.includes('(IMPORTANT DIETARY NOTES)')) problems.push('dietary notes missing');
    if (!text.includes('not affiliated')) problems.push('non-affiliation notice missing');
    const emptyStreams = decodedStreams(buf).filter((s) => s.length < 200 && !s.includes('BT')).length;
    if (emptyStreams > 0) problems.push(`${emptyStreams} near-empty content stream(s)`);
  } catch (err) {
    problems.push(`threw: ${err instanceof Error ? err.message : err}`);
  }
  rows.push({ case: name, kind: recipes.length === 1 ? 'single' : 'collection', size: pageSize, recipes: recipes.length, pages, kb: Math.round(size / 1024), file: fileName, ok: problems.length === 0 });
  if (problems.length) {
    failures += 1;
    console.error(`FAIL ${name} ${pageSize} ${fileName}: ${problems.join('; ')}`);
  }
}

for (const { name, set } of sets) {
  for (const pageSize of ['letter', 'a4']) {
    await checkPdf(name, set.recipes, set, pageSize, lib.COLLECTION_PDF_FILE);
    const single = set.recipes[0];
    const fileName = lib.recipePdfFileName(single);
    if (!/^atkins-[a-z0-9-]+\.pdf$/.test(fileName)) {
      failures += 1;
      console.error(`FAIL ${name}: unexpected single-recipe file name ${fileName}`);
    }
    await checkPdf(name, [single], set, pageSize, fileName);
  }
}
console.table(rows);
console.log(failures ? `${failures} PDF(s) failed checks` : `All ${rows.length} PDFs passed. Output: ${outDir}`);
process.exit(failures ? 1 : 0);
