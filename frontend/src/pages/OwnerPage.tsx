import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { EarningsPanel } from '../components/EarningsPanel';
import { MessageThread } from '../components/MessageThread';
import { MonthCalendar } from '../components/MonthCalendar';
import { PhotoPicker } from '../components/PhotoPicker';
import { TripPhotos } from '../components/TripPhotos';
import { depositLabel, peso, shortDate, shortDateTime } from '../format';
import type { FuelType, InspectionStage, InspectionTarget, OwnerBooking, OwnerVehicle, Transmission, VehicleType } from '../types';
import { MapPin, MessageSquare, Plane, Star, Truck, User } from 'lucide-react';

type Tab = 'bookings' | 'cars' | 'earnings';

interface Props {
  onInspect: (target: InspectionTarget, stage: InspectionStage) => void;
}

/** Turo-style host dashboard: bookings to handle, cars and calendars, earnings. */
export function OwnerPage({ onInspect }: Props) {
  const [tab, setTab] = useState<Tab>('bookings');

  return (
    <main className="page">
      <h2 className="page-title">Owner dashboard</h2>
      <div className="filters" role="tablist">
        {([['bookings', 'Bookings'], ['cars', 'My cars'], ['earnings', 'Earnings']] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'primary small' : 'ghost small'}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === 'bookings' && <OwnerBookings onInspect={onInspect} />}
      {tab === 'cars' && <OwnerCars />}
      {tab === 'earnings' && <EarningsPanel path="/owner/earnings" showDeductions />}
    </main>
  );
}

// ------------------------------- Bookings tab -------------------------------

function OwnerBookings({ onInspect }: Props) {
  const [bookings, setBookings] = useState<OwnerBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPhotos, setOpenPhotos] = useState<number | null>(null);
  const [openChat, setOpenChat] = useState<number | null>(null);
  const [settling, setSettling] = useState<number | null>(null);

  const load = useCallback(() => {
    api.get<OwnerBooking[]>('/owner/bookings').then(setBookings).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!bookings) return <p className="muted">Loading…</p>;
  if (bookings.length === 0) return <p className="card empty">No bookings yet. They'll show up here as soon as someone books one of your cars.</p>;

  return (
    <div className="booking-list">
      {bookings.map((b) => (
        <article key={b.id} className="card">
          <h3>{b.vehicleName} <span className={`status status-${b.status.toLowerCase()}`}>{b.status}</span></h3>
          <p className="muted">#{b.id} · {b.vehiclePlate} · {b.withDriver ? `With driver ${b.driverName}` : 'Self-drive'} · {b.protectionPlan} protection</p>
          <p>{shortDateTime(b.startDate)} → {shortDateTime(b.endDate)}</p>
          <p className="muted">{b.pickupLocation} → {b.destination}</p>
          <p><User className="ico" aria-hidden="true" /> {b.customerName}{b.customerPhone && <> · <a href={`tel:${b.customerPhone}`}>{b.customerPhone}</a></>}</p>
          <p>You receive <strong>{peso(b.ownerPayout)}</strong> <span className="muted">(of {peso(b.vehicleCost)})</span></p>
          {b.securityDeposit > 0 && (
            <p className="muted small-text">
              Deposit {peso(b.securityDeposit)}: {depositLabel[b.depositStatus]}
              {b.depositDeduction > 0 && ` · you kept ${peso(b.depositDeduction)} (${b.depositNote})`}
            </p>
          )}
          <div className="actions">
            {b.canCheckIn && <button className="primary small" onClick={() => onInspect(b, 'PickUp')}>Hand over (check-in)</button>}
            {b.canSettleDeposit && <button className="primary small" onClick={() => setSettling(settling === b.id ? null : b.id)}>Settle deposit</button>}
            {b.inspectionCount > 0 && (
              <button className="ghost small" onClick={() => setOpenPhotos(openPhotos === b.id ? null : b.id)}>
                {openPhotos === b.id ? 'Hide trip photos' : 'Trip photos'}
              </button>
            )}
            <button className="ghost small" onClick={() => setOpenChat(openChat === b.id ? null : b.id)}>
              {openChat === b.id ? 'Hide messages' : <><MessageSquare className="ico" aria-hidden="true" /> Messages</>}
            </button>
          </div>
          {settling === b.id && <SettleDeposit booking={b} onDone={() => { setSettling(null); load(); }} />}
          {openPhotos === b.id && <TripPhotos bookingId={b.id} />}
          {openChat === b.id && <MessageThread bookingId={b.id} />}
        </article>
      ))}
    </div>
  );
}

function SettleDeposit({ booking, onDone }: { booking: OwnerBooking; onDone: () => void }) {
  const [deduction, setDeduction] = useState('0');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const keep = Number(deduction) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/owner/bookings/${booking.id}/deposit`, { deduction: keep, note });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settle" onSubmit={submit}>
      <p className="hint">Compare the pick-up and return photos first. Keep part of the deposit only for missing fuel or new damage.</p>
      <div className="row">
        <label>Amount to keep (₱)
          <input type="number" min={0} max={booking.securityDeposit} step={50} value={deduction} onChange={(e) => setDeduction(e.target.value)} />
        </label>
        <label>Reason {keep > 0 && '(required)'}
          <input maxLength={500} required={keep > 0} value={note} placeholder="e.g. Fuel ½ tank short" onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <p>Customer gets back <strong>{peso(Math.max(0, booking.securityDeposit - keep))}</strong></p>
      {error && <p className="error">{error}</p>}
      <button className="primary small" disabled={saving}>{keep > 0 ? 'Keep part & refund the rest' : 'Refund full deposit'}</button>
    </form>
  );
}

// ------------------------------- Cars tab -------------------------------

function OwnerCars() {
  const [cars, setCars] = useState<OwnerVehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<OwnerVehicle | 'new' | null>(null);
  const [calendarFor, setCalendarFor] = useState<number | null>(null);

  const load = useCallback(() => {
    api.get<OwnerVehicle[]>('/owner/vehicles').then(setCars).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (editing) return <VehicleForm car={editing === 'new' ? null : editing} onDone={() => { setEditing(null); load(); }} />;

  return (
    <>
      <button className="primary small" onClick={() => setEditing('new')}>+ List a car</button>
      {error && <p className="error">{error}</p>}
      {cars?.length === 0 && <p className="card empty">You haven't listed a car yet.</p>}
      <div className="booking-list" style={{ marginTop: 12 }}>
        {cars?.map((c) => (
          <article key={c.id} className="card booking-item">
            <img src={c.imageUrl} alt="" />
            <div>
              <h3>{c.name} {!c.isAvailable && <span className="status status-cancelled">Hidden</span>}</h3>
              <p className="muted">{c.plateNumber} · {c.type} · {c.seats} seats · <MapPin className="ico" aria-hidden="true" /> {c.location}</p>
              <p><strong>{peso(c.pricePerDay)}</strong>/day · <Star className="ico" aria-hidden="true" /> {c.rating ? c.rating.toFixed(1) : 'New'}
                {c.ratingCount > 0 && ` (${c.ratingCount})`} · {c.completedTrips} trips · earned {peso(c.earned)}</p>
              <p className="muted small-text">
                <Truck className="ico" aria-hidden="true" /> {c.deliveryFee !== null ? `Delivery ${peso(c.deliveryFee)}` : 'No delivery'} · <Plane className="ico" aria-hidden="true" /> {c.airportFee !== null ? `Airport ${peso(c.airportFee)}` : 'No airport pick-up'}
              </p>
              <p className="muted small-text">{c.nextTripStart ? `Next trip ${shortDate(c.nextTripStart)}` : 'No upcoming trips'}</p>
              <div className="actions">
                <button className="ghost small" onClick={() => setEditing(c)}>Edit</button>
                <button className="ghost small" onClick={() => setCalendarFor(calendarFor === c.id ? null : c.id)}>
                  {calendarFor === c.id ? 'Hide calendar' : 'Calendar'}
                </button>
              </div>
              {calendarFor === c.id && <MonthCalendar vehicleId={c.id} />}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function VehicleForm({ car, onDone }: { car: OwnerVehicle | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: car?.name ?? '',
    type: car?.type ?? ('Sedan' as VehicleType),
    seats: String(car?.seats ?? 5),
    transmission: car?.transmission ?? ('Automatic' as Transmission),
    fuelType: car?.fuelType ?? ('Gasoline' as FuelType),
    pricePerDay: String(car?.pricePerDay ?? 2000),
    plateNumber: car?.plateNumber ?? '',
    location: car?.location ?? '',
    description: car?.description ?? '',
    isAvailable: car?.isAvailable ?? true,
    // Empty text = "I don't offer this".
    deliveryFee: car?.deliveryFee != null ? String(car.deliveryFee) : '',
    airportFee: car?.airportFee != null ? String(car.airportFee) : '',
  });
  const [photoId, setPhotoId] = useState<string | null>(car?.photoId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fee = (s: string) => (s.trim() === '' ? null : Number(s));
    const body = {
      ...form, seats: Number(form.seats), pricePerDay: Number(form.pricePerDay), photoId,
      deliveryFee: fee(form.deliveryFee), airportFee: fee(form.airportFee),
    };
    try {
      if (car) await api.put(`/owner/vehicles/${car.id}`, body);
      else await api.post('/owner/vehicles', body);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card auth-form narrow-form" onSubmit={submit}>
      <h3>{car ? `Edit ${car.name}` : 'List a new car'}</h3>
      <div className="photo-grid single">
        <PhotoPicker label={photoId ? 'Change photo' : 'Car photo'} fileId={photoId} onUploaded={setPhotoId} />
      </div>
      {photoId && <button type="button" className="link" onClick={() => setPhotoId(null)}>Use the default picture instead</button>}
      <p className="hint">Car photos are public: everyone can see them in search.</p>
      <label>Name<input required maxLength={100} placeholder="e.g. Toyota Innova 2.8 E" value={form.name} onChange={set('name')} /></label>
      <div className="row">
        <label>Type
          <select value={form.type} onChange={set('type')} disabled={Boolean(car)}>
            <option>Sedan</option><option>SUV</option><option>Van</option>
          </select>
        </label>
        <label>Plate number<input required maxLength={20} value={form.plateNumber} onChange={set('plateNumber')} disabled={Boolean(car)} /></label>
      </div>
      <div className="row">
        <label>Seats<input type="number" required min={1} max={50} value={form.seats} onChange={set('seats')} /></label>
        <label>Price per day (₱)<input type="number" required min={100} max={100000} value={form.pricePerDay} onChange={set('pricePerDay')} /></label>
      </div>
      <div className="row">
        <label>Transmission
          <select value={form.transmission} onChange={set('transmission')}><option>Automatic</option><option>Manual</option></select>
        </label>
        <label>Fuel
          <select value={form.fuelType} onChange={set('fuelType')}>
            <option>Gasoline</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
        </label>
      </div>
      <label>Location<input required maxLength={100} placeholder="e.g. Marikina City" value={form.location} onChange={set('location')} /></label>
      <label>Description<textarea rows={3} maxLength={1000} value={form.description} onChange={set('description')}
        placeholder="Condition, features, rules (e.g. no pets)" /></label>
      <div className="row">
        <label>Delivery fee (₱)
          <input type="number" min={0} max={20000} placeholder="Leave empty: no delivery" value={form.deliveryFee} onChange={set('deliveryFee')} />
        </label>
        <label>NAIA airport fee (₱)
          <input type="number" min={0} max={20000} placeholder="Leave empty: no airport" value={form.airportFee} onChange={set('airportFee')} />
        </label>
      </div>
      <p className="hint">You keep 100% of delivery and airport fees, since you do the driving.</p>
      <label className="checkbox">
        <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
        <span>Show in search (untick to hide it for a while)</span>
      </label>
      <p className="hint">You receive 85% of the rental price. A new price only applies to new bookings.</p>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={saving}>{saving ? 'Saving…' : car ? 'Save changes' : 'List my car'}</button>
      <button type="button" className="link" onClick={onDone}>Cancel</button>
    </form>
  );
}
