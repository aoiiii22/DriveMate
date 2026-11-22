import { useEffect, useState } from 'react';
import { api } from '../api';
import { shortDate } from '../format';
import type { PartnerApplication, PartnerType } from '../types';

/** "Become a partner": apply to list your car or to drive for DriveMate. */
export function PartnerPage() {
  const [apps, setApps] = useState<PartnerApplication[] | null>(null);
  const [type, setType] = useState<PartnerType>('Owner');
  const [details, setDetails] = useState('');
  const [license, setLicense] = useState('');
  const [years, setYears] = useState('');
  const [price, setPrice] = useState('500');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PartnerApplication[]>('/partners/mine').then(setApps).catch((e: Error) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const isDriver = type === 'Driver';
    try {
      const created = await api.post<PartnerApplication>('/partners/apply', {
        type, details,
        licenseNumber: isDriver ? license : null,
        yearsExperience: isDriver ? Number(years) : null,
        pricePerDay: isDriver ? Number(price) : null,
      });
      setApps([created, ...(apps ?? [])]);
      setDetails('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page narrow">
      <section className="card">
        <h2>Become a DriveMate partner</h2>
        <p className="muted">Earn with DriveMate: list your car for others to rent, or drive customers as a professional driver.
          You keep 85% of every booking.</p>

        {apps && apps.length > 0 && (
          <>
            <h3>Your applications</h3>
            {apps.map((a) => (
              <p key={a.id}>
                {a.type === 'Owner' ? 'Car owner' : 'Driver'} · sent {shortDate(a.createdAt)} ·{' '}
                <span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span>
                {a.status === 'Approved' && <span className="muted"> Reload the page to open your new dashboard.</span>}
                {a.rejectionReason && <span className="error"> {a.rejectionReason}</span>}
              </p>
            ))}
          </>
        )}

        <form className="auth-form" onSubmit={submit}>
          <h3>New application</h3>
          <div className="toggle" role="radiogroup" aria-label="Partner type">
            <button type="button" className={type === 'Owner' ? 'active' : ''} onClick={() => setType('Owner')}>List my car</button>
            <button type="button" className={type === 'Driver' ? 'active' : ''} onClick={() => setType('Driver')}>Drive for DriveMate</button>
          </div>
          <label>{type === 'Owner' ? 'Tell us about your car' : 'Tell us about your driving experience'}
            <textarea required minLength={20} maxLength={2000} rows={4} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder={type === 'Owner'
                ? 'e.g. 2021 Toyota Innova 2.8 E, 7 seats, manual, diesel, in Marikina City.'
                : 'e.g. 5 years driving for a tour company, know Metro Manila and North Luzon routes.'} />
          </label>
          {type === 'Driver' && (
            <>
              <label>Professional driver's licence number<input required maxLength={30} value={license} onChange={(e) => setLicense(e.target.value)} /></label>
              <div className="row">
                <label>Years of experience<input type="number" required min={0} max={60} value={years} onChange={(e) => setYears(e.target.value)} /></label>
                <label>Your daily rate (₱)<input type="number" required min={100} max={20000} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
              </div>
            </>
          )}
          <p className="hint">An admin reviews applications. Verifying your ID first speeds this up.</p>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={saving}>{saving ? 'Sending…' : 'Apply'}</button>
        </form>
      </section>
    </main>
  );
}
