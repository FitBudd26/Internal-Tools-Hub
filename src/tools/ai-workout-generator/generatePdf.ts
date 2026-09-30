import type { jsPDF } from 'jspdf';
import { WORKOUT_DISCLAIMER } from '../../shared/disclaimers';
import { PDF_CTA_URL } from './links';
import { exerciseMeta } from './format';
import type { RoutineItem, WorkoutPlan } from './types';

/**
 * Client-ready PDF of the workout plan, ported from the standalone tool's
 * layout: logo header, title, summary card, format, warm-up, exercise cards,
 * cool-down, progression and notes, disclaimer, and a FitBudd call to action.
 * jsPDF and the base64 logo load on demand so the tool's bundle stays small.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const TEAL: RGB = [0, 147, 121];
const INK: RGB = [17, 24, 39];
const MUTED: RGB = [107, 114, 128];
const LINE: RGB = [229, 231, 235];
const CARD: RGB = [249, 250, 251];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 26;
const FOOTER_Y = PAGE_H - 11;

export function pdfFileName(plan: WorkoutPlan): string {
  const slug = (plan.clientName || plan.goal || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${slug || 'client'}-workout.pdf`;
}

export async function buildWorkoutPdf(plan: WorkoutPlan): Promise<jsPDF> {
  const [{ jsPDF }, { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO }] = await Promise.all([import('jspdf'), import('../../shared/logo')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = HEADER_H + 12;

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
    y = HEADER_H + 12;
  };
  const ensure = (height: number) => {
    if (y + height > FOOTER_Y - 8) newPage();
  };
  const paragraph = (text: string, size: number, color: RGB, lineH: number, width = CONTENT_W, x = MARGIN) => {
    setStyle(size, 'normal', color);
    for (const line of lines(text, width)) {
      ensure(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };
  const heading = (text: string) => {
    ensure(18);
    y += 3;
    setStyle(13, 'bold', ORANGE);
    doc.text(text, MARGIN, y);
    y += 7;
  };

  header();

  /* ---- title ---- */
  setStyle(9, 'bold', ORANGE);
  doc.text('PROFESSIONAL WORKOUT PLAN', MARGIN, y);
  y += 9;
  // No placeholder name in a client-facing document: fall back to a goal title.
  const title = plan.clientName ? `${plan.clientName}'s ${plan.goal} Workout` : `${plan.goal} Workout Plan`;
  setStyle(21, 'bold', INK);
  for (const line of lines(title, CONTENT_W)) {
    doc.text(line, MARGIN, y);
    y += 9;
  }
  y += 2;

  /* ---- summary card: short values only, so nothing clips ---- */
  const cardH = 20;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setFillColor(CARD[0], CARD[1], CARD[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 2.5, 2.5, 'FD');
  const col = CONTENT_W / 3;
  const cell = (label: string, value: string, index: number) => {
    const x = MARGIN + 6 + col * index;
    setStyle(7.5, 'bold', MUTED);
    doc.text(label, x, y + 7.5);
    setStyle(11.5, 'bold', INK);
    doc.text(lines(value, col - 10)[0] ?? '', x, y + 14);
  };
  cell('GOAL', plan.goal, 0);
  cell('DURATION', plan.duration, 1);
  cell('EXERCISES', String(plan.mainWorkout.length), 2);
  y += cardH + 9;

  if (plan.trainingFormat) {
    setStyle(7.5, 'bold', MUTED);
    doc.text('FORMAT', MARGIN, y);
    y += 5;
    paragraph(plan.trainingFormat, 10.5, INK, 5.2);
    y += 2.5;
  }
  if (plan.goalSummary) {
    paragraph(plan.goalSummary, 10.5, MUTED, 5.2);
    y += 2;
  }

  /* ---- warm-up and cool-down items: the detail line wraps, never runs off the page ---- */
  const routine = (items: RoutineItem[]) => {
    for (const item of items) {
      const detail = lines(item.notes ? `${item.duration}: ${item.notes}` : item.duration, CONTENT_W - 6);
      ensure(5.4 + detail.length * 4.8 + 1.5);
      setStyle(10.5, 'bold', INK);
      doc.text(`•  ${item.movement}`, MARGIN, y);
      y += 5.2;
      setStyle(9.5, 'normal', MUTED);
      doc.text(detail, MARGIN + 5, y);
      y += detail.length * 4.8 + 1.5;
    }
    y += 1.5;
  };

  heading('Warm-up');
  routine(plan.warmup);

  /* ---- exercise cards, each kept whole on one page ---- */
  heading('Exercises');
  plan.mainWorkout.forEach((ex, i) => {
    const inner = CONTENT_W - 10;
    setStyle(11, 'bold', INK);
    const name = lines(`${i + 1}. ${ex.exercise}`, inner);
    setStyle(9, 'bold', ORANGE);
    const meta = lines(exerciseMeta(ex, '  ·  '), inner);
    setStyle(9.5, 'normal', MUTED);
    const cue = ex.notes ? lines(`Cue: ${ex.notes}`, inner) : [];
    const mod = ex.modification ? lines(`Modification: ${ex.modification}`, inner) : [];
    const boxH = 5 + name.length * 5.2 + meta.length * 4.6 + (cue.length + mod.length) * 4.6 + 3.5;
    ensure(boxH + 3);

    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2.5, 2.5, 'FD');
    let innerY = y + 7;
    setStyle(11, 'bold', INK);
    doc.text(name, MARGIN + 5, innerY);
    innerY += name.length * 5.2;
    setStyle(9, 'bold', ORANGE);
    doc.text(meta, MARGIN + 5, innerY);
    innerY += meta.length * 4.6 + 0.6;
    if (cue.length) {
      setStyle(9.5, 'normal', MUTED);
      doc.text(cue, MARGIN + 5, innerY);
      innerY += cue.length * 4.6;
    }
    if (mod.length) {
      setStyle(9.5, 'normal', TEAL);
      doc.text(mod, MARGIN + 5, innerY);
    }
    y += boxH + 3;
  });
  y += 1;

  heading('Cool-down');
  routine(plan.cooldown);

  for (const [label, value] of [
    ['Progression', plan.progression],
    ['Weekly Split', plan.weeklySplitRecommendation],
    ['Trainer Notes', plan.trainerNotes],
  ] as const) {
    if (!value) continue;
    heading(label);
    paragraph(value, 10.5, INK, 5.2);
    y += 2;
  }

  /* ---- disclaimer ---- */
  ensure(24);
  y += 3;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  paragraph(`Disclaimer: ${WORKOUT_DISCLAIMER}`, 8.5, MUTED, 4.2);

  /* ---- call to action ---- */
  ensure(26);
  y += 7;
  setStyle(13, 'bold', INK);
  doc.text('Launch your branded fitness app in minutes', PAGE_W / 2, y, { align: 'center' });
  y += 5;
  const btnW = 62;
  const btnH = 11;
  const btnX = (PAGE_W - btnW) / 2;
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.roundedRect(btnX, y, btnW, btnH, 2.5, 2.5, 'F');
  setStyle(11, 'bold', [255, 255, 255]);
  doc.text('Start for FREE', PAGE_W / 2, y + 7.2, { align: 'center' });
  doc.link(btnX, y, btnW, btnH, { url: PDF_CTA_URL });
  y += btnH + 4;

  /* ---- footers ---- */
  const generated = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setStyle(8, 'normal', MUTED);
    doc.text(`Built with the FitBudd AI Workout Generator · ${generated}`, MARGIN, FOOTER_Y);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

/** Build and trigger the browser download. Returns the file name used. */
export async function downloadWorkoutPdf(plan: WorkoutPlan): Promise<string> {
  const doc = await buildWorkoutPdf(plan);
  const name = pdfFileName(plan);
  doc.save(name);
  return name;
}
