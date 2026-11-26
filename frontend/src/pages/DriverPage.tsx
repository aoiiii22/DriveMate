import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { DriverSummary } from '../components/WelcomeSummary';
import { useTabParam } from '../lib/useTabParam';
import { EarningsPanel } from '../components/EarningsPanel';
import { MessageThread } from '../components/MessageThread';
import { TripPhotos } from '../components/TripPhotos';
import { peso, shortDateTime } from '../format';
import type { DriverProfile, DriverTrip, InspectionStage, InspectionTarget } from '../types';
import { MessageSquare, Star, User } from 'lucide-react';

interface Props {
  onInspect: (target: InspectionTarget, stage: InspectionStage) => void;
}

/** Driver dashboard: go online/offline, set the daily rate, accept or decline trips, see earnings. */
export function DriverPage({ onInspect }: Props) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [price, setPrice] = useState('');
  const [trips, setTrips] = useState<DriverTrip[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPhotos, setOpenPhotos] = useState<number | null>(null);
  const [openChat, setOpenChat] = useState<number | null>(null);
  const [tab, setTab] = useTabParam(['trips', 'earnings'] as const);

  const loadTrips = useCallback(() => {
    api.get<DriverTrip[]>('/driver/trips').then(setTrips).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    api.get<DriverProfile>('/driver/me')
      .then((p) => { setProfile(p); setPrice(String(p.pricePerDay)); })
      .catch((e: Error) => setError(e.message));
    loadTrips();
  }, [loadTrips]);

  async function saveProfile(isAvailable: boolean, pricePerDay: number) {
    setError(null);
    try {
      setProfile(await api.put<DriverProfile>('/driver/me', { isAvailable, pricePerDay }));
      setMessage('Saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function respond(trip: DriverTrip, accept: boolean) {
    setError(null);
    setMessage(null);
    try {
      if (accept) {
        await api.post(`/driver/trips/${trip.id}/accept`);
        setMessage(trip.status === 'Confirmed'
          ? `You accepted trip #${trip.id}. The customer's number is now shown on the trip.`
          : `You accepted trip #${trip.id}. The customer's number appears once they have paid.`);
      } else {
        const reason = prompt('Why can\'t you take this trip? (optional)') ?? undefined;
        if (reason === undefined) return; // pressed Cancel
        const res = await api.post<{ message: string }>(`/driver/trips/${trip.id}/decline`, { reason });
        setMessage(res.message);
      }
      loadTrips();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!profile) return <main className="page">{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</main>;

  const waiting = trips?.filter((t) => t.canRespond) ?? [];
  const others = trips?.filter((t) => !t.canRespond) ?? [];

  return (
    <main className="page">
      <DriverSummary />

      <section className="card driver-status">
        <div>
          <strong>{profile.fullName}</strong> · <Star className="ico" aria-hidden="true" /> {profile.rating ? profile.rating.toFixed(1) : 'New'} · {profile.yearsExperience} yrs
          <p className="muted small-text">Licence {profile.licenseNumber}</p>
        </div>
        <label className="checkbox switch">
          <input type="checkbox" checked={profile.isAvailable} onChange={(e) => saveProfile(e.target.checked, profile.pricePerDay)} />
          <span>{profile.isAvailable ? <><span className="dot on" /> Accepting trips</> : <><span className="dot" /> Offline</>}</span>
        </label>
        <form className="row row-inline" onSubmit={(e) => { e.preventDefault(); saveProfile(profile.isAvailable, Number(price)); }}>
          <label>Daily rate (₱)<input type="number" min={100} max={20000} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <button className="ghost small">Save rate</button>
        </form>
      </section>

      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="filters" role="tablist">
        <button role="tab" aria-selected={tab === 'trips'} className={tab === 'trips' ? 'primary small' : 'ghost small'} onClick={() => setTab('trips')}>
          Trips {waiting.length > 0 && `(${waiting.length} new)`}
        </button>
        <button role="tab" aria-selected={tab === 'earnings'} className={tab === 'earnings' ? 'primary small' : 'ghost small'} onClick={() => setTab('earnings')}>Earnings</button>
      </div>

      {tab === 'earnings' && <EarningsPanel path="/driver/earnings" showDeductions={false} />}

      {tab === 'trips' && (
        <div className="booking-list">
          {trips?.length === 0 && <p className="card empty">No trips yet. Switch on "Accepting trips" so customers can book you.</p>}
          {[...waiting, ...others].map((t) => (
            <article key={t.id} className={`card ${t.canRespond ? 'highlight' : ''}`}>
              <h3>
                {t.vehicleName} <span className={`status status-${t.status.toLowerCase()}`}>{t.status}</span>
                {t.canRespond && <>{' '}<span className="status status-pending">Needs your answer</span></>}
              </h3>
              <p>{shortDateTime(t.startDate)} → {shortDateTime(t.endDate)}</p>
              <p className="muted">{t.pickupLocation} → {t.destination} · {t.vehiclePlate}</p>
              <p><User className="ico" aria-hidden="true" /> {t.customerName}{t.customerPhone && <> · <a href={`tel:${t.customerPhone}`}>{t.customerPhone}</a></>}</p>
              <p>You receive <strong>{peso(t.driverPayout)}</strong>{t.accepted && <span className="muted"> · accepted</span>}</p>
              <div className="actions">
                {t.canRespond && <button className="primary small" onClick={() => respond(t, true)}>Accept</button>}
                {t.canRespond && <button className="ghost small" onClick={() => respond(t, false)}>Decline</button>}
                {t.canCheckIn && <button className="primary small" onClick={() => onInspect(t, 'PickUp')}>Start trip</button>}
                {t.canReturn && <button className="primary small" onClick={() => onInspect(t, 'Return')}>End trip</button>}
                {t.inspectionCount > 0 && (
                  <button className="ghost small" onClick={() => setOpenPhotos(openPhotos === t.id ? null : t.id)}>
                    {openPhotos === t.id ? 'Hide trip photos' : 'Trip photos'}
                  </button>
                )}
                <button className="ghost small" onClick={() => setOpenChat(openChat === t.id ? null : t.id)}>
                  {openChat === t.id ? 'Hide messages' : <><MessageSquare className="ico" aria-hidden="true" /> Messages</>}
                </button>
              </div>
              {openPhotos === t.id && <TripPhotos bookingId={t.id} />}
              {openChat === t.id && <MessageThread bookingId={t.id} />}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
