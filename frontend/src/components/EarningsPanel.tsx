import { useEffect, useState } from 'react';
import { api } from '../api';
import { peso } from '../format';
import type { Earnings } from '../types';

/** Earnings summary for owners (/owner/earnings) and drivers (/driver/earnings). */
export function EarningsPanel({ path, showDeductions }: { path: string; showDeductions: boolean }) {
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Earnings>(path).then(setData).catch((e: Error) => setError(e.message));
  }, [path]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="stat-grid">
        <div className="card stat"><span>Total earned</span><strong>{peso(data.earned)}</strong><small>{data.completedTrips} completed trips</small></div>
        <div className="card stat"><span>This month</span><strong>{peso(data.thisMonth)}</strong></div>
        <div className="card stat"><span>Upcoming</span><strong>{peso(data.upcoming)}</strong><small>confirmed &amp; ongoing trips</small></div>
        <div className="card stat"><span>DriveMate fee (15%)</span><strong>{peso(data.platformFees)}</strong><small>already taken off</small></div>
      </div>

      <section className="card">
        <h3>Last 6 months</h3>
        <table className="table">
          <thead><tr><th>Month</th><th>Trips</th><th className="num">Earned</th></tr></thead>
          <tbody>
            {data.months.map((m) => (
              <tr key={m.month}><td>{m.month}</td><td>{m.trips}</td><td className="num">{peso(m.earned)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          You receive 85% of the {showDeductions ? 'rental' : 'driver'} price. Money counts as earned when the trip is completed.
          {showDeductions && data.depositDeductions > 0 && ` Includes ${peso(data.depositDeductions)} kept from deposits.`}
        </p>
      </section>
    </>
  );
}
