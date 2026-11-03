import type { jsPDF } from 'jspdf';
import type { IntakeQuestion, IntakeSection, PdfOptions, Questionnaire } from './types';
import { countQuestions, estimateMinutes, pdfFileName } from './questionUtils';

/**
 * Client-ready intake questionnaire PDF, built in the browser from the same
 * questionnaire object the preview edits (so every edit is in the PDF).
 * Editorial document style: white page, FitBudd orange section accents,
 * charcoal text, light writing lines and checkboxes, Helvetica throughout.
 * US Letter by default, A4 on request; a question and its answer area are
 * never split across pages; headings never sit alone at a page foot.
 * jsPDF and the base64 logo load on demand so the tool's bundle stays small.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const INK: RGB = [37, 50, 56];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [209, 213, 219];
const RULE: RGB = [229, 231, 235];
const BOX: RGB = [148, 163, 184];
const TINT: RGB = [240, 250, 248];

const PAGE = { letter: { w: 215.9, h: 279.4 }, a4: { w: 210, h: 297 } } as const;
const MARGIN = 18;
const NUM_W = 8;
const CHECK = 3.8;

/** Characters outside WinAnsi (Helvetica's encoding) are swapped or dropped so nothing renders as a stray glyph. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[–—−]/g, '-')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/[   ]/g, ' ')
    .replace(/[^ -~¡-ÿ•€]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function buildIntakePdf(questionnaire: Questionnaire, options: PdfOptions): Promise<jsPDF> {
  const [{ jsPDF }, { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO }] = await Promise.all([import('jspdf'), import('../../shared/logo')]);
  const size = PAGE[options.pageSize];
  const PAGE_W = size.w;
  const PAGE_H = size.h;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_Y = PAGE_H - 11;
  const BOTTOM = FOOTER_Y - 9;
  const TOP_NEXT = 24;
  const doc = new jsPDF({ unit: 'mm', format: options.pageSize, compress: true });
  const title = pdfSafe(questionnaire.formTitle) || 'Client Intake Form';
  const coachName = pdfSafe(options.coachName);
  const dateHint = options.pageSize === 'letter' ? 'month / day / year' : 'day / month / year';
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
  const lines = (text: string, width: number): string[] => doc.splitTextToSize(text, width) as string[];
  const box = (x: number, top: number) => {
    stroke(BOX, 0.3);
    doc.roundedRect(x, top, CHECK, CHECK, 0.6, 0.6);
  };
  const radio = (x: number, top: number) => {
    stroke(BOX, 0.3);
    doc.circle(x + CHECK / 2, top + CHECK / 2, CHECK / 2);
  };
  const writingLine = (x: number, at: number, w: number) => {
    stroke(LINE, 0.25);
    doc.line(x, at, x + w, at);
  };

  const runningHeader = () => {
    setStyle(8.5, 'normal', MUTED);
    doc.text(title, MARGIN, 13);
    if (coachName) doc.text(coachName, PAGE_W - MARGIN, 13, { align: 'right' });
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
    for (const line of lines(text, width)) {
      ensure(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  /* ---- a question with its answer area: measured first, drawn when it fits ---- */
  const renderQuestion = (q: IntakeQuestion, num: number, draw: boolean): number => {
    let cy = y;
    const textX = MARGIN + NUM_W;
    const ack = q.type === 'acknowledgment';
    const bodyX = ack ? textX + CHECK + 2.5 : textX;
    const bodyW = CONTENT_W - NUM_W - (ack ? CHECK + 2.5 : 0);

    setStyle(10.5, 'normal', INK);
    const qLines = lines(pdfSafe(q.question), bodyW);
    if (draw) {
      setStyle(10.5, 'bold', INK);
      doc.text(`${num}.`, MARGIN, cy);
      if (ack) box(textX, cy - CHECK + 0.6);
      setStyle(10.5, 'normal', INK);
      doc.text(qLines, bodyX, cy);
      if (q.required) {
        const last = qLines[qLines.length - 1] ?? '';
        const lastW = doc.getTextWidth(last);
        setStyle(10.5, 'bold', ORANGE);
        doc.text('*', bodyX + lastW + 1, cy + (qLines.length - 1) * 5);
      }
    }
    cy += 5 * qLines.length;

    const hints: string[] = [];
    if (q.helpText) hints.push(pdfSafe(q.helpText));
    if (q.type === 'single_select') hints.push('Select one.');
    if (q.type === 'multi_select') hints.push('Select all that apply.');
    if (hints.length) {
      setStyle(8.5, 'italic', MUTED);
      const hl = lines(hints.join(' '), bodyW);
      if (draw) doc.text(hl, bodyX, cy);
      cy += 4 * hl.length;
    }
    cy += 1.5;

    switch (q.type) {
      case 'short_text':
      case 'number':
      case 'date': {
        const w = q.type === 'short_text' ? bodyW : q.type === 'number' ? Math.min(60, bodyW) : Math.min(70, bodyW);
        cy += 5;
        if (draw) {
          writingLine(bodyX, cy, w);
          if (q.type === 'date') {
            setStyle(7.5, 'normal', MUTED);
            doc.text(dateHint, bodyX + w + 3, cy);
          }
        }
        cy += 2.5;
        break;
      }
      case 'long_text': {
        for (let i = 0; i < 3; i++) {
          cy += 6.5;
          if (draw) writingLine(bodyX, cy, bodyW);
        }
        cy += 2;
        break;
      }
      case 'yes_no': {
        cy += 0.5;
        if (draw) {
          box(bodyX, cy);
          box(bodyX + 26, cy);
          setStyle(10, 'normal', INK);
          doc.text('Yes', bodyX + CHECK + 2.5, cy + 3);
          doc.text('No', bodyX + 26 + CHECK + 2.5, cy + 3);
        }
        cy += CHECK + 3;
        break;
      }
      case 'single_select':
      case 'multi_select': {
        const opts = q.options.map(pdfSafe).filter(Boolean);
        const twoCol = opts.length >= 4 && opts.every((o) => o.length <= 30) && bodyW >= 120;
        const colW = twoCol ? bodyW / 2 : bodyW;
        const optW = colW - CHECK - 4;
        setStyle(10, 'normal', INK);
        const rows: string[][][] = [];
        for (let i = 0; i < opts.length; i += twoCol ? 2 : 1) {
          rows.push(opts.slice(i, i + (twoCol ? 2 : 1)).map((o) => lines(o, optW)));
        }
        cy += 0.5;
        for (const row of rows) {
          const rowH = Math.max(...row.map((ls) => ls.length)) * 4.6 + 1.6;
          if (draw) {
            row.forEach((ls, col) => {
              const x = bodyX + col * colW;
              (q.type === 'single_select' ? radio : box)(x, cy);
              setStyle(10, 'normal', INK);
              doc.text(ls, x + CHECK + 2.5, cy + 3);
            });
          }
          cy += rowH;
        }
        cy += 1;
        break;
      }
      case 'rating': {
        const [lo, hi] = q.scaleLabels ?? ['Low', 'High'];
        cy += 3;
        for (let k = 0; k < 5; k++) {
          const x = bodyX + k * 12;
          if (draw) {
            setStyle(8, 'normal', MUTED);
            doc.text(String(k + 1), x + CHECK / 2, cy - 0.8, { align: 'center' });
            box(x, cy);
          }
        }
        cy += CHECK + 4.5;
        setStyle(8.5, 'italic', MUTED);
        const label = lines(`1 = ${pdfSafe(lo)}   ·   5 = ${pdfSafe(hi)}`, bodyW);
        if (draw) doc.text(label, bodyX, cy);
        cy += 4 * label.length - 1;
        break;
      }
      case 'acknowledgment':
        cy += 0.5;
        break;
    }
    cy += 4;
    const h = cy - y;
    if (draw) y = cy;
    return h;
  };

  const sectionHeading = (s: IntakeSection, index: number, draw: boolean): number => {
    let cy = y + 2;
    setStyle(13, 'bold', ORANGE);
    const t = lines(`${index + 1}. ${pdfSafe(s.title)}`.toUpperCase(), CONTENT_W);
    if (draw) doc.text(t, MARGIN, cy + 4.5);
    cy += 6 * t.length + 1;
    const desc = pdfSafe(s.description);
    if (desc) {
      setStyle(9.5, 'normal', MUTED);
      const dl = lines(desc, CONTENT_W);
      if (draw) doc.text(dl, MARGIN, cy + 2.5);
      cy += 4.4 * dl.length + 1;
    }
    if (draw) {
      stroke(ORANGE, 0.5);
      doc.line(MARGIN, cy + 1.5, MARGIN + 14, cy + 1.5);
      stroke(RULE, 0.25);
      doc.line(MARGIN + 14, cy + 1.5, PAGE_W - MARGIN, cy + 1.5);
    }
    cy += 7;
    const h = cy - y;
    if (draw) y = cy;
    return h;
  };

  /* ---- page 1: cover block ---- */
  doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  const logoBoxW = 34;
  let logoW = 0;
  if (options.coachLogo) {
    const maxW = logoBoxW;
    const maxH = 14;
    let w = maxW;
    let h = w * options.coachLogo.ratio;
    if (h > maxH) {
      h = maxH;
      w = h / Math.max(options.coachLogo.ratio, 0.01);
    }
    doc.addImage(options.coachLogo.dataUrl, options.coachLogo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG', PAGE_W - MARGIN - w, 13, w, h);
    logoW = w;
  } else {
    logoW = 24;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', PAGE_W - MARGIN - logoW, 13, logoW, logoW * FITBUDD_LOGO_RATIO);
  }
  y = 17;
  setStyle(8.5, 'bold', ORANGE);
  doc.text('CLIENT INTAKE QUESTIONNAIRE', MARGIN, y, { charSpace: 0.5 });
  doc.setCharSpace(0);
  y += 9;
  paragraph(title, 21, 'bold', INK, 8.5, MARGIN, CONTENT_W - logoW - 6);
  if (coachName) {
    y += 1;
    paragraph(`Prepared by ${coachName}`, 10.5, 'normal', MUTED, 5.5);
  }
  if (questionnaire.formDescription) {
    y += 2;
    paragraph(pdfSafe(questionnaire.formDescription), 10, 'normal', INK, 5);
  }
  const count = countQuestions(questionnaire);
  y += 1;
  paragraph(`${count} questions in ${questionnaire.sections.length} sections, about ${estimateMinutes(count)} minutes to complete. Questions marked * are required.`, 8.5, 'italic', MUTED, 4.2);

  // Client name + date on one row inside a tinted panel.
  y += 4;
  doc.setFillColor(TINT[0], TINT[1], TINT[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, 'F');
  const nameW = CONTENT_W * 0.58;
  setStyle(9, 'bold', INK);
  doc.text('Client name', MARGIN + 4, y + 6);
  doc.text('Date', MARGIN + 4 + nameW + 4, y + 6);
  writingLine(MARGIN + 4, y + 12.5, nameW - 8);
  writingLine(MARGIN + 4 + nameW + 4, y + 12.5, CONTENT_W - nameW - 12);
  setStyle(7.5, 'normal', MUTED);
  doc.text(dateHint, MARGIN + 4 + nameW + 4, y + 15.3);
  y += 16 + 8;

  /* ---- sections ---- */
  let num = 0;
  questionnaire.sections.forEach((section, si) => {
    const headH = sectionHeading(section, si, false);
    const firstH = section.questions.length ? renderQuestion(section.questions[0], num + 1, false) : 0;
    ensure(headH + Math.min(firstH, BOTTOM - TOP_NEXT - headH));
    sectionHeading(section, si, true);
    for (const q of section.questions) {
      num += 1;
      const h = renderQuestion(q, num, false);
      if (y + h > BOTTOM && h <= BOTTOM - TOP_NEXT) newPage();
      renderQuestion(q, num, true);
    }
    y += 2;
  });

  /* ---- notes area + closing line ---- */
  const notesH = 9 + 4 * 7 + 2;
  ensure(notesH + 12);
  setStyle(11, 'bold', INK);
  doc.text('Anything else you would like your coach to know?', MARGIN, y + 4);
  y += 9;
  for (let i = 0; i < 4; i++) {
    writingLine(MARGIN, y, CONTENT_W);
    y += 7;
  }
  y += 4;
  paragraph(
    'This questionnaire helps your coach plan your sessions. It is not a medical screening tool: please discuss any health concerns with your doctor or healthcare provider.',
    8,
    'italic',
    MUTED,
    4,
  );

  /* ---- footers ---- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const w = 13;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', MARGIN, FOOTER_Y - w * FITBUDD_LOGO_RATIO + 1, w, w * FITBUDD_LOGO_RATIO);
    setStyle(8, 'normal', MUTED);
    doc.text('Created with FitBudd · fitbudd.com', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${p} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

/** Build and trigger the browser download. Returns the file name used. */
export async function downloadIntakePdf(questionnaire: Questionnaire, options: PdfOptions): Promise<string> {
  const doc = await buildIntakePdf(questionnaire, options);
  const name = pdfFileName(questionnaire);
  doc.save(name);
  return name;
}
