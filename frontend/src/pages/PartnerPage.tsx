import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router';
import { Car, IdCard } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { InstallBanner } from '../components/InstallBanner';
import { shortDate } from '../format';
import type { PartnerApplication, PartnerType } from '../types';

type Kind = 'drive' | 'owner';

/** What each partner landing page says. Only facts DriveMate really has (85% share, ID check, admin review). */
const content: Record<Kind, {
  type: PartnerType; eyebrow: string; title: string; intro: string;
  why: { title: string; text: string }[];
  steps: string[];
  requirements: string[];
  faqs: { q: string; a: string }[];
  cta: string;
}> = {
  drive: {
    type: 'Driver',
    eyebrow: 'Driver-partner',
    title: 'Be a DriveMate driver-partner',
    intro: 'Drive customers who book a car with a driver. Set your own daily rate and keep 85% of every booking.',
    why: [
      { title: 'Set your own rate', text: 'You choose your daily rate when you apply, anywhere from ₱100 to ₱20,000.' },
      { title: 'Keep 85%', text: 'You keep 85% of every booking. Your payout is fixed when the booking is made, so there are no surprises.' },
      { title: 'Everything in one app', text: 'Bookings, check-in photos, messages and your earnings live in your driver dashboard.' },
    ],
    steps: [
      'Create a DriveMate account or log in.',
      'Verify your ID. It is optional but speeds up the review.',
      'Send your application with your licence number, experience and daily rate.',
      'An admin reviews it. You can follow the status on this page.',
      'Once approved, your driver dashboard opens and customers can book you.',
    ],
    requirements: [
      'A professional driver’s licence (you enter the licence number)',
      'Your years of driving experience',
      'A DriveMate account, ideally with your government ID verified',
    ],
    faqs: [
      { q: 'How much do I keep from each booking?', a: 'You keep 85% of every booking. DriveMate pays for promo codes, so your payout does not drop when a customer uses one.' },
      { q: 'What happens after I am approved?', a: 'Your account gets the Driver role and a driver dashboard where you manage your bookings and see your earnings.' },
      { q: 'What if my application is rejected?', a: 'You will see the reason on this page, so you know what to fix.' },
    ],
    cta: 'Start your journey as a driver-partner.',
  },
  owner: {
    type: 'Owner',
    eyebrow: 'Car owner',
    title: 'Turn your car into income',
    intro: 'List your car for trusted renters. You keep 85% of every booking, and photo check-ins protect your car.',
    why: [
      { title: 'Keep 85%', text: 'You keep 85% of every booking. Your payout is fixed when the booking is made.' },
      { title: 'Verified renters', text: 'Renters upload a licence and ID that an admin approves before they can self-drive.' },
      { title: 'Protected hand-overs', text: 'Photos at pick-up and return, plus a refundable deposit you can claim from when there is damage.' },
    ],
    steps: [
      'Create a DriveMate account or log in.',
      'Verify your ID. It is optional but speeds up the review.',
      'Send your application and tell us about your car.',
      'An admin reviews it. You can follow the status on this page.',
      'Once approved, your owner dashboard opens so you can list cars and block dates.',
    ],
    requirements: [
      'A car you own or are allowed to rent out',
      'Basic details: make, model, seats, transmission, fuel and where it is based',
      'A DriveMate account, ideally with your government ID verified',
    ],
    faqs: [
      { q: 'How much do I keep from each booking?', a: 'You keep 85% of every booking. DriveMate pays for promo codes, so your payout does not drop when a renter uses one.' },
      { q: 'What if my car is damaged?', a: 'Renters pay a refundable security deposit. After the return you can keep part of it, with a reason.' },
      { q: 'Can I block dates when I need the car?', a: 'Yes. Your owner dashboard has a calendar where you block dates. Blocked dates cannot be booked.' },
    ],
    cta: 'Start your journey as a car owner.',
  },
};

/** /partner goes to the right landing page. The old "?type=driver" links still work. */
export function PartnerRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={params.get('type') === 'driver' ? '/partner/drive' : '/partner/owner'} replace />;
}

/** "Be our partner" landing pages (/partner/drive and /partner/owner), with the application form at the bottom. */
export function PartnerPage() {
  const { kind } = useParams();
  if (kind !== 'drive' && kind !== 'owner') return <Navigate to="/partner" replace />;
  const c = content[kind];

  return (
    <>
      <InstallBanner />
      <section className="pl-hero">
        <div className="pl-inner">
          <div className="pl-switch" role="tablist" aria-label="Partner type">
            <Link to="/partner/drive" className={kind === 'drive' ? 'active' : ''}><IdCard className="ico" aria-hidden="true" />Driver</Link>
            <Link to="/partner/owner" className={kind === 'owner' ? 'active' : ''}><Car className="ico" aria-hidden="true" />Car owner</Link>
          </div>
          <p className="eyebrow">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className="pl-intro">{c.intro}</p>
          <a className="primary big" href="#apply">Apply now</a>
        </div>
      </section>

      <main className="page pl-page">
        <section>
          <h2 className="big-title">Why partner with us</h2>
          <ol className="pl-why">
            {c.why.map((w, i) => (
              <li key={w.title} className="card"><span className="step-num">{i + 1}</span><strong>{w.title}</strong><p className="muted">{w.text}</p></li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="big-title">Get started</h2>
          <ol className="pl-steps">
            {c.steps.map((s, i) => <li key={s}><span className="step-num">{i + 1}</span><span>{s}</span></li>)}
          </ol>
        </section>

        <section className="card pl-req">
          <h2>Who can apply?</h2>
          <ul>{c.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>

        <section>
          <h2 className="big-title">Got questions? We’ve got answers.</h2>
          <div className="pl-faq">
            {c.faqs.map((f) => (
              <details key={f.q} className="card"><summary>{f.q}</summary><p className="muted">{f.a}</p></details>
            ))}
          </div>
        </section>

        <section id="apply" className="card pl-apply">
          <p className="eyebrow">Be our partner</p>
          <h2>{c.cta}</h2>
          <ApplyForm key={kind} type={c.type} />
        </section>
      </main>
    </>
  );
}

/** The application form. Logged-out visitors are asked to log in first and come back here. */
function ApplyForm({ type }: { type: PartnerType }) {
  const { user } = useAuth();
  const location = useLocation();
  const [apps, setApps] = useState<PartnerApplication[] | null>(null);
  const [details, setDetails] = useState('');
  const [license, setLicense] = useState('');
  const [years, setYears] = useState('');
  const [price, setPrice] = useState('500');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loggedIn = user !== null;

  useEffect(() => {
    if (!loggedIn) return;
    api.get<PartnerApplication[]>('/partners/mine').then(setApps).catch((e: Error) => setError(e.message));
  }, [loggedIn]);

  if (!loggedIn) {
    const next = `?next=${encodeURIComponent(location.pathname)}`;
    return (
      <div className="pl-gate">
        <p className="muted">Log in or create a free account to send your application.</p>
        <div className="g-hero-actions">
          <Link className="primary big" to={`/register${next}`}>Sign up</Link>
          <Link className="ghost big" to={`/login${next}`}>Log in</Link>
        </div>
      </div>
    );
  }

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

  const mine = (apps ?? []).filter((a) => a.type === type);

  return (
    <>
      {mine.length > 0 && (
        <div className="pl-apps">
          <h3>Your applications</h3>
          {mine.map((a) => (
            <p key={a.id}>
              Sent {shortDate(a.createdAt)} · <span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span>
              {a.status === 'Approved' && <span className="muted"> Reload the page to open your new dashboard.</span>}
              {a.rejectionReason && <span className="error"> {a.rejectionReason}</span>}
            </p>
          ))}
        </div>
      )}

      <form className="auth-form" onSubmit={submit}>
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
        <p className="hint">An admin reviews applications. <Link to="/verify">Verifying your ID</Link> first speeds this up.</p>
        {error && <p className="error">{error}</p>}
        <button className="primary big" disabled={saving}>{saving ? 'Sending…' : 'Apply'}</button>
      </form>
    </>
  );
}
