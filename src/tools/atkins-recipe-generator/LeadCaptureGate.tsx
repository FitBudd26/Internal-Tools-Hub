import { useState, type FormEvent } from 'react';
import { isValidEmail } from '../../shared/lib/tracking';
import { FAILURE_MESSAGES, type RecipeFailure } from './aiRecipes';
import { PRIVACY_URL } from './tracking';
import type { LeadDetails } from './types';

interface LeadCaptureGateProps {
  lead: LeadDetails;
  onChange: (next: LeadDetails) => void;
  /** One line describing the recipes about to be generated. */
  summary: string;
  pending: boolean;
  error: RecipeFailure | null;
  /** Recipes already exist for these preferences: offer to reopen them instead of generating again. */
  hasResult: boolean;
  onSubmit: () => void;
  onOpenResult: () => void;
  onBack: () => void;
}

const inputCls =
  'w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';
const validCls = 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25';
const invalidCls = 'border-red-400 focus:border-red-400 focus:ring-red-300/40';
const labelCls = 'mb-1 block text-sm font-bold text-gray-900';

function RequiredMark() {
  return (
    <span className="text-fb-orange" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

/** Screen 2: the lead gate (name + email only, no marketing tick box by decision). Submitting sends the lead to HubSpot and then asks Gemini. */
export function LeadCaptureGate({ lead, onChange, summary, pending, error, hasResult, onSubmit, onOpenResult, onBack }: LeadCaptureGateProps) {
  const [touched, setTouched] = useState({ name: false, email: false });
  const nameValid = lead.fullName.trim().length >= 2;
  const emailValid = isValidEmail(lead.email);
  const valid = nameValid && emailValid;
  const nameError = touched.name && !nameValid;
  const emailError = touched.email && !emailValid;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!valid || pending) return;
    if (hasResult) onOpenResult();
    else onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2.5" noValidate>
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        <h2 className="text-[15px] font-bold leading-tight text-gray-900">Your Low-Carb Recipes Are Almost Ready</h2>
        <p className="mt-1 text-[13px] leading-snug text-gray-600">Enter your details to generate your three personalized recipes and the client-ready PDF.</p>
        {summary && <p className="mt-1.5 truncate text-[12px] text-gray-500">Building: {summary}</p>}
      </div>

      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-2.5 @sm:grid-cols-2">
          <div>
            <label className="block">
              <span className={labelCls}>
                Full Name
                <RequiredMark />
              </span>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Your full name"
                value={lead.fullName}
                onChange={(e) => onChange({ ...lead, fullName: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                aria-invalid={nameError}
                className={`${inputCls} h-10 ${nameError ? invalidCls : validCls}`}
              />
            </label>
            {nameError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Enter your name.
              </p>
            )}
          </div>
          <div>
            <label className="block">
              <span className={labelCls}>
                Email Address
                <RequiredMark />
              </span>
              <input
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                placeholder="you@business.com"
                value={lead.email}
                onChange={(e) => onChange({ ...lead, email: e.target.value })}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={emailError}
                className={`${inputCls} h-10 ${emailError ? invalidCls : validCls}`}
              />
            </label>
            {emailError && (
              <p className="mt-1 text-xs text-red-500" role="alert">
                Enter a valid email address.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-gray-500">
        Your details are used to deliver this tool and handled under FitBudd&apos;s{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-fb-teal underline">
          privacy policy
        </a>
        . The recipes and PDF open right here on this page.
      </p>

      {error && !pending && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[12px] leading-snug text-red-700">
          {FAILURE_MESSAGES[error]}
        </div>
      )}

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!valid || pending}
          aria-busy={pending}
          className={`h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange ${
            pending ? 'cursor-wait opacity-80' : 'disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400'
          }`}
        >
          {pending ? 'Creating your recipes...' : hasResult ? 'Open My Recipes' : error ? 'Try Again' : 'Get My Recipes'}
        </button>
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="rounded text-left hover:text-gray-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:hover:no-underline"
          >
            ← Back to recipe preferences
          </button>
          <span className="truncate text-right">{pending ? 'Usually 10 to 30 seconds' : 'No credit card required'}</span>
        </div>
      </div>
    </form>
  );
}
