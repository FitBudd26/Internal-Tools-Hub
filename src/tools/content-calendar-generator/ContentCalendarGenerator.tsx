import { useEffect, useRef, useState } from 'react';
import { ToolMark } from '../../shared/components/ToolMark';
import { initAttribution } from '../../shared/lib/attribution';
import { generateCalendar, regeneratePost, type CalendarFailure } from './aiCalendar';
import { CalendarInputForm } from './CalendarInputForm';
import { CalendarResultsModal } from './CalendarResultsModal';
import { replacePost, slotFromPost, updatePost } from './calendarUtils';
import { EmailCaptureGate, type ProgressStage } from './EmailCaptureGate';
import { TOOL, trackCsvDownload, trackCtaClick, trackGenerated, trackLead, trackPdfDownload, trackRegenerated } from './tracking';
import { DEFAULT_FREQUENCY, type Calendar, type CalendarConfig, type LeadDetails, type Post } from './types';

const EMPTY_CONFIG: CalendarConfig = {
  businessType: null,
  niches: [],
  audiences: [],
  platforms: [],
  goals: [],
  duration: '30 Days',
  frequency: DEFAULT_FREQUENCY,
  tone: null,
  formats: [],
  offer: '',
  promotions: '',
  instructions: '',
  startDate: '',
  language: 'English',
};

const EMPTY_LEAD: LeadDetails = { fullName: '', email: '' };

type Pending = 'idle' | 'generate' | 'regenerate';

/** One line for the gate: "Personal Trainer · Strength Training · Instagram · 14 Days". */
function describe(c: CalendarConfig): string {
  return [c.businessType, c.niches.slice(0, 2).join(', ') + (c.niches.length > 2 ? ` +${c.niches.length - 2}` : ''), c.platforms.join(' + '), c.duration].filter(Boolean).join(' · ');
}

/** The lead and the settings it was sent with; the lead is only re-sent when either changes. */
function leadKey(c: CalendarConfig, lead: LeadDetails): string {
  return JSON.stringify([lead.email.trim().toLowerCase(), c.businessType, c.niches, c.audiences, c.platforms, c.goals, c.duration, c.frequency, c.tone, c.formats, c.offer.trim(), c.promotions.trim(), c.instructions.trim(), c.startDate, c.language]);
}

/**
 * Three screens in one compact card: content strategy inputs, the HubSpot lead
 * gate, and the calendar in the shared modal. Selections survive going back;
 * results stay in memory while editing; Gemini is only asked after the gate,
 * and regenerating (the calendar or one post) never resubmits the lead.
 */
export function ContentCalendarGenerator() {
  const [step, setStep] = useState<'config' | 'gate'>('config');
  const [config, setConfig] = useState<CalendarConfig>(EMPTY_CONFIG);
  const [lead, setLead] = useState<LeadDetails>(EMPTY_LEAD);
  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [stage, setStage] = useState<ProgressStage>('strategy');
  const [gateError, setGateError] = useState<CalendarFailure | null>(null);
  const [regenerateError, setRegenerateError] = useState<CalendarFailure | null>(null);
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | null>(null);
  const [postError, setPostError] = useState<CalendarFailure | null>(null);
  const [variant, setVariant] = useState(0);
  const [resultKey, setResultKey] = useState('');
  const sentLeadKey = useRef('');
  const postVariant = useRef(0);

  useEffect(() => {
    initAttribution(TOOL);
  }, []);

  // The route plans the strategy first and then writes the posts; the gate's progress copy follows the same order.
  useEffect(() => {
    if (pending !== 'generate') return;
    setStage('strategy');
    const t = window.setTimeout(() => setStage('calendar'), 2500);
    return () => window.clearTimeout(t);
  }, [pending]);

  const currentKey = leadKey(config, lead);
  const hasResult = calendar !== null && resultKey === currentKey;

  const handleGateSubmit = async () => {
    if (pending !== 'idle') return;
    setPending('generate');
    setGateError(null);
    try {
      // 1. The lead goes to HubSpot first (fire-and-forget, never blocks the result, never repeated for the same details).
      if (sentLeadKey.current !== currentKey) {
        trackLead(config, lead);
        sentLeadKey.current = currentKey;
      }
      // 2. Then Gemini writes the calendar; nothing is shown until the answer is validated.
      const result = await generateCalendar(config, 0);
      if (!result.ok) {
        setGateError(result.error);
        return;
      }
      setCalendar(result.calendar);
      setSelectedId(result.calendar.posts[0]?.id ?? '');
      setResultKey(currentKey);
      setVariant(0);
      setRegenerateError(null);
      setPostError(null);
      setModalOpen(true);
      trackGenerated(lead.email, result.calendar);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !calendar) return;
    setPending('regenerate');
    setRegenerateError(null);
    try {
      const next = variant + 1;
      const result = await generateCalendar(config, next, calendar.posts.map((p) => p.topic));
      if (!result.ok) {
        setRegenerateError(result.error);
        return;
      }
      setVariant(next);
      setCalendar(result.calendar);
      setSelectedId(result.calendar.posts[0]?.id ?? '');
      trackRegenerated(lead.email, result.calendar);
    } finally {
      setPending('idle');
    }
  };

  const handleRegeneratePost = async (id: string) => {
    if (!calendar || regeneratingPostId) return;
    const post = calendar.posts.find((p) => p.id === id);
    if (!post) return;
    setRegeneratingPostId(id);
    setPostError(null);
    try {
      postVariant.current += 1;
      const avoid = calendar.posts.filter((p) => p.id !== id).map((p) => p.topic).concat(post.topic);
      const result = await regeneratePost(config, slotFromPost(post, postVariant.current), postVariant.current, avoid);
      if (!result.ok) {
        setPostError(result.error);
        return;
      }
      setCalendar((c) => (c ? replacePost(c, { ...result.post, date: post.date, day: post.day }) : c));
    } finally {
      setRegeneratingPostId(null);
    }
  };

  const handleEditPost = (id: string, patch: Pick<Post, 'topic' | 'hook' | 'caption' | 'cta' | 'creativeDirection' | 'date'>) => {
    setCalendar((c) => (c ? updatePost(c, id, patch) : c));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col gap-2.5">
        <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
          <ToolMark size={20} className="shrink-0" />
          <span className="truncate">Fitness Content Calendar Generator</span>
        </h1>

        {step === 'config' ? (
          <CalendarInputForm
            config={config}
            onChange={setConfig}
            onSubmit={() => {
              setGateError(null);
              setStep('gate');
            }}
          />
        ) : (
          <EmailCaptureGate
            lead={lead}
            onChange={setLead}
            summary={describe(config)}
            pending={pending === 'generate'}
            stage={stage}
            error={gateError}
            hasResult={hasResult}
            onSubmit={handleGateSubmit}
            onOpenResult={() => setModalOpen(true)}
            onBack={() => setStep('config')}
          />
        )}
      </div>

      <CalendarResultsModal
        open={modalOpen}
        calendar={calendar}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onEditPost={handleEditPost}
        regeneratingPostId={regeneratingPostId}
        onRegeneratePost={handleRegeneratePost}
        postError={postError}
        regenerating={pending === 'regenerate'}
        regenerateError={regenerateError}
        onRegenerate={handleRegenerate}
        onChangeSettings={() => {
          setModalOpen(false);
          setStep('config');
        }}
        onClose={() => setModalOpen(false)}
        onPdfDownloaded={() => trackPdfDownload(lead.email)}
        onCsvDownloaded={() => trackCsvDownload(lead.email)}
        onCtaClick={() => trackCtaClick(lead.email)}
      />
    </div>
  );
}
