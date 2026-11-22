import { useCallback, useEffect, useState } from 'react';
import { api, queryString } from '../api';
import { addDays, pickupDateTime, returnDateTime, shortDate, toDateInput } from '../format';
import type { CalendarEntry } from '../types';
import { Ban, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * One car's month calendar: booked days, blocked days, and a form to block dates.
 * Days are coloured by what covers them; use the arrows to change month.
 */
export function MonthCalendar({ vehicleId }: { vehicleId: number }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const from = toDateInput(month);
    const to = toDateInput(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    api.get<CalendarEntry[]>(`/owner/vehicles/${vehicleId}/calendar${queryString({ from, to })}`)
      .then(setEntries)
      .catch((e: Error) => setError(e.message));
  }, [vehicleId, month]);
  useEffect(load, [load]);

  // Which entry covers a given day (compare by calendar date, not time).
  const entryFor = (day: Date) => {
    const key = toDateInput(day);
    return entries.find((e) => toDateInput(new Date(e.start)) <= key && key <= toDateInput(new Date(e.end)));
  };

  // Monday-first grid: blank cells before the 1st.
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (month.getDay() + 6) % 7;
  const cells = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i))];
  const today = toDateInput(new Date());

  async function block(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/owner/vehicles/${vehicleId}/blocks`, { start: pickupDateTime(start), end: returnDateTime(end), reason });
      setStart(''); setEnd(''); setReason('');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function unblock(id: number) {
    try {
      await api.del(`/owner/vehicles/${vehicleId}/blocks/${id}`);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const title = month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button type="button" className="ghost small" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="ico" aria-hidden="true" /></button>
        <strong>{title}</strong>
        <button type="button" className="ghost small" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="ico" aria-hidden="true" /></button>
      </div>
      <div className="calendar-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="dow">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={`b${i}`} />;
          const entry = entryFor(day);
          const cls = entry ? (entry.kind === 'Block' ? 'blocked' : 'booked') : '';
          return (
            <div key={i} className={`day ${cls} ${toDateInput(day) === today ? 'today' : ''}`} title={entry?.label}>
              {day.getDate()}
            </div>
          );
        })}
      </div>
      <p className="hint"><span className="legend booked" /> Booked <span className="legend blocked" /> Blocked by you</p>

      {entries.length > 0 && (
        <ul className="calendar-list">
          {entries.map((e) => (
            <li key={`${e.kind}${e.id}`}>
              {shortDate(e.start)} – {shortDate(e.end)} · {e.kind === 'Booking' ? `${e.label} (${e.status})` : <><Ban className="ico" aria-hidden="true" /> {e.label}</>}
              {e.kind === 'Block' && e.id && <button type="button" className="link" onClick={() => unblock(e.id!)}> Remove</button>}
            </li>
          ))}
        </ul>
      )}

      <form className="block-form" onSubmit={block}>
        <label>Block from<input type="date" required min={today} value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>to<input type="date" required min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <label>Reason<input maxLength={200} placeholder="e.g. Maintenance" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <button className="ghost small">Block dates</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
