import type { Calendar, Post } from './types.js';
import { sortPosts } from './calendarUtils.js';

/**
 * CSV and .ics exports built from the same calendar object the modal edits.
 * CSV: UTF-8 with BOM (Excel), RFC 4180 quoting, line breaks kept inside
 * quoted cells, spreadsheet formula injection neutralised, one row per
 * post-platform variant (the main post, then each adaptation).
 */

export const CSV_FILE = 'fitbudd-fitness-content-calendar.csv';
export const ICS_FILE = 'fitbudd-fitness-content-calendar.ics';
export const PDF_FILE = 'fitbudd-fitness-content-calendar.pdf';

export const CSV_COLUMNS = ['Date', 'Day', 'Platform', 'Content Pillar', 'Format', 'Topic', 'Hook', 'Caption', 'Creative Direction', 'CTA', 'Hashtags', 'Production Notes', 'Status'] as const;

/** A cell that a spreadsheet could read as a formula gets a leading apostrophe so it stays text. */
export function csvCell(value: string): string {
  let v = value.replace(/\r\n?/g, '\n');
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function csvRows(c: Calendar): string[][] {
  const rows: string[][] = [];
  for (const p of sortPosts(c.posts)) {
    rows.push([p.date, p.day, p.platforms[0], p.pillar, p.format, p.topic, p.hook, p.caption, p.creativeDirection, p.cta, p.hashtags.join(' '), p.productionNotes, 'Draft']);
    for (const a of p.adaptations) {
      rows.push([p.date, p.day, a.platform, p.pillar, a.format, p.topic, a.hook || p.hook, a.caption, p.creativeDirection, p.cta, '', p.productionNotes, 'Draft']);
    }
  }
  return rows;
}

export function buildCsv(c: Calendar): string {
  const lines = [CSV_COLUMNS.map(csvCell).join(','), ...csvRows(c).map((r) => r.map(csvCell).join(','))];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/* ----------------------------------- ics ---------------------------------- */

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line: string): string => {
  // RFC 5545: lines over 75 octets are folded with CRLF + space.
  const out: string[] = [];
  let rest = line;
  while (rest.length > 70) {
    out.push(rest.slice(0, 70));
    rest = ` ${rest.slice(70)}`;
  }
  out.push(rest);
  return out.join('\r\n');
};

function icsDate(iso: string, plusDays = 0): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + plusDays));
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, '0')}${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** All-day events, one per post (platform adaptations are in the description, not separate events). */
export function buildIcs(c: Calendar, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FitBudd//Fitness Content Calendar Generator//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(c.calendarTitle)}`];
  for (const p of sortPosts(c.posts)) {
    const description = [`Hook: ${p.hook}`, '', p.caption, '', `CTA: ${p.cta}`, p.hashtags.length ? `Hashtags: ${p.hashtags.join(' ')}` : '', `Creative direction: ${p.creativeDirection}`, ...p.adaptations.map((a) => `${a.platform} version: ${a.caption}`)].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${p.id}-${c.startDate}@fitbudd-content-calendar`),
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(p.date)}`,
      `DTEND;VALUE=DATE:${icsDate(p.date, 1)}`,
      fold(`SUMMARY:${icsEscape(`${p.platforms.join(' + ')} · ${p.format}: ${p.topic}`)}`),
      fold(`DESCRIPTION:${icsEscape(description)}`),
      fold(`CATEGORIES:${icsEscape(p.pillar)}`),
      'STATUS:TENTATIVE',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/* -------------------------------- download -------------------------------- */

/** Browser download of a text file (works inside a cross-origin iframe). */
export function downloadText(fileName: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadCsv(c: Calendar): string {
  downloadText(CSV_FILE, buildCsv(c), 'text/csv');
  return CSV_FILE;
}

export function downloadIcs(c: Calendar): string {
  downloadText(ICS_FILE, buildIcs(c), 'text/calendar');
  return ICS_FILE;
}

export function postCount(c: Calendar): number {
  return c.posts.length;
}

export function variantCount(c: Calendar): number {
  return c.posts.reduce((n, p: Post) => n + 1 + p.adaptations.length, 0);
}
