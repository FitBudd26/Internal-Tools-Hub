import type { jsPDF } from 'jspdf';
import { ATKINS_DISCLAIMER, ATKINS_NON_AFFILIATION } from '../../shared/disclaimers';
import { COLLECTION_PDF_FILE, formatIngredient, recipePdfFileName } from './recipeUtils';
import { NUTRITION_STATUS_LABELS, type PdfOptions, type Recipe, type RecipeSet } from './types';

/**
 * Client-ready recipe PDF (one recipe or the collection of three), built in
 * the browser from the same recipe objects the modal shows, so the PDF
 * always matches the generated data. White page, FitBudd orange accents,
 * charcoal text, Helvetica throughout; US Letter by default, A4 on request.
 * Header: title, plan / phase, times. Body: overview, plan fit, ingredients,
 * instructions, nutrition, substitutions, note. Footer: FitBudd logo, page
 * number and a one-line nutrition disclaimer. jsPDF and the base64 logo load
 * on demand so the tool's bundle stays small.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const INK: RGB = [37, 50, 56];
const MUTED: RGB = [100, 116, 139];
const RULE: RGB = [229, 231, 235];
const TINT: RGB = [240, 250, 248];
const CELL: RGB = [246, 247, 249];
const TEAL: RGB = [0, 147, 121];

const PAGE = { letter: { w: 215.9, h: 279.4 }, a4: { w: 210, h: 297 } } as const;
const MARGIN = 18;

/** Characters outside WinAnsi (Helvetica's encoding) are swapped or dropped so nothing renders as a stray glyph. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[–—−]/g, '-')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/≈/g, 'approx. ')
    .replace(/[   ]/g, ' ')
    .replace(/[^ -~¡-ÿ•€]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildRecipesPdf(recipes: Recipe[], set: RecipeSet, options: PdfOptions): Promise<jsPDF> {
  const [{ jsPDF }, { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO }] = await Promise.all([import('jspdf'), import('../../shared/logo')]);
  const size = PAGE[options.pageSize];
  const PAGE_W = size.w;
  const PAGE_H = size.h;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_Y = PAGE_H - 11;
  const BOTTOM = FOOTER_Y - 7;
  const TOP_NEXT = 24;
  const doc = new jsPDF({ unit: 'mm', format: options.pageSize, compress: true });
  const single = recipes.length === 1;
  const docTitle = single ? pdfSafe(recipes[0].name) : 'Low-Carb Recipe Collection';
  const planLabel = pdfSafe(set.planLabel);
  let y = 0;

  /* ---- primitives ---- */
  const setStyle = (pt: number, style: 'normal' | 'bold' | 'italic', color: RGB) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(pt);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const stroke = (c: RGB, w = 0.25) => {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
  };
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const lines = (text: string, width: number): string[] => doc.splitTextToSize(text, width) as string[];
  const runningHeader = () => {
    setStyle(8.5, 'normal', MUTED);
    doc.text(docTitle, MARGIN, 13);
    doc.text(planLabel, PAGE_W - MARGIN, 13, { align: 'right' });
    stroke(RULE, 0.25);
    doc.line(MARGIN, 16, PAGE_W - MARGIN, 16);
  };
  const newPage = () => {
    doc.addPage();
    runningHeader();
    y = TOP_NEXT;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const paragraph = (text: string, pt: number, style: 'normal' | 'bold' | 'italic', color: RGB, lineH: number, x = MARGIN, width = CONTENT_W) => {
    setStyle(pt, style, color);
    for (const line of lines(pdfSafe(text), width)) {
      ensure(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };
  /** Section label with room for at least one line beneath, so it never sits alone at a page foot. */
  const label = (text: string) => {
    ensure(14);
    setStyle(8.5, 'bold', ORANGE);
    doc.text(text.toUpperCase(), MARGIN, y, { charSpace: 0.3 });
    doc.setCharSpace(0);
    y += 5;
  };
  const bullet = (text: string) => {
    setStyle(10, 'normal', INK);
    const body = lines(pdfSafe(text), CONTENT_W - 5);
    ensure(4.8 * body.length + 0.8);
    doc.text('•', MARGIN + 0.5, y);
    doc.text(body, MARGIN + 5, y);
    y += 4.8 * body.length + 0.8;
  };
  const numbered = (items: string[]) => {
    items.forEach((step, i) => {
      setStyle(10, 'normal', INK);
      const body = lines(pdfSafe(step), CONTENT_W - 7);
      ensure(4.8 * body.length + 1);
      doc.text(`${i + 1}.`, MARGIN, y);
      doc.text(body, MARGIN + 7, y);
      y += 4.8 * body.length + 1;
    });
  };

  const nutritionTable = (r: Recipe) => {
    const n = r.nutrition;
    if (n.status === 'not_calculated') {
      paragraph(`Nutrition not calculated. ${NUTRITION_STATUS_LABELS.not_calculated}`, 9, 'italic', MUTED, 4.3);
      return;
    }
    const cells: [string, string, boolean][] = [
      ['Net carbs', n.netCarbs === null ? 'n/a' : `${n.netCarbs} g`, true],
      ['Calories', n.calories === null ? 'n/a' : `${n.calories} kcal`, false],
      ['Protein', n.protein === null ? 'n/a' : `${n.protein} g`, false],
      ['Total carbs', n.totalCarbs === null ? 'n/a' : `${n.totalCarbs} g`, false],
      ['Fiber', n.fiber === null ? 'n/a' : `${n.fiber} g`, false],
      ['Fat', n.fat === null ? 'n/a' : `${n.fat} g`, false],
    ];
    const cellW = (CONTENT_W - 3) / 3;
    const cellH = 11;
    ensure(cellH * 2 + 1.5 + 8);
    cells.forEach(([k, v, strong], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * (cellW + 1.5);
      const top = y + row * (cellH + 1.5);
      fill(strong ? TINT : CELL);
      doc.roundedRect(x, top, cellW, cellH, 1.2, 1.2, 'F');
      setStyle(7, 'bold', MUTED);
      doc.text(k.toUpperCase(), x + 2.5, top + 4);
      setStyle(10.5, 'bold', strong ? TEAL : INK);
      doc.text(v, x + 2.5, top + 8.8);
    });
    y += cellH * 2 + 1.5 + 3;
    paragraph(`${n.status === 'estimated' ? 'Approximate AI estimate. ' : ''}${NUTRITION_STATUS_LABELS[n.status]} Net carbs = total carbs minus fiber.`, 8, 'italic', MUTED, 4);
    y += 2;
  };

  const planFitBox = (r: Recipe) => {
    const a = r.atkinsCompatibility;
    setStyle(9.5, 'normal', INK);
    const body = lines(pdfSafe(a.suitability), CONTENT_W - 8);
    const h = 4 + 5 + 4.4 * body.length + 3;
    ensure(h + 2);
    fill(TINT);
    doc.roundedRect(MARGIN, y - 1, CONTENT_W, h, 2, 2, 'F');
    setStyle(9.5, 'bold', INK);
    doc.text(`Plan fit: ${pdfSafe(a.planLabel)}${a.reviewStatus === 'meets_plan_guidelines' ? '' : ' (verify nutrition)'}`, MARGIN + 4, y + 4);
    setStyle(9.5, 'normal', INK);
    doc.text(body, MARGIN + 4, y + 9);
    y += h + 2;
  };

  const recipeBlock = (r: Recipe, index: number) => {
    if (!single) {
      // The numbered title with room for its meta line and the first paragraph.
      ensure(34);
      setStyle(15, 'bold', ORANGE);
      const t = lines(`${index + 1}. ${pdfSafe(r.name)}`, CONTENT_W);
      doc.text(t, MARGIN, y + 5);
      y += 6.5 * t.length + 4;
      // The cover already carries this line for a single recipe.
      paragraph(`${r.mealType}  ·  ${r.cuisine}  ·  Prep ${r.prepTime} min  ·  Cook ${r.cookTime} min  ·  Total ${r.totalTime} min`, 9, 'normal', MUTED, 4.6);
      y += 1;
    }
    paragraph(r.description, 10.5, 'normal', INK, 5.2);
    y += 2;
    planFitBox(r);
    label(`Ingredients  ·  ${r.servingBasis}`);
    r.ingredients.forEach((ing) => bullet(formatIngredient(ing)));
    y += 1.5;
    label('Instructions');
    numbered(r.instructions);
    y += 1.5;
    label('Nutrition per serving');
    nutritionTable(r);
    if (r.substitutions.length) {
      y += 1;
      label('Substitutions');
      r.substitutions.forEach((s) => bullet(s));
    }
    y += 1;
    paragraph(`Note: ${r.nutritionNote}`, 8.5, 'italic', MUTED, 4.2);
    y += 2;
  };

  /* ---- page 1: cover block ---- */
  fill(ORANGE);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  const logoW = 24;
  doc.addImage(FITBUDD_LOGO_PNG, 'PNG', PAGE_W - MARGIN - logoW, 13, logoW, logoW * FITBUDD_LOGO_RATIO);
  y = 17;
  setStyle(8.5, 'bold', ORANGE);
  doc.text(single ? 'LOW-CARB RECIPE' : 'LOW-CARB RECIPES', MARGIN, y, { charSpace: 0.5 });
  doc.setCharSpace(0);
  y += 9;
  paragraph(docTitle, 20, 'bold', INK, 8.2, MARGIN, CONTENT_W - logoW - 6);
  y += 0.5;
  paragraph(
    single
      ? `${planLabel}  ·  ${recipes[0].mealType}  ·  ${recipes[0].cuisine}  ·  Prep ${recipes[0].prepTime} min  ·  Cook ${recipes[0].cookTime} min  ·  Total ${recipes[0].totalTime} min`
      : `${planLabel}  ·  ${set.mealType}  ·  ${set.cuisine}  ·  ${recipes.length} recipes`,
    10,
    'normal',
    MUTED,
    5.2,
  );
  if (!single) {
    y += 1;
    paragraph('Each recipe serves 1 and shows nutrition per serving. Generated for this plan and these preferences; review before sharing with clients.', 9.5, 'italic', MUTED, 4.6);
  }
  y += single ? 3 : 6;

  /* ---- recipes ---- */
  recipes.forEach((r, i) => {
    if (i > 0) {
      ensure(12);
      stroke(RULE, 0.3);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 8;
    }
    recipeBlock(r, i);
  });

  /* ---- dietary notes ---- */
  ensure(22);
  stroke(RULE, 0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  label('Important dietary notes');
  paragraph(ATKINS_DISCLAIMER, 8, 'normal', MUTED, 3.8);
  y += 0.5;
  paragraph(ATKINS_NON_AFFILIATION, 8, 'normal', MUTED, 3.8);

  /* ---- footers ---- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const w = 13;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', MARGIN, FOOTER_Y - w * FITBUDD_LOGO_RATIO + 1, w, w * FITBUDD_LOGO_RATIO);
    setStyle(7.5, 'normal', MUTED);
    doc.text('Created with FitBudd · fitbudd.com · Nutrition values are approximate estimates', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

/** Build and download one recipe. Returns the file name used (e.g. atkins-garlic-butter-chicken.pdf). */
export async function downloadRecipePdf(recipe: Recipe, set: RecipeSet, options: PdfOptions): Promise<string> {
  const doc = await buildRecipesPdf([recipe], set, options);
  const name = recipePdfFileName(recipe);
  doc.save(name);
  return name;
}

/** Build and download all three recipes as atkins-low-carb-recipes.pdf. */
export async function downloadCollectionPdf(set: RecipeSet, options: PdfOptions): Promise<string> {
  const doc = await buildRecipesPdf(set.recipes, set, options);
  doc.save(COLLECTION_PDF_FILE);
  return COLLECTION_PDF_FILE;
}
