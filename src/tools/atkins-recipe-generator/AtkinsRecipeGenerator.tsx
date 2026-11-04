import { useEffect, useRef, useState } from 'react';
import { ToolMark } from '../../shared/components/ToolMark';
import { initAttribution } from '../../shared/lib/attribution';
import { generateRecipes, type RecipeFailure } from './aiRecipes';
import { LeadCaptureGate } from './LeadCaptureGate';
import { RecipeInputForm } from './RecipeInputForm';
import { RecipeResultsModal } from './RecipeResultsModal';
import { TOOL, trackCtaClick, trackGenerated, trackLead, trackPdfDownload, trackRegenerated } from './tracking';
import { DEFAULT_CARB_RANGE, type LeadDetails, type RecipeConfig, type RecipeSet } from './types';

const EMPTY_CONFIG: RecipeConfig = {
  plan: 'Atkins 20',
  phase: 'Phase 1 — Induction',
  mealType: null,
  proteins: [],
  cuisine: null,
  cookingTime: null,
  restrictions: [],
  carbRange: DEFAULT_CARB_RANGE,
  avoid: '',
  available: '',
};

const EMPTY_LEAD: LeadDetails = { fullName: '', email: '' };

type Pending = 'idle' | 'generate' | 'regenerate';

/** One line for the gate: "Atkins 20 Phase 1 · Dinner · Mediterranean · Chicken". */
function describe(c: RecipeConfig): string {
  const plan = c.plan === 'Atkins 20' ? `Atkins 20 ${c.phase.split(' — ')[0]}` : c.plan === 'Flexible Low-Carb' ? `Flexible (${c.carbRange})` : c.plan;
  const proteins = c.proteins.filter((p) => p !== 'No Preference');
  return [plan, c.mealType, c.cuisine, proteins.slice(0, 2).join(', ') + (proteins.length > 2 ? ` +${proteins.length - 2}` : '')].filter(Boolean).join(' · ');
}

/** The lead and the preferences it was sent with; the lead is only re-sent when either changes. */
function leadKey(c: RecipeConfig, lead: LeadDetails): string {
  return JSON.stringify([lead.email.trim().toLowerCase(), c.plan, c.phase, c.mealType, c.proteins, c.cuisine, c.cookingTime, c.restrictions, c.carbRange, c.avoid.trim(), c.available.trim()]);
}

/**
 * Three screens in one compact card: recipe preferences, the HubSpot lead
 * gate, and the three recipes in the shared modal. Selections survive going
 * back; results stay in memory; Gemini is only asked after the gate, and
 * regenerating never resubmits the lead.
 */
export function AtkinsRecipeGenerator() {
  const [step, setStep] = useState<'config' | 'gate'>('config');
  const [config, setConfig] = useState<RecipeConfig>(EMPTY_CONFIG);
  const [lead, setLead] = useState<LeadDetails>(EMPTY_LEAD);
  const [set, setSet] = useState<RecipeSet | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<Pending>('idle');
  const [gateError, setGateError] = useState<RecipeFailure | null>(null);
  const [regenerateError, setRegenerateError] = useState<RecipeFailure | null>(null);
  const [variant, setVariant] = useState(0);
  /** Preferences the current recipes were generated for (changed preferences mean a fresh generation). */
  const [resultKey, setResultKey] = useState('');
  const sentLeadKey = useRef('');

  useEffect(() => {
    initAttribution(TOOL);
  }, []);

  const currentKey = leadKey(config, lead);
  const hasResult = set !== null && resultKey === currentKey;

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
      // 2. Then Gemini writes the recipes; nothing is shown unless three pass validation.
      const result = await generateRecipes(config, 0);
      if (!result.ok) {
        setGateError(result.error);
        return;
      }
      setSet(result.set);
      setSelectedId(result.set.recipes[0]?.id ?? '');
      setResultKey(currentKey);
      setVariant(0);
      setRegenerateError(null);
      setModalOpen(true);
      trackGenerated(lead.email, result.set);
    } finally {
      setPending('idle');
    }
  };

  const handleRegenerate = async () => {
    if (pending !== 'idle' || !set) return;
    setPending('regenerate');
    setRegenerateError(null);
    try {
      const next = variant + 1;
      const result = await generateRecipes(config, next, set.recipes.map((r) => r.name));
      if (!result.ok) {
        setRegenerateError(result.error);
        return;
      }
      setVariant(next);
      setSet(result.set);
      setSelectedId(result.set.recipes[0]?.id ?? '');
      trackRegenerated(lead.email, result.set);
    } finally {
      setPending('idle');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col gap-2.5">
        <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
          <ToolMark size={20} className="shrink-0" />
          <span className="truncate">Atkins Diet Recipe Generator</span>
        </h1>

        {step === 'config' ? (
          <RecipeInputForm
            config={config}
            onChange={setConfig}
            onSubmit={() => {
              setGateError(null);
              setStep('gate');
            }}
          />
        ) : (
          <LeadCaptureGate
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

      <RecipeResultsModal
        open={modalOpen}
        set={set}
        selectedId={selectedId}
        onSelect={setSelectedId}
        regenerating={pending === 'regenerate'}
        regenerateError={regenerateError}
        onRegenerate={handleRegenerate}
        onChangeSettings={() => {
          setModalOpen(false);
          setStep('config');
        }}
        onClose={() => setModalOpen(false)}
        onPdfDownloaded={(fileName) => trackPdfDownload(lead.email, fileName)}
        onCtaClick={() => trackCtaClick(lead.email)}
      />
    </div>
  );
}
