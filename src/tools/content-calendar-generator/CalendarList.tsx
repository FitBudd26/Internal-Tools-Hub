import { sortPosts } from './calendarUtils';
import { longDate } from './dateScheduler';
import type { Calendar } from './types';

interface CalendarListProps {
  calendar: Calendar;
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Chronological post cards: date, platforms, format, pillar, topic and hook; click opens the post. */
export function CalendarList({ calendar, selectedId, onSelect }: CalendarListProps) {
  return (
    <ol aria-label="List view" className="flex flex-col gap-1.5">
      {sortPosts(calendar.posts).map((p, i) => {
        const active = p.id === selectedId;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(p.id)}
              className={`w-full rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fb-orange ${
                active ? 'border-fb-orange bg-orange-50/60' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {i + 1}. {longDate(p.date)}
                </span>
                <span className="shrink-0 rounded-full bg-fb-tint px-2 py-0.5 text-[10px] font-semibold text-fb-teal">{p.pillar}</span>
              </div>
              <div className="mt-0.5 text-[13px] font-bold leading-snug text-gray-900">{p.topic}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-gray-600">
                {p.platforms.join(' + ')} · {p.format}
              </div>
              <div className="mt-1 truncate text-[12px] italic leading-snug text-gray-500">“{p.hook}”</div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
