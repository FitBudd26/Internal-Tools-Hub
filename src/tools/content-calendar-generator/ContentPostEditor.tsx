import { useState } from 'react';
import { postProblem } from './calendarUtils';
import type { Post } from './types';

interface ContentPostEditorProps {
  post: Post;
  onSave: (patch: Pick<Post, 'topic' | 'hook' | 'caption' | 'cta' | 'creativeDirection' | 'date'>) => void;
  onCancel: () => void;
}

const fieldCls =
  'w-full rounded-lg border border-gray-300 bg-white px-2.5 text-[13px] text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-fb-orange focus:ring-2 focus:ring-fb-orange/25';
const labelCls = 'mb-0.5 block text-[12px] font-bold text-gray-900';

/** Edits topic, hook, caption, CTA, visual direction and the publishing date; saves into the same calendar object the exports use. */
export function ContentPostEditor({ post, onSave, onCancel }: ContentPostEditorProps) {
  const [draft, setDraft] = useState({ topic: post.topic, hook: post.hook, caption: post.caption, cta: post.cta, creativeDirection: post.creativeDirection, date: post.date });
  const set = <K extends keyof typeof draft>(k: K, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const problem = postProblem(draft);
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-fb-orange bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) onSave(draft);
      }}
      aria-label="Edit post"
    >
      <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Publishing date</span>
          <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} className={`${fieldCls} h-9`} />
        </label>
        <label className="block">
          <span className={labelCls}>Topic</span>
          <input value={draft.topic} maxLength={160} onChange={(e) => set('topic', e.target.value)} className={`${fieldCls} h-9`} />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Hook</span>
        <input value={draft.hook} maxLength={300} onChange={(e) => set('hook', e.target.value)} className={`${fieldCls} h-9`} />
      </label>
      <label className="block">
        <span className={labelCls}>Caption</span>
        <textarea value={draft.caption} maxLength={2500} rows={6} onChange={(e) => set('caption', e.target.value)} className={`${fieldCls} resize-y py-2 leading-snug`} />
      </label>
      <label className="block">
        <span className={labelCls}>CTA</span>
        <input value={draft.cta} maxLength={200} onChange={(e) => set('cta', e.target.value)} className={`${fieldCls} h-9`} />
      </label>
      <label className="block">
        <span className={labelCls}>Visual direction</span>
        <textarea value={draft.creativeDirection} maxLength={700} rows={3} onChange={(e) => set('creativeDirection', e.target.value)} className={`${fieldCls} resize-y py-2 leading-snug`} />
      </label>
      {problem && (
        <p className="text-[12px] text-red-600" role="alert">
          {problem}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-[13px] font-medium text-gray-500 hover:text-gray-800 hover:underline">
          Cancel
        </button>
        <button type="submit" disabled={Boolean(problem)} className="h-9 rounded-lg bg-fb-teal px-3 text-[13px] font-semibold text-white hover:bg-fb-teal-dark disabled:cursor-not-allowed disabled:opacity-50">
          Save changes
        </button>
      </div>
    </form>
  );
}
