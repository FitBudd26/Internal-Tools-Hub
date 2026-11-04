import { useState } from 'react';
import { CTASection } from '../../shared/components/CTASection';
import { PdfDownloadButton } from '../../shared/components/PdfDownloadButton';
import { ToolMark } from '../../shared/components/ToolMark';
import { ToolModal } from '../../shared/components/ToolModal';
import { FAILURE_MESSAGES, type CalendarFailure } from './aiCalendar';
import { CalendarGrid } from './CalendarGrid';
import { CalendarList } from './CalendarList';
import { summaryLine } from './calendarUtils';
import { ContentPostCard } from './ContentPostCard';
import { ContentPostEditor } from './ContentPostEditor';
import { dateRange } from './dateScheduler';
import { CSV_FILE, downloadCsv, downloadIcs, variantCount } from './exports';
import { downloadCalendarPdf } from './generatePdf';
import { CTA_TEXT, CTA_URL } from './tracking';
import { PILLAR_LABELS, type Calendar, type PdfOptions, type Post } from './types';

interface CalendarResultsModalProps {
  open: boolean;
  calendar: Calendar | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onEditPost: (id: string, patch: Pick<Post, 'topic' | 'hook' | 'caption' | 'cta' | 'creativeDirection' | 'date'>) => void;
  regeneratingPostId: string | null;
  onRegeneratePost: (id: string) => void;
  postError: CalendarFailure | null;
  regenerating: boolean;
  regenerateError: CalendarFailure | null;
  onRegenerate: () => void;
  onChangeSettings: () => void;
  onClose: () => void;
  onPdfDownloaded: (fileName: string) => void;
  onCsvDownloaded: (fileName: string) => void;
  onCtaClick: () => void;
}

const CTA_HIGHLIGHTS = ['Launch your own branded fitness app', 'Sell programs and manage clients', 'Track progress and automate coaching operations'];

function DownloadIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" focusable="false">
      <path d="M8 2.5v8m0 0L5 7.5m3 3l3-3M3 11.5v2h10v-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const secondaryBtn =
  'flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-800 transition-colors hover:border-fb-teal hover:text-fb-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-teal disabled:cursor-wait disabled:opacity-60';
const toggleBtn = (active: boolean) =>
  `h-8 px-3 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fb-teal ${active ? 'bg-fb-teal text-white' : 'bg-white text-gray-700 hover:bg-fb-tint'}`;

/** Screen 3: the calendar in the shared modal, in a grid or a list, with the selected post in full, editing, exports and the FitBudd CTA. */
export function CalendarResultsModal({
  open,
  calendar,
  selectedId,
  onSelect,
  onEditPost,
  regeneratingPostId,
  onRegeneratePost,
  postError,
  regenerating,
  regenerateError,
  onRegenerate,
  onChangeSettings,
  onClose,
  onPdfDownloaded,
  onCsvDownloaded,
  onCtaClick,
}: CalendarResultsModalProps) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [editing, setEditing] = useState(false);
  const [pdf, setPdf] = useState<PdfOptions>({ pageSize: 'letter' });
  const [csvState, setCsvState] = useState<'idle' | 'done'>('idle');
  const [icsState, setIcsState] = useState<'idle' | 'done'>('idle');

  if (!calendar) return null;
  const c = calendar;
  const selected = c.posts.find((p) => p.id === selectedId) ?? c.posts[0];
  const s = c.contentStrategy;

  return (
    <ToolModal
      open={open}
      onClose={onClose}
      icon={<ToolMark size={18} className="shrink-0" />}
      title="Your Content Calendar Is Ready"
      subtitle="Review each post, edit what you like, then download the PDF or CSV."
      footer={
        <CTASection
          headline="Turn Your Content Into Paying Clients"
          body="Plan your content, attract fitness clients, and grow your coaching business with your own branded fitness app."
          highlights={CTA_HIGHLIGHTS}
          ctaText={CTA_TEXT}
          ctaUrl={CTA_URL}
          onCtaClick={onCtaClick}
          microCopy="No credit card required · Built for fitness professionals"
        />
      }
    >
      {/* Summary */}
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        <h3 className="text-base font-bold leading-tight text-gray-900">{c.durationDays}-Day Content Calendar</h3>
        <p className="mt-1 text-[13px] font-semibold text-gray-700">{summaryLine(c)}</p>
        <p className="mt-0.5 text-[12px] text-gray-600">
          {dateRange(c.startDate, c.endDate)} · {c.postsPerWeek === 7 ? 'daily' : `${c.postsPerWeek} posts per week`} · Primary goal: {s.primaryGoal}
        </p>
        {s.summary && <p className="mt-1.5 text-[12px] leading-snug text-gray-600">{s.summary}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {s.contentPillars.map((p) => (
            <span key={p.name} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-700">
              {PILLAR_LABELS[p.name].split(' / ')[0]} {p.targetPercentage}% · {p.plannedPosts}
            </span>
          ))}
        </div>
      </div>
      {c.unfilled > 0 && (
        <p role="status" className="rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-2 text-[12px] leading-snug text-orange-900">
          {c.unfilled} planned {c.unfilled === 1 ? 'post' : 'posts'} could not be written this time and {c.unfilled === 1 ? 'was' : 'were'} left out. Use Regenerate Calendar for a complete set.
        </p>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-gray-900">{c.posts.length} posts · {variantCount(c)} platform versions</span>
        <div role="radiogroup" aria-label="View" className="flex overflow-hidden rounded-lg border border-gray-300">
          <button type="button" role="radio" aria-checked={view === 'calendar'} onClick={() => setView('calendar')} className={toggleBtn(view === 'calendar')}>
            Calendar
          </button>
          <button type="button" role="radio" aria-checked={view === 'list'} onClick={() => setView('list')} className={toggleBtn(view === 'list')}>
            List
          </button>
        </div>
      </div>
      {view === 'calendar' ? <CalendarGrid calendar={c} selectedId={selected.id} onSelect={onSelect} /> : <CalendarList calendar={c} selectedId={selected.id} onSelect={onSelect} />}

      {/* Selected post */}
      {editing ? (
        <ContentPostEditor
          key={selected.id}
          post={selected}
          onSave={(patch) => {
            onEditPost(selected.id, patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <ContentPostCard post={selected} regenerating={regeneratingPostId === selected.id} onEdit={() => setEditing(true)} onRegenerate={() => onRegeneratePost(selected.id)} />
      )}
      {postError && !regeneratingPostId && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-center text-[12px] leading-snug text-red-700">
          {FAILURE_MESSAGES[postError]}
        </p>
      )}

      {/* Exports */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-gray-600">
        <span className="font-semibold text-gray-900">PDF page size</span>
        <div role="radiogroup" aria-label="Page size" className="flex overflow-hidden rounded-lg border border-gray-300">
          {(['letter', 'a4'] as const).map((size) => (
            <button key={size} type="button" role="radio" aria-checked={pdf.pageSize === size} onClick={() => setPdf({ pageSize: size })} className={toggleBtn(pdf.pageSize === size)}>
              {size === 'letter' ? 'US Letter' : 'A4'}
            </button>
          ))}
        </div>
      </div>
      <PdfDownloadButton onDownload={() => downloadCalendarPdf(c, pdf)} onDownloaded={onPdfDownloaded} icon={<DownloadIcon />} label="Download PDF" ariaLabel="Download the complete calendar as a PDF" />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            onCsvDownloaded(downloadCsv(c));
            setCsvState('done');
            window.setTimeout(() => setCsvState('idle'), 2000);
          }}
          className={secondaryBtn}
          aria-label={`Download the calendar as ${CSV_FILE}`}
        >
          {csvState === 'done' ? '✓ CSV downloaded' : 'Download CSV'}
        </button>
        <button
          type="button"
          onClick={() => {
            downloadIcs(c);
            setIcsState('done');
            window.setTimeout(() => setIcsState('idle'), 2000);
          }}
          className={secondaryBtn}
          aria-label="Download the calendar as an .ics file for Google Calendar, Outlook or Apple Calendar"
        >
          {icsState === 'done' ? '✓ .ics downloaded' : 'Download .ics'}
        </button>
      </div>
      <p className="-mt-1 text-center text-[11px] text-gray-400">CSV opens in Google Sheets and Excel, one row per platform version. Exports include your edits; nothing is scheduled or published for you.</p>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          aria-busy={regenerating}
          className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-wait disabled:opacity-60 disabled:hover:no-underline"
        >
          {regenerating ? 'Building a new calendar…' : '↻ Regenerate Calendar'}
        </button>
        <button type="button" onClick={onChangeSettings} className="rounded text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange">
          Change settings
        </button>
      </div>
      {regenerateError && !regenerating && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-center text-[12px] leading-snug text-red-700">
          {FAILURE_MESSAGES[regenerateError]}
        </p>
      )}

      <p className="border-t border-gray-100 pt-2 text-[11px] leading-snug text-gray-400">
        Every post is an AI-written draft. Review captions before publishing, replace any testimonial template with a real, permissioned client story, and only promote offers you actually run.
      </p>
    </ToolModal>
  );
}
