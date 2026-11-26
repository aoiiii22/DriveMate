import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { AdminSummary } from '../components/WelcomeSummary';
import { useTabParam } from '../lib/useTabParam';
import { AuthImage } from '../components/AuthImage';
import { shortDate, shortDateTime } from '../format';
import { peso } from '../format';
import type { AdminVerification, ApplicationStatus, PartnerApplication, Promo, VerificationStatus } from '../types';
import { Car, UserCog } from 'lucide-react';

type AdminTab = 'verifications' | 'partners' | 'promos';

/** Admin: review ID verifications and partner applications, manage promo codes. */
export function AdminPage() {
  const [tab, setTab] = useTabParam<AdminTab>(['verifications', 'partners', 'promos']);
  const tabs: [AdminTab, string][] = [['verifications', 'ID verifications'], ['partners', 'Partner applications'], ['promos', 'Promo codes']];
  return (
    <main className="page">
      <AdminSummary />
      <div className="filters" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'primary small' : 'ghost small'}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === 'verifications' && <VerificationQueue />}
      {tab === 'partners' && <PartnerQueue />}
      {tab === 'promos' && <PromoManager />}
    </main>
  );
}

function PromoManager() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', description: '', kind: 'percent', value: '', maxDiscount: '', minSpend: '0', validUntil: '', usageLimit: '' });

  const load = useCallback(() => {
    api.get<Promo[]>('/admin/promos').then(setPromos).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const num = (s: string) => (s.trim() === '' ? null : Number(s));
  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const percent = form.kind === 'percent';
    try {
      await api.post('/admin/promos', {
        code: form.code, description: form.description,
        percentOff: percent ? num(form.value) : null,
        amountOff: percent ? null : num(form.value),
        maxDiscount: percent ? num(form.maxDiscount) : null,
        minSpend: num(form.minSpend) ?? 0,
        validUntil: form.validUntil || null,
        usageLimit: num(form.usageLimit),
        isActive: true,
      });
      setForm({ ...form, code: '', description: '', value: '', maxDiscount: '' });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleActive(p: Promo) {
    try {
      await api.put(`/admin/promos/${p.id}`, { ...p, isActive: !p.isActive });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <section className="card">
        <table className="table">
          <thead><tr><th>Code</th><th>Discount</th><th>Rules</th><th className="num">Used</th><th /></tr></thead>
          <tbody>
            {promos?.map((p) => (
              <tr key={p.id} className={p.isActive ? '' : 'muted'}>
                <td><strong>{p.code}</strong><br /><span className="small-text muted">{p.description}</span></td>
                <td>{p.percentOff ? `${p.percentOff}%${p.maxDiscount ? ` (max ${peso(p.maxDiscount)})` : ''}` : peso(p.amountOff ?? 0)}</td>
                <td className="small-text">
                  {p.minSpend > 0 && <>Min {peso(p.minSpend)}<br /></>}
                  {p.validUntil ? `Until ${shortDate(p.validUntil)}` : 'No expiry'}
                </td>
                <td className="num">{p.timesUsed}{p.usageLimit ? ` / ${p.usageLimit}` : ''}</td>
                <td><button className="link" onClick={() => toggleActive(p)}>{p.isActive ? 'Turn off' : 'Turn on'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <form className="card auth-form narrow-form" onSubmit={create} style={{ marginTop: 16 }}>
        <h3>New promo code</h3>
        <div className="row">
          <label>Code<input required maxLength={30} pattern="[A-Za-z0-9]+" placeholder="e.g. SUMMER15" value={form.code} onChange={set('code')} /></label>
          <label>Type
            <select value={form.kind} onChange={set('kind')}><option value="percent">% off</option><option value="amount">₱ off</option></select>
          </label>
        </div>
        <label>Description (customers see this)<input required maxLength={200} value={form.description} onChange={set('description')} /></label>
        <div className="row">
          <label>{form.kind === 'percent' ? 'Percent off' : 'Pesos off'}
            <input type="number" required min={1} max={form.kind === 'percent' ? 100 : 100000} value={form.value} onChange={set('value')} />
          </label>
          {form.kind === 'percent' && <label>Max discount (₱, optional)<input type="number" min={1} value={form.maxDiscount} onChange={set('maxDiscount')} /></label>}
        </div>
        <div className="row">
          <label>Minimum rental (₱)<input type="number" min={0} value={form.minSpend} onChange={set('minSpend')} /></label>
          <label>Total uses (optional)<input type="number" min={1} value={form.usageLimit} onChange={set('usageLimit')} /></label>
        </div>
        <label>Valid until (optional)<input type="date" value={form.validUntil} onChange={set('validUntil')} /></label>
        <p className="hint">Each customer can use a code once. DriveMate pays for promo discounts; owners and drivers still get their full share.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary">Create code</button>
      </form>
    </>
  );
}

function PartnerQueue() {
  const [filter, setFilter] = useState<ApplicationStatus>('Pending');
  const [items, setItems] = useState<PartnerApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<PartnerApplication[]>(`/admin/partners?status=${filter}`).then(setItems).catch((e: Error) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  async function review(a: PartnerApplication, approve: boolean) {
    try {
      if (approve) {
        await api.post(`/admin/partners/${a.id}/approve`);
      } else {
        const reason = prompt(`Why are you rejecting ${a.fullName}? (they will see this)`);
        if (!reason?.trim()) return;
        await api.post(`/admin/partners/${a.id}/reject`, { reason });
      }
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="filters">
        {(['Pending', 'Approved', 'Rejected'] as const).map((s) => (
          <button key={s} className={filter === s ? 'primary small' : 'ghost small'} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {items?.length === 0 && <p className="card empty">Nothing here.</p>}
      <div className="booking-list">
        {items?.map((a) => (
          <article key={a.id} className="card">
            <h3>{a.type === 'Owner' ? <Car className="ico" aria-hidden="true" /> : <UserCog className="ico" aria-hidden="true" />} {a.fullName} wants to be {a.type === 'Owner' ? 'a car owner' : 'a driver'}{' '}
              <span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span></h3>
            <p className="muted">{a.email} · {a.phoneNumber ?? 'no phone'} · sent {shortDateTime(a.createdAt)}</p>
            <p>ID verification: {a.verificationStatus
              ? <span className={`status status-${a.verificationStatus.toLowerCase()}`}>{a.verificationStatus}</span>
              : <span className="error">not submitted</span>}</p>
            <blockquote className="review">{a.details}</blockquote>
            {a.type === 'Driver' && <p>Licence {a.licenseNumber} · {a.yearsExperience} yrs · asks {a.pricePerDay && peso(a.pricePerDay)}/day</p>}
            {a.rejectionReason && <p className="error">Reason: {a.rejectionReason}</p>}
            {a.status === 'Pending' && (
              <div className="actions">
                <button className="primary small" onClick={() => review(a, true)}>Approve</button>
                <button className="ghost small" onClick={() => review(a, false)}>Reject</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function VerificationQueue() {
  const [filter, setFilter] = useState<VerificationStatus>('Pending');
  const [items, setItems] = useState<AdminVerification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<AdminVerification[]>(`/admin/verifications?status=${filter}`)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [filter]);
  useEffect(load, [load]);

  async function approve(v: AdminVerification) {
    try {
      await api.post(`/admin/verifications/${v.id}/approve`);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function reject(v: AdminVerification) {
    const reason = prompt(`Why are you rejecting ${v.fullName}? (they will see this)`, 'Photo is blurry. Please upload a clearer one.');
    if (!reason?.trim()) return;
    try {
      await api.post(`/admin/verifications/${v.id}/reject`, { reason });
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const expired = (v: AdminVerification) => new Date(v.licenseExpiry) < new Date();

  return (
    <>
      <div className="filters">
        {(['Pending', 'Approved', 'Rejected'] as const).map((s) => (
          <button key={s} className={filter === s ? 'primary small' : 'ghost small'} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {items?.length === 0 && <p className="card empty">Nothing here.</p>}

      <div className="booking-list">
        {items?.map((v) => (
          <article key={v.id} className="card">
            <h3>{v.fullName} <span className={`status status-${v.status.toLowerCase()}`}>{v.status}</span></h3>
            <p className="muted">{v.email} · {v.phoneNumber ?? 'no phone'} · sent {shortDateTime(v.submittedAt)}</p>
            <p>Licence <strong>{v.licenseNumber}</strong> · expires {shortDate(v.licenseExpiry)}
              {expired(v) && <span className="error"> (expired)</span>}</p>
            <div className="photo-row">
              {v.licensePhotoId && <AuthImage fileId={v.licensePhotoId} alt="Driver's licence" className="doc-photo" />}
              {v.idPhotoId && <AuthImage fileId={v.idPhotoId} alt="Government ID" className="doc-photo" />}
              {!v.licensePhotoId && !v.idPhotoId && <p className="hint">Demo account: no photos.</p>}
            </div>
            <p className="hint">Check: name matches the account, licence number is readable, not expired, ID photo matches.</p>
            {v.rejectionReason && <p className="error">Reason: {v.rejectionReason}</p>}
            {v.status === 'Pending' && (
              <div className="actions">
                <button className="primary small" onClick={() => approve(v)}>Approve</button>
                <button className="ghost small" onClick={() => reject(v)}>Reject</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
