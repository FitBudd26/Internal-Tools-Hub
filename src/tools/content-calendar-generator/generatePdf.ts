import type { jsPDF } from 'jspdf';
import { PLATFORM_SHORT, sortPosts } from './calendarUtils';
import { dateRange, gridWeeks, longDate, parseISODate } from './dateScheduler';
import { PDF_FILE } from './exports';
import { PILLAR_LABELS, type Calendar, type PdfOptions, type Pillar, type Post } from './types';

/**
 * The complete calendar as a professional PDF, built in the browser from the
 * same calendar object the modal edits. Cover with the strategy overview, a
 * visual calendar grid, then every post in full (hook, caption, creative
 * direction, CTA, hashtags, notes, platform versions). White page, FitBudd
 * orange headings, charcoal text, light dividers, Helvetica; US Letter by
 * default, A4 on request; page numbers on every page; headings never sit
 * alone at a page foot and captions are never clipped. jsPDF and the base64
 * logo load on demand.
 */

type RGB = [number, number, number];
const ORANGE: RGB = [255, 122, 0];
const INK: RGB = [37, 50, 56];
const MUTED: RGB = [100, 116, 139];
const RULE: RGB = [229, 231, 235];
const TINT: RGB = [240, 250, 248];
const CELL: RGB = [248, 249, 250];
const TEAL: RGB = [0, 147, 121];
const PILLAR_RGB: Record<Pillar, RGB> = { Educational: TEAL, Engagement: [254, 137, 92], Authority: [55, 65, 81], Promotional: ORANGE };

const PAGE = { letter: { w: 215.9, h: 279.4 }, a4: { w: 210, h: 297 } } as const;
const MARGIN = 16;

/** Characters outside WinAnsi (Helvetica's encoding) are swapped or dropped so nothing renders as a stray glyph. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[–—−]/g, '-')
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/[   ]/g, ' ')
    .replace(/[^ -~¡-ÿ•€\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function buildCalendarPdf(calendar: Calendar, options: PdfOptions): Promise<jsPDF> {
  const [{ jsPDF }, { FITBUDD_LOGO_PNG, FITBUDD_LOGO_RATIO }] = await Promise.all([import('jspdf'), import('../../shared/logo')]);
  const size = PAGE[options.pageSize];
  const PAGE_W = size.w;
  const PAGE_H = size.h;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const FOOTER_Y = PAGE_H - 10;
  const BOTTOM = FOOTER_Y - 7;
  const TOP_NEXT = 22;
  const doc = new jsPDF({ unit: 'mm', format: options.pageSize, compress: true });
  const title = pdfSafe(calendar.calendarTitle);
  const posts = sortPosts(calendar.posts);
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
    doc.text(title, MARGIN, 12);
    doc.text(pdfSafe(calendar.businessType), PAGE_W - MARGIN, 12, { align: 'right' });
    stroke(RULE, 0.25);
    doc.line(MARGIN, 15, PAGE_W - MARGIN, 15);
  };
  const newPage = () => {
    doc.addPage();
    runningHeader();
    y = TOP_NEXT;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  /** Multi-paragraph text: each source line wraps, blank lines stay as spacing, and a long caption flows across pages. */
  const paragraph = (text: string, pt: number, style: 'normal' | 'bold' | 'italic', color: RGB, lineH: number, x = MARGIN, width = CONTENT_W) => {
    setStyle(pt, style, color);
    for (const src of pdfSafe(text).split('\n')) {
      if (!src.trim()) {
        y += lineH * 0.6;
        continue;
      }
      for (const line of lines(src, width)) {
        ensure(lineH);
        doc.text(line, x, y);
        y += lineH;
      }
    }
  };
  const label = (text: string) => {
    ensure(13);
    setStyle(8.5, 'bold', ORANGE);
    doc.text(text.toUpperCase(), MARGIN, y, { charSpace: 0.3 });
    doc.setCharSpace(0);
    y += 4.6;
  };
  const field = (name: string, text: string, pt = 9.5) => {
    if (!text.trim()) return;
    ensure(10);
    setStyle(8, 'bold', MUTED);
    doc.text(name.toUpperCase(), MARGIN, y);
    y += 3.8;
    paragraph(text, pt, 'normal', INK, pt * 0.48);
    y += 1.6;
  };

  /* ---- cover ---- */
  fill(ORANGE);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  const logoW = 24;
  doc.addImage(FITBUDD_LOGO_PNG, 'PNG', PAGE_W - MARGIN - logoW, 12, logoW, logoW * FITBUDD_LOGO_RATIO);
  y = 16;
  setStyle(8.5, 'bold', ORANGE);
  doc.text('FITNESS CONTENT CALENDAR', MARGIN, y, { charSpace: 0.5 });
  doc.setCharSpace(0);
  y += 9;
  paragraph(title, 20, 'bold', INK, 8.2, MARGIN, CONTENT_W - logoW - 6);
  y += 0.5;
  paragraph(`${pdfSafe(calendar.businessType)}  ·  ${dateRange(calendar.startDate, calendar.endDate)}  ·  ${posts.length} planned post${posts.length === 1 ? '' : 's'}  ·  ${calendar.postsPerWeek === 7 ? 'daily' : `${calendar.postsPerWeek} posts per week`}`, 10, 'normal', MUTED, 5.2);
  y += 4;

  const s = calendar.contentStrategy;
  const overview: [string, string][] = [
    ['Business', calendar.businessType],
    ['Niche', calendar.niches.join(', ')],
    ['Audience', s.targetAudience.join(', ')],
    ['Platforms', s.platforms.join(', ')],
    ['Goals', s.goals.join(', ')],
    ['Posting', `${calendar.postsPerWeek === 7 ? 'Daily' : `${calendar.postsPerWeek} posts per week`}, ${calendar.durationDays} days from ${calendar.startDate}`],
    ['Tone', calendar.tone ?? 'Not specified'],
    ['Language', `${calendar.language}${calendar.timezone ? `  ·  ${calendar.timezone}` : ''}`],
  ];
  const keyW = 28;
  const boxH = overview.reduce((h, [, v]) => h + 4.8 * lines(pdfSafe(v), CONTENT_W - keyW - 8).length + 1.2, 6);
  ensure(boxH + 4);
  fill(TINT);
  doc.roundedRect(MARGIN, y - 2, CONTENT_W, boxH, 2, 2, 'F');
  y += 3;
  for (const [k, v] of overview) {
    setStyle(9, 'bold', INK);
    doc.text(k, MARGIN + 4, y);
    setStyle(9, 'normal', INK);
    const vl = lines(pdfSafe(v), CONTENT_W - keyW - 8);
    doc.text(vl, MARGIN + 4 + keyW, y);
    y += 4.8 * vl.length + 1.2;
  }
  y += 6;

  label('Content strategy');
  if (s.summary) {
    paragraph(s.summary, 9.5, 'normal', INK, 4.6);
    y += 2;
  }
  // Pillar table: pillar, target share, planned posts (with a colour swatch).
  const rowH = 6.5;
  ensure(rowH * (s.contentPillars.length + 1) + 4);
  const colX = [MARGIN, MARGIN + 70, MARGIN + 110];
  setStyle(8, 'bold', MUTED);
  doc.text('CONTENT PILLAR', colX[0] + 5, y + 4.3);
  doc.text('TARGET SHARE', colX[1], y + 4.3);
  doc.text('PLANNED POSTS', colX[2], y + 4.3);
  y += rowH;
  for (const p of s.contentPillars) {
    fill(CELL);
    doc.rect(MARGIN, y, CONTENT_W, rowH, 'F');
    fill(PILLAR_RGB[p.name]);
    doc.circle(MARGIN + 2.2, y + rowH / 2, 1.1, 'F');
    setStyle(9.5, 'normal', INK);
    doc.text(PILLAR_LABELS[p.name], colX[0] + 5, y + 4.3);
    doc.text(`${p.targetPercentage}%`, colX[1], y + 4.3);
    doc.text(String(p.plannedPosts), colX[2], y + 4.3);
    y += rowH + 0.8;
  }
  y += 6;

  /* ---- calendar overview grid ---- */
  const weeks = gridWeeks(calendar.startDate, calendar.endDate);
  const byDate = new Map<string, Post[]>();
  for (const p of posts) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  const cellW = CONTENT_W / 7;
  const cellH = 17;
  const gridH = 6 + weeks.length * cellH;
  if (y + 8 + gridH > BOTTOM) newPage();
  label('Calendar overview');
  const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  setStyle(7.5, 'bold', MUTED);
  headers.forEach((h, i) => doc.text(h.toUpperCase(), MARGIN + i * cellW + 1.5, y + 3.5));
  y += 5.5;
  for (const week of weeks) {
    week.forEach((iso, i) => {
      const x = MARGIN + i * cellW;
      stroke(RULE, 0.2);
      if (!iso) {
        fill(CELL);
        doc.rect(x, y, cellW, cellH, 'FD');
        return;
      }
      const dayPosts = byDate.get(iso) ?? [];
      fill(dayPosts.length ? [255, 255, 255] : CELL);
      doc.rect(x, y, cellW, cellH, 'FD');
      const d = parseISODate(iso);
      setStyle(7.5, 'bold', dayPosts.length ? INK : MUTED);
      doc.text(d.getDate() === 1 || iso === calendar.startDate ? `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}` : String(d.getDate()), x + 1.5, y + 3.5);
      let cy = y + 7;
      for (const p of dayPosts.slice(0, 2)) {
        fill(PILLAR_RGB[p.pillar]);
        doc.circle(x + 2.4, cy - 0.9, 0.9, 'F');
        setStyle(6.5, 'bold', INK);
        doc.text(lines(pdfSafe(`${p.platforms.map((x) => PLATFORM_SHORT[x]).join('+')} · ${p.format}`), cellW - 5)[0] ?? '', x + 4.2, cy);
        cy += 2.8;
        setStyle(6.2, 'normal', MUTED);
        doc.text(lines(pdfSafe(p.topic), cellW - 3)[0] ?? '', x + 1.5, cy);
        cy += 3.4;
      }
      if (dayPosts.length > 2) {
        setStyle(6, 'italic', MUTED);
        doc.text(`+${dayPosts.length - 2} more`, x + 1.5, cy);
      }
    });
    y += cellH;
  }
  y += 3;
  setStyle(7.5, 'normal', MUTED);
  const legend = (Object.keys(PILLAR_RGB) as Pillar[]).map((p) => PILLAR_LABELS[p]).join('   ·   ');
  doc.text(pdfSafe(`Dot colours: ${legend}`), MARGIN, y);
  y += 8;

  /* ---- posts ---- */
  newPage();
  label(`Post breakdown  ·  ${posts.length} posts`);
  y += 1;
  posts.forEach((p, i) => {
    if (i > 0) {
      ensure(12);
      stroke(RULE, 0.3);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;
    }
    // Header with room for the meta line and the topic so it never sits alone.
    ensure(26);
    setStyle(10.5, 'bold', INK);
    doc.text(longDate(p.date), MARGIN, y);
    fill(PILLAR_RGB[p.pillar]);
    const pillarText = PILLAR_LABELS[p.pillar];
    setStyle(7.5, 'bold', [255, 255, 255]);
    const pw = doc.getTextWidth(pillarText) + 5;
    doc.roundedRect(PAGE_W - MARGIN - pw, y - 3.6, pw, 5, 1.2, 1.2, 'F');
    doc.text(pillarText, PAGE_W - MARGIN - pw + 2.5, y);
    y += 4.4;
    setStyle(8.5, 'normal', MUTED);
    doc.text(pdfSafe(`${p.platforms.join(' + ')}  ·  ${p.format}  ·  Status: Draft`), MARGIN, y);
    y += 5.5;
    paragraph(p.topic, 12.5, 'bold', ORANGE, 5.6);
    y += 1.5;
    field('Hook', p.hook, 10);
    field('Caption', p.caption);
    field('Visual direction', p.creativeDirection);
    field('CTA', p.cta);
    if (p.hashtags.length) field('Hashtags', p.hashtags.join(' '));
    field('Production notes', p.productionNotes);
    for (const a of p.adaptations) {
      ensure(14);
      setStyle(8.5, 'bold', TEAL);
      doc.text(pdfSafe(`${a.platform} version  ·  ${a.format}`), MARGIN, y);
      y += 4.2;
      if (a.hook) paragraph(a.hook, 9.5, 'italic', INK, 4.6);
      paragraph(a.caption, 9.5, 'normal', INK, 4.6);
      y += 1.6;
    }
    y += 3;
  });

  /* ---- closing note ---- */
  ensure(16);
  stroke(RULE, 0.25);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  paragraph('All posts are AI-written drafts planned for the dates shown. Review every caption before publishing, replace any testimonial template with a real, permissioned client story, and only promote offers you actually run. Exports do not schedule or publish anything.', 8, 'italic', MUTED, 3.8);

  /* ---- footers ---- */
  const pages = doc.getNumberOfPages();
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg);
    const w = 13;
    doc.addImage(FITBUDD_LOGO_PNG, 'PNG', MARGIN, FOOTER_Y - w * FITBUDD_LOGO_RATIO + 1, w, w * FITBUDD_LOGO_RATIO);
    setStyle(7.5, 'normal', MUTED);
    doc.text('Created with FitBudd · fitbudd.com', PAGE_W / 2, FOOTER_Y, { align: 'center' });
    doc.text(`Page ${pg} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
  }
  return doc;
}

/** Build and trigger the browser download. Returns the file name used. */
export async function downloadCalendarPdf(calendar: Calendar, options: PdfOptions): Promise<string> {
  const doc = await buildCalendarPdf(calendar, options);
  doc.save(PDF_FILE);
  return PDF_FILE;
}
