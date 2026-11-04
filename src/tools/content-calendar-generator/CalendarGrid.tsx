import { PLATFORM_SHORT, postsByDate } from './calendarUtils';
import { gridWeeks, parseISODate, shortDate } from './dateScheduler';
import type { Calendar, Pillar } from './types';

const PILLAR_DOT: Record<Pillar, string> = { Educational: 'bg-fb-teal', Engagement: 'bg-fb-accent', Authority: 'bg-gray-700', Promotional: 'bg-fb-orange' };
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarGridProps {
  calendar: Calendar;
  selectedId: string;
  onSelect: (id: string) => void;
}

/** A compact week-by-week grid of the window; days with posts carry small pillar-coloured platform tags and open the post. */
export function CalendarGrid({ calendar, selectedId, onSelect }: CalendarGridProps) {
  const weeks = gridWeeks(calendar.startDate, calendar.endDate);
  const byDate = postsByDate(calendar);
  const selected = calendar.posts.find((p) => p.id === selectedId);
  return (
    <div role="grid" aria-label="Calendar view" className="overflow-hidden rounded-lg border border-gray-200">
      <div role="row" className="grid grid-cols-7 bg-gray-50 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {DAY_HEADERS.map((d) => (
          <div key={d} role="columnheader" className="py-1">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} role="row" className="grid grid-cols-7 border-t border-gray-100">
          {week.map((iso, di) => {
            if (!iso) return <div key={di} role="gridcell" className="min-h-[44px] bg-gray-50/60" />;
            const posts = byDate.get(iso) ?? [];
            const d = parseISODate(iso);
            const isSelectedDay = selected?.date === iso;
            const label = d.getDate() === 1 || iso === calendar.startDate ? shortDate(iso) : String(d.getDate());
            if (!posts.length) {
              return (
                <div key={di} role="gridcell" className="min-h-[44px] border-l border-gray-100 px-1 py-0.5 text-[10px] text-gray-400 first:border-l-0">
                  {label}
                </div>
              );
            }
            return (
              <button
                key={di}
                type="button"
                role="gridcell"
                aria-selected={isSelectedDay}
                aria-label={`${iso}: ${posts.map((p) => `${p.platforms[0]} ${p.format}, ${p.topic}`).join('; ')}`}
                onClick={() => {
                  // Several posts on one day cycle on each click.
                  const i = posts.findIndex((p) => p.id === selectedId);
                  onSelect(posts[(i + 1) % posts.length].id);
                }}
                className={`min-h-[44px] border-l border-gray-100 px-1 py-0.5 text-left transition-colors first:border-l-0 hover:bg-fb-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fb-orange ${
                  isSelectedDay ? 'bg-orange-50 ring-1 ring-inset ring-fb-orange' : 'bg-white'
                }`}
              >
                <div className="text-[10px] font-semibold text-gray-700">{label}</div>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {posts.slice(0, 2).map((p) => (
                    <span key={p.id} className="flex items-center gap-1 text-[10px] leading-tight text-gray-700">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PILLAR_DOT[p.pillar]}`} aria-hidden="true" />
                      <span className="truncate">
                        {p.platforms.map((x) => PLATFORM_SHORT[x]).join('+')} · {p.format}
                      </span>
                    </span>
                  ))}
                  {posts.length > 2 && <span className="text-[10px] text-gray-400">+{posts.length - 2} more</span>}
                </div>
              </button>
            );
          })}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-gray-100 bg-gray-50 px-2 py-1 text-[10px] text-gray-500">
        {(Object.keys(PILLAR_DOT) as Pillar[]).map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${PILLAR_DOT[p]}`} aria-hidden="true" />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
