import { useState, type FormEvent } from 'react';
import { isValidEmail } from '../../shared/lib/tracking';

interface EmailGateProps {
  email: string;
  sendMoreTools: boolean;
  onEmailChange: (value: string) => void;
  onSendMoreToolsChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const inputCls =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:ring-2';

/** Mandatory email gate between the setup inputs and the results. */
export function EmailGate({
  email,
  sendMoreTools,
  onEmailChange,
  onSendMoreToolsChange,
  onSubmit,
  onBack,
}: EmailGateProps) {
  const [touched, setTouched] = useState(false);
  const valid = isValidEmail(email);
  const error = touched && !valid;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (valid) onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col gap-2.5">
      <div className="rounded-xl border border-fb-tint-border bg-fb-tint p-3">
        <h2 className="text-sm font-bold text-gray-900">
          Get your ready-to-run fitness challenge
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-gray-600">
          Enter your email to unlock the challenge preview and the client-ready
          PDF you can deploy with clients anytime.
        </p>
      </div>

      <div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-gray-900">
            Email
            <span className="text-fb-orange" aria-hidden="true">
              {' '}
              *
            </span>
          </span>
          <input
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={error}
            className={`${inputCls} ${
              error
                ? 'border-red-400 focus:border-red-400 focus:ring-red-300/40'
                : 'border-gray-300 focus:border-fb-orange focus:ring-fb-orange/25'
            }`}
          />
        </label>
        {error && (
          <p className="mt-1 text-xs text-red-500" role="alert">
            Enter a valid email address.
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
        <input
          type="checkbox"
          checked={sendMoreTools}
          onChange={(e) => onSendMoreToolsChange(e.target.checked)}
          className="h-4 w-4 accent-fb-orange"
        />
        Send me more tools for coaches
      </label>

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!valid && touched}
          className="h-[46px] w-full rounded-xl bg-fb-orange text-sm font-semibold text-white transition-colors enabled:hover:bg-fb-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          Show My Challenge
        </button>
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <button
            type="button"
            onClick={onBack}
            className="rounded font-medium hover:text-gray-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb-orange"
          >
            ← Back
          </button>
          <span>No spam. Unsubscribe anytime.</span>
        </div>
      </div>
    </form>
  );
}
