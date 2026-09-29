import type { jsPDF } from 'jspdf';
import type { Challenge, DailyRule } from './types';
import { slugify } from './generateChallenge';
import { CHALLENGE_DISCLAIMER } from '../../shared/disclaimers';

/**
 * Client-ready, coach-branding-neutral PDF of the challenge. jsPDF is loaded
 * on demand so the tool's initial bundle stays small; nothing touches a server.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const INK: RGB = [17, 24, 39];
const MUTED: RGB = [107, 114, 128];
const LINE: RGB = [229, 231, 235];
const TINT: RGB = [240, 250, 248];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 10;

export function pdfFileName(challenge: Challenge): string {
  return `${slugify(challenge.challengeName)}.pdf`;
}

export async function buildChallengePdf(challenge: Challenge): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const newPage = () => {
    doc.addPage();
    y = MARGIN;
  };
  const ensure = (height: number) => {
    if (y + height > FOOTER_Y - 8) newPage();
  };
  const setStyle = (size: number, style: 'normal' | 'bold', color: RGB) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const lines = (text: string, width: number): string[] =>
    doc.splitTextToSize(text, width) as string[];
  const write = (text: string, size: number, style: 'normal' | 'bold', color: RGB, lineH: number, x = MARGIN, width = CONTENT_W) => {
    setStyle(size, style, color);
    for (const line of lines(text, width)) {
      ensure(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  /* ---- cover block ---- */
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(0, 0, PAGE_W, 7, 'F');
  y = 32;
  setStyle(9, 'bold', ORANGE);
  doc.text('FITNESS CHALLENGE FRAMEWORK', MARGIN, y);
  y += 9;
  write(challenge.challengeName, 24, 'bold', INK, 10);
  y += 1;
  write(challenge.subtitle, 12, 'normal', MUTED, 6);
  y += 6;
  for (const [key, value] of [
    ['Designed for', challenge.designedFor],
    ['Level', challenge.level],
    ['Duration', challenge.duration],
  ] as const) {
    setStyle(10, 'bold', INK);
    doc.text(key, MARGIN, y);
    setStyle(10, 'normal', MUTED);
    const valueLines = lines(value, CONTENT_W - 34);
    doc.text(valueLines, MARGIN + 34, y);
    y += 5.5 * valueLines.length + 1;
  }
  y += 3;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 9;

  /* ---- section helpers ---- */
  const heading = (text: string) => {
    ensure(16);
    y += 2;
    setStyle(13, 'bold', ORANGE);
    doc.text(text, MARGIN, y);
    y += 7;
  };
  const paragraph = (text: string) => {
    write(text, 10.5, 'normal', INK, 5.2);
    y += 2.5;
  };
  const bullet = (text: string, indent = 0) => {
    const x = MARGIN + indent;
    setStyle(10.5, 'normal', INK);
    const body = lines(text, CONTENT_W - indent - 5);
    ensure(5.2 * body.length);
    doc.text('•', x, y);
    doc.text(body, x + 5, y);
    y += 5.2 * body.length + 1;
  };
  const numbered = (rules: DailyRule[]) => {
    rules.forEach((rule, i) => {
      ensure(14);
      setStyle(10.5, 'bold', INK);
      const title = lines(`${i + 1}. ${rule.title}`, CONTENT_W);
      doc.text(title, MARGIN, y);
      y += 5.2 * title.length;
      for (const detail of rule.details) bullet(detail, 6);
      y += 1.5;
    });
  };

  /* ---- day-by-day check-in grid ---- */
  const tracker = () => {
    paragraph('Tick each completed action. A day counts when all four are done.');
    const cols = [
      { label: 'Day', w: 14 },
      { label: 'Session', w: 22 },
      { label: 'Movement', w: 22 },
      { label: 'Habit check', w: 24 },
      { label: 'Check-in', w: 22 },
      { label: 'Notes', w: CONTENT_W - 14 - 22 - 22 - 24 - 22 },
    ];
    const rowH = 8;
    const header = () => {
      doc.setFillColor(TINT[0], TINT[1], TINT[2]);
      doc.rect(MARGIN, y - 5.5, CONTENT_W, rowH, 'F');
      setStyle(9, 'bold', INK);
      let x = MARGIN;
      for (const c of cols) {
        doc.text(c.label, x + 2, y);
        x += c.w;
      }
      y += rowH;
    };
    ensure(rowH * 3);
    header();
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    for (let day = 1; day <= challenge.durationDays; day++) {
      if (y + rowH > FOOTER_Y - 8) {
        newPage();
        header();
      }
      setStyle(9.5, 'normal', INK);
      doc.text(String(day), MARGIN + 2, y);
      let x = MARGIN + cols[0].w;
      for (let c = 1; c <= 4; c++) {
        doc.rect(x + cols[c].w / 2 - 1.75, y - 3.5, 3.5, 3.5); // empty check box
        x += cols[c].w;
      }
      doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);
      y += rowH;
    }
    y += 3;
  };

  for (const section of challenge.pdfSections) {
    heading(section.heading);
    if (section.tracker) tracker();
    section.paragraphs?.forEach(paragraph);
    section.bullets?.forEach((b) => bullet(b));
    if (section.numbered) numbered(section.numbered);
  }

  /* ---- disclaimer ---- */
  ensure(20);
  y += 2;
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  write(`Disclaimer: ${CHALLENGE_DISCLAIMER}`, 8.5, 'normal', MUTED, 4.2);

  /* ---- footers ---- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    setStyle(8, 'normal', MUTED);
    doc.text(challenge.challengeName, MARGIN, FOOTER_Y);
    doc.text('fitbudd.com', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

/** Build and trigger the browser download. Returns the file name used. */
export async function downloadChallengePdf(challenge: Challenge): Promise<string> {
  const doc = await buildChallengePdf(challenge);
  const name = pdfFileName(challenge);
  doc.save(name);
  return name;
}
