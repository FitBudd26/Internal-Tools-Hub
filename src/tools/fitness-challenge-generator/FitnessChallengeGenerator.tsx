import { useEffect, useRef, useState } from 'react';
import { ToolMark } from '../../shared/components/ToolMark';
import { ChallengePreview } from './ChallengePreview';
import { EmailGate } from './EmailGate';
import { SelectionStep } from './SelectionStep';
import { generateChallenge } from './generateChallenge';
import { trackCtaClick, trackLead, trackPdfDownload } from './tracking';
import type { Challenge, ChallengeInput } from './types';

type Step = 'challenge' | 'setup' | 'email' | 'results';

const EMPTY: ChallengeInput = {
  challengeTypes: [],
  audienceTypes: [],
  fitnessLevels: [],
  duration: null,
  equipment: [],
  measurements: [],
};

const STEP_LABEL: Record<Exclude<Step, 'results'>, string> = {
  challenge: 'Step 1 of 3 · Challenge',
  setup: 'Step 2 of 3 · Setup',
  email: 'Step 3 of 3 · Your email',
};

const primaryBtn =
  'h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400';

export function FitnessChallengeGenerator() {
  const [step, setStep] = useState<Step>('challenge');
  const [input, setInput] = useState<ChallengeInput>(EMPTY);
  const [email, setEmail] = useState('');
  const [sendMoreTools, setSendMoreTools] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Move focus to the step label on each screen change (keyboard + screen readers).
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const part1Valid =
    input.challengeTypes.length > 0 &&
    input.audienceTypes.length > 0 &&
    input.fitnessLevels.length > 0;
  const part2Valid =
    input.duration !== null && input.equipment.length > 0 && input.measurements.length > 0;

  const handleEmailSubmit = () => {
    const generated = generateChallenge(input);
    setChallenge(generated);
    setStep('results');
    // Lead to HubSpot; fire-and-forget — a failure never hides the challenge.
    trackLead(input, email, sendMoreTools, generated);
  };

  const restart = () => {
    setInput(EMPTY);
    setChallenge(null);
    setStep('challenge');
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)]">
      <div className="flex min-h-[440px] flex-col gap-2.5">
        <div>
          <h1 className="flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-bold text-fb-orange">
            <ToolMark size={20} className="shrink-0" />
            <span className="truncate">Fitness Challenge Generator</span>
          </h1>
          {step !== 'results' && (
            <p className="mt-1 text-center text-[13px] text-gray-600">
              Create ready-to-use challenges for clients, groups, or communities — in seconds.
            </p>
          )}
          {step !== 'results' && (
            <p
              ref={headingRef}
              tabIndex={-1}
              className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 outline-none"
            >
              {STEP_LABEL[step]}
            </p>
          )}
        </div>

        {step === 'challenge' && (
          <div className="flex flex-1 flex-col gap-2.5">
            <SelectionStep part={1} input={input} onChange={setInput} />
            <div className="mt-auto">
              <button
                type="button"
                disabled={!part1Valid}
                onClick={() => setStep('setup')}
                className={primaryBtn}
              >
                Continue
              </button>
              <p className="mt-1 text-center text-xs text-gray-400">
                Layers on top of any training program — no workout programming
              </p>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <div className="flex flex-1 flex-col gap-2.5">
            <SelectionStep part={2} input={input} onChange={setInput} />
            <div className="mt-auto">
              <button
                type="button"
                disabled={!part2Valid}
                onClick={() => setStep('email')}
                className={primaryBtn}
              >
                Create My Challenge
              </button>
              <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => setStep('challenge')}
                  className="rounded font-medium hover:text-gray-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
                >
                  ← Back
                </button>
                <span>Measurements only affect tracking suggestions</span>
              </div>
            </div>
          </div>
        )}

        {step === 'email' && (
          <EmailGate
            email={email}
            sendMoreTools={sendMoreTools}
            onEmailChange={setEmail}
            onSendMoreToolsChange={setSendMoreTools}
            onSubmit={handleEmailSubmit}
            onBack={() => setStep('setup')}
          />
        )}

        {step === 'results' && challenge && (
          <ChallengePreview
            challenge={challenge}
            onPdfDownloaded={() => trackPdfDownload(email, challenge.challengeName)}
            onCtaClick={() => trackCtaClick(email)}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}
