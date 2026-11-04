import { useEffect, useRef, useState } from 'react';
import { ToolMark } from '../../shared/components/ToolMark';
import { generateIntakeForm, type IntakeFailure } from './aiIntake';
import { initAttribution } from '../../shared/lib/attribution';
import { EmailCaptureGate } from './EmailCaptureGate';
import { IntakeResultsModal } from './IntakeResultsModal';
import { trackCtaClick, trackGenerated, trackLead, trackPdfDownload, trackRegenerated } from './tracking';
import { TrainerConfiguration } from './TrainerConfiguration';
import { FORM_LENGTH_LABELS, type LeadDetails, type Questionnaire, type TrainerConfig } from './types';

const EMPTY_CONFIG: TrainerConfig = {
  businessType: null,
  specializations: [],
  clientele: [],
  format: null,
  length: 'standard',
  requirements: '',
};

const EMPTY_LEAD: LeadDetails = { fullName: '', email: '' };

type Pending = 'idle' | 'generate' | 'regenerate';

/** One line for the gate: "Online Fitness Coach · Weight Loss / Fat Loss +1 · Standard Intake". */
function describe(c: TrainerConfig): string {
  const specs = c.specializations.slice(0, 2).join(', ') + (c.specializations.length > 2 ? ` +${c.specializations.length - 2}` : '');
  return [c.businessType, specs, FORM_LENGTH_LABELS[c.length].split(' ·')[0]].filter(Boolean).join(' · ');
}

/** The lead and the settings it was sent with; the lead is only re-sent when either changes. */
function leadKey(c: TrainerConfig, lead: LeadDetails): string {
  return JSON.stringify([lead.email.trim().toLowerCase(), c.businessType, c.specializations, c.clientele, c.format, c.length, c.requirements.trim()]);
}

/**
 * Three screens in one compact card: trainer configuration, the HubSpot lead
 * gate, and the generated form in the shared modal. Selections survive going
 * back; results stay in memory while editing; Gemini is only asked after the
 * gate, and regenerating never resubmits the lead.
 */
export function IntakeFormGenerator() {
  const [step, setStep] = useState<'config' | 'gate'>('config');
  const [config, setConfig] = useState<TrainerConfig>(EMPTY_CONFIG);
  const [lead, setLead] = useState<LeadDetails>(EMPTY_LEAD);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [gateError, setGateError] = useState<IntakeFailure | null>(null);
  const [regenerateError, setRegenerateError] = useState<IntakeFailure | null>(null);
  const [variant, setVariant] = useState(0);
  /** Settings the current questionnaire was generated for (so changed settings mean a fresh generation). */
  const [resultKey, setResultKey] = useState('');
  const sentLeadKey = useRef('');

  useEffect(() => {
    initAttribution('intake-form-generator');
  }, []);

  const currentKey = leadKey(config, lead);
  const hasResult = questionnaire !== null && resultKey === currentKey;

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
      // 2. Then Gemini writes the form.
      const result = await generateIntakeForm(config, 0);
      if (!result.ok) {
        setGateError(result.error);
        return;
      }
      setQuestionnaire(result.questionnaire);
      setResultKey(currentKey);
      setVariant(0);
      setRegenerateError(null);
      setModalOpen(true);
      trackGenerated(lead.email, result.questionnaire);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !questionnaire) return;
    setPending('regenerate');
    setRegenerateError(null);
    try {
      const next = variant + 1;
      const result = await generateIntakeForm(config, next, [questionnaire.formTitle]);
      if (!result.ok) {
        setRegenerateError(result.error);
        return;
      }
      setVariant(next);
      setQuestionnaire(result.questionnaire);
      trackRegenerated(lead.email);
    } finally {
      setPending('idle');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col gap-2.5">
        <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
          <ToolMark size={20} className="shrink-0" />
          <span className="truncate">Personal Trainer Intake Form Generator</span>
        </h1>

        {step === 'config' ? (
          <TrainerConfiguration
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
            error={gateError}
            hasResult={hasResult}
            onSubmit={handleGateSubmit}
            onOpenResult={() => setModalOpen(true)}
            onBack={() => setStep('config')}
          />
        )}
      </div>

      <IntakeResultsModal
        open={modalOpen}
        questionnaire={questionnaire}
        onChange={setQuestionnaire}
        regenerating={pending === 'regenerate'}
        regenerateError={regenerateError}
        onRegenerate={handleRegenerate}
        onChangeSettings={() => {
          setModalOpen(false);
          setStep('config');
        }}
        onClose={() => setModalOpen(false)}
        onPdfDownloaded={() => {
          if (questionnaire) trackPdfDownload(lead.email, questionnaire);
        }}
        onCtaClick={() => trackCtaClick(lead.email)}
      />
    </div>
  );
}
