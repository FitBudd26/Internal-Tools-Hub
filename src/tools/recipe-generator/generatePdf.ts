import type { jsPDF } from 'jspdf';
import type { Recipe, RecipeInput } from './types';
import { RECIPE_DISCLAIMER } from '../../shared/disclaimers';

/**
 * Client-ready recipe PDF with the FitBudd logo in the header and footer.
 * jsPDF and the base64 logo load on demand so the tool's bundle stays small.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const TEAL: RGB = [0, 147, 121];
const INK: RGB = [17, 24, 39];
const MUTED: RGB = [107, 114, 128];
const LINE: RGB = [229, 231, 235];
const TINT: RGB = [240, 250, 248];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 26;
const FOOTER_Y = PAGE_H - 11;

export const RECIPE_PDF_FILE = 'fitbudd-recipe-generator.pdf';

export async function buildRecipePdf(input: RecipeInput, recipes: Recipe[]): Promise<jsPDF> {
  const [{ jsPDF }, { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO }] = await Promise.all([
    import('jspdf'),
    import('../../shared/logo'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = HEADER_H + 10;

  const setStyle = (size: number, style: 'normal' | 'bold', color: RGB) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const lines = (text: string, width: number): string[] => doc.splitTextToSize(text, width) as string[];
  const header = () => {
    const w = 30;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', MARGIN, 9, w, w * FITBUDD_LOGO_RATIO);
    doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setLineWidth(0.8);
    doc.line(MARGIN, HEADER_H, PAGE_W - MARGIN, HEADER_H);
    doc.setLineWidth(0.2);
  };
  const newPage = () => {
    doc.addPage();
    header();
    y = HEADER_H + 10;
  };
  const ensure = (h: number) => {
    if (y + h > FOOTER_Y - 10) newPage();
  };
  const write = (text: string, size: number, style: 'normal' | 'bold', color: RGB, lineH: number, x = MARGIN, width = CONTENT_W) => {
    setStyle(size, style, color);
    for (const line of lines(text, width)) {
      ensure(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };
  const bullet = (text: string, indent = 0) => {
    const x = MARGIN + indent;
    setStyle(10, 'normal', INK);
    const body = lines(text, CONTENT_W - indent - 5);
    ensure(5 * body.length);
    doc.text('•', x, y);
    doc.text(body, x + 5, y);
    y += 5 * body.length + 0.8;
  };
  const numbered = (items: string[]) => {
    items.forEach((step, i) => {
      setStyle(10, 'normal', INK);
      const body = lines(step, CONTENT_W - 7);
      ensure(5 * body.length);
      doc.text(`${i + 1}.`, MARGIN, y);
      doc.text(body, MARGIN + 7, y);
      y += 5 * body.length + 0.8;
    });
  };
  const label = (text: string) => {
    ensure(7);
    setStyle(9, 'bold', TEAL);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 5;
  };

  /* ---- page 1: title + overview ---- */
  header();
  setStyle(9, 'bold', ORANGE);
  doc.text('CLIENT RECIPE PACK', MARGIN, y);
  y += 8;
  write(`${input.goal ?? 'Balanced Lifestyle'} recipes`, 22, 'bold', INK, 9.5);
  y += 1;
  write(`${recipes.length} coach-selected recipe${recipes.length === 1 ? '' : 's'} for ${input.mealTypes.join(', ').toLowerCase() || 'any meal'}`, 12, 'normal', MUTED, 6);
  y += 5;
  doc.setFillColor(TINT[0], TINT[1], TINT[2]);
  const overview: [string, string][] = [
    ['Client goal', input.goal ?? 'Balanced Lifestyle'],
    ['Proteins', input.proteins.join(', ') || 'No preference'],
    ['Dietary needs', input.diets.filter((d) => d !== 'No Restrictions').join(', ') || 'No restrictions'],
    ['Meal types', input.mealTypes.join(', ') || 'Any'],
    ['Cooking time', input.cookingTime ?? 'Flexible'],
  ];
  if (input.notes.trim()) overview.push(['Client notes', input.notes.trim().slice(0, 240)]);
  const boxH = overview.reduce((h, [, v]) => h + 5.5 * lines(v, CONTENT_W - 40).length + 1, 8);
  doc.roundedRect(MARGIN, y - 5, CONTENT_W, boxH, 2, 2, 'F');
  for (const [k, v] of overview) {
    setStyle(10, 'bold', INK);
    doc.text(k, MARGIN + 4, y);
    setStyle(10, 'normal', MUTED);
    const vl = lines(v, CONTENT_W - 40);
    doc.text(vl, MARGIN + 36, y);
    y += 5.5 * vl.length + 1;
  }
  y += 8;

  /* ---- recipe cards ---- */
  recipes.forEach((r, i) => {
    ensure(40);
    if (i > 0) {
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 8;
    }
    write(`${i + 1}. ${r.name}`, 15, 'bold', ORANGE, 7);
    write(`${r.mealType}  ·  ${r.timeMinutes} min  ·  approx. ${r.nutrition.calories} kcal, ${r.nutrition.proteinG} g protein, ${r.nutrition.carbsG} g carbs, ${r.nutrition.fatG} g fat`, 9.5, 'normal', MUTED, 5);
    y += 1.5;
    write(r.description, 10.5, 'normal', INK, 5.2);
    y += 1;
    label('Goal alignment');
    write(r.goalAlignment, 10, 'normal', INK, 5);
    y += 1.5;
    label('Ingredients (1 serving)');
    r.ingredients.forEach((ing) => bullet(ing));
    y += 1.5;
    label('Method');
    numbered(r.steps);
    y += 1.5;
    label('Coach note');
    write(r.coachingNote, 10, 'normal', INK, 5);
    y += 4;
  });

  /* ---- disclaimer ---- */
  ensure(24);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  write(`Disclaimer: ${RECIPE_DISCLAIMER}`, 8.5, 'normal', MUTED, 4.2);

  /* ---- footers ---- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const w = 16;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', MARGIN, FOOTER_Y - w * FITBUDD_LOGO_RATIO + 1, w, w * FITBUDD_LOGO_RATIO);
    setStyle(8, 'normal', MUTED);
    doc.text('Created with the FitBudd Recipe Generator', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

export async function downloadRecipePdf(input: RecipeInput, recipes: Recipe[]): Promise<string> {
  const doc = await buildRecipePdf(input, recipes);
  doc.save(RECIPE_PDF_FILE);
  return RECIPE_PDF_FILE;
}
