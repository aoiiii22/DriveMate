import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { MessageThread } from '../components/MessageThread';
import { StarInput } from '../components/StarInput';
import { TripPhotos } from '../components/TripPhotos';
import { depositLabel, paymentLabel, peso, shortDateTime } from '../format';
import { useToast } from '../toast';
import type { Booking, InspectionStage } from '../types';
import { Briefcase, Camera, CreditCard, MessageSquare, Plane, ShieldCheck, Star, Truck } from 'lucide-react';
import { Stars } from '../components/Stars';

interface Props {
  onInspect: (booking: Booking, stage: InspectionStage) => void;
}

/** Which extra panel is open under a booking (only one at a time). */
type Panel = { id: number; kind: 'photos' | 'chat' | 'review' } | null;
type Tab = 'upcoming' | 'past' | 'cancelled';

const tabOf = (b: Booking): Tab =>
  b.status === 'Cancelled' ? 'cancelled' : b.status === 'Completed' ? 'past' : 'upcoming';

/** The single most useful thing to do next, shown on top (like the "Trip" card in rental apps). */
function nextAction(list: Booking[]): { booking: Booking; text: string; action: 'pay' | 'checkin' | 'return' | 'review' } | null {
  const find = (f: (b: Booking) => boolean) => list.find(f);
  const b1 = find((b) => b.canReturn);
  if (b1) return { booking: b1, text: `You're on a trip with the ${b1.vehicleName}. Return it with photos when you're done.`, action: 'return' };
  const b2 = find((b) => b.canCheckIn);
  if (b2) return { booking: b2, text: `Pick-up day! Take the check-in photos for the ${b2.vehicleName}.`, action: 'checkin' };
  const b3 = find((b) => b.canPay);
  if (b3) return { booking: b3, text: `Pay for the ${b3.vehicleName} to confirm your booking.`, action: 'pay' };
  const b4 = find((b) => b.canReview);
  if (b4) return { booking: b4, text: `How was the ${b4.vehicleName}? Your review helps other renters.`, action: 'review' };
  return null;
}

export function BookingsPage({ onInspect }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const onPay = (b: Booking) => navigate(`/pay/${b.id}`);

  const load = useCallback(() => {
    api.get<Booking[]>('/bookings/mine').then(setBookings).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const toggle = (id: number, kind: NonNullable<Panel>['kind']) =>
    setPanel(panel?.id === id && panel.kind === kind ? null : { id, kind });
  const isOpen = (id: number, kind: NonNullable<Panel>['kind']) => panel?.id === id && panel.kind === kind;

  async function cancel(b: Booking) {
    if (!confirm(`Cancel booking #${b.id} for ${b.vehicleName}?`)) return;
    try {
      await api.post(`/bookings/${b.id}/cancel`);
      toast('Booking cancelled. Any deposit paid is refunded.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const shown = bookings?.filter((b) => tabOf(b) === tab) ?? [];
  const counts = { upcoming: 0, past: 0, cancelled: 0 };
  bookings?.forEach((b) => counts[tabOf(b)]++);
  const next = bookings ? nextAction(bookings) : null;

  function doNext() {
    if (!next) return;
    const b = next.booking;
    if (next.action === 'pay') onPay(b);
    else if (next.action === 'checkin') onInspect(b, 'PickUp');
    else if (next.action === 'return') onInspect(b, 'Return');
    else { setTab('past'); setPanel({ id: b.id, kind: 'review' }); }
  }

  return (
    <main className="page">
      <h1 className="page-title">My trips</h1>
      {error && <p className="error">{error}</p>}
      {bookings === null && !error && <p className="muted">Loading…</p>}

      {next && (
        <section className="card next-card">
          <span aria-hidden="true" className="next-icon">
            {next.action === 'pay' ? <CreditCard className="ico" aria-hidden="true" /> : next.action === 'review' ? <Star className="ico" aria-hidden="true" /> : <Camera className="ico" aria-hidden="true" />}
          </span>
          <p>{next.text}</p>
          <button className="primary small" onClick={doNext}>
            {next.action === 'pay' ? 'Pay now' : next.action === 'checkin' ? 'Start trip' : next.action === 'return' ? 'Return vehicle' : 'Rate trip'}
          </button>
        </section>
      )}

      {bookings && bookings.length > 0 && (
        <div className="tabs" role="tablist" aria-label="Trips">
          {(['upcoming', 'past', 'cancelled'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'upcoming' ? 'Upcoming' : t === 'past' ? 'Past' : 'Cancelled'} <span className="count">{counts[t]}</span>
            </button>
          ))}
        </div>
      )}

      {bookings?.length === 0 && (
        <section className="card empty">
          <Briefcase className="empty-icon" aria-hidden="true" />
          <h3>No trips yet</h3>
          <p className="muted">When you book a car, it shows up here.</p>
          <Link className="primary" to="/search">Find a ride</Link>
        </section>
      )}
      {bookings && bookings.length > 0 && shown.length === 0 && (
        <p className="card empty">Nothing here. {tab === 'upcoming' && <Link to="/search">Plan your next trip →</Link>}</p>
      )}

      <div className="booking-list">
        {shown.map((b) => (
          <article key={b.id} className="card booking-item">
            <img src={b.vehicleImageUrl} alt="" />
            <div>
              <h3>{b.vehicleName} <span className={`status status-${b.status.toLowerCase()}`}>{b.status}</span>
                {b.reviewStars && <span className="stars-small"> <Stars value={b.reviewStars} /></span>}</h3>
              <p className="muted">
                #{b.id} · {b.vehiclePlate} · {b.withDriver ? `With driver ${b.driverName}` : 'Self-drive'}
                {b.withDriver && b.status !== 'Cancelled' && (b.driverAccepted ? ' · driver confirmed' : ' · waiting for driver to confirm')}
              </p>
              {b.cancellationReason && <p className="notice">{b.cancellationReason}</p>}
              <p>{shortDateTime(b.startDate)} → {shortDateTime(b.endDate)}</p>
              <p className="muted">
                {b.handover === 'Delivery' ? <><Truck className="ico" aria-hidden="true" /> Delivered to </> : b.handover === 'Airport' ? <><Plane className="ico" aria-hidden="true" /> </> : null}{b.pickupLocation} → {b.destination}
              </p>
              <p>
                <strong>{peso(b.totalPrice)}</strong>
                {(b.longRentalDiscount > 0 || b.promoDiscount > 0) && (
                  <span className="discount"> · saved {peso(b.longRentalDiscount + b.promoDiscount)}{b.promoCode && ` with ${b.promoCode}`}</span>
                )}
                {b.paymentMethod && <span className="muted"> · {paymentLabel[b.paymentMethod]}{b.isPaid ? ' (paid)' : ' (unpaid)'}</span>}
              </p>
              <p className="muted small-text">
                <ShieldCheck className="ico" aria-hidden="true" /> {b.protectionPlan} protection
                {b.securityDeposit > 0 && <> · Deposit {peso(b.securityDeposit)}: {depositLabel[b.depositStatus]}</>}
                {b.depositDeduction > 0 && <> ({peso(b.depositDeduction)} kept: {b.depositNote})</>}
                {b.agreementAcceptedAt && <> · Agreement v{b.agreementVersion} accepted</>}
              </p>
              <div className="actions">
                {b.canPay && <button className="primary small" onClick={() => onPay(b)}>Pay now</button>}
                {b.canCheckIn && <button className="primary small" onClick={() => onInspect(b, 'PickUp')}>Start trip</button>}
                {b.canReturn && <button className="primary small" onClick={() => onInspect(b, 'Return')}>Return vehicle</button>}
                {b.canReview && <button className="primary small" onClick={() => toggle(b.id, 'review')}><Star className="ico" aria-hidden="true" /> Rate your trip</button>}
                <button className="ghost small" onClick={() => toggle(b.id, 'chat')}>{isOpen(b.id, 'chat') ? 'Hide messages' : <><MessageSquare className="ico" aria-hidden="true" /> Messages</>}</button>
                {b.inspectionCount > 0 && (
                  <button className="ghost small" onClick={() => toggle(b.id, 'photos')}>
                    {isOpen(b.id, 'photos') ? 'Hide trip photos' : 'Trip photos'}
                  </button>
                )}
                {b.canCancel && <button className="ghost small" onClick={() => cancel(b)}>Cancel</button>}
              </div>
              {isOpen(b.id, 'photos') && <TripPhotos bookingId={b.id} />}
              {isOpen(b.id, 'chat') && <MessageThread bookingId={b.id} />}
              {isOpen(b.id, 'review') && <ReviewForm booking={b} onDone={() => { setPanel(null); toast('Thanks for your review!'); load(); }} />}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function ReviewForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [stars, setStars] = useState(0);
  const [driverStars, setDriverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = stars > 0 && (!booking.withDriver || driverStars > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/bookings/${booking.id}/review`, {
        stars, driverStars: booking.withDriver ? driverStars : null, comment,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settle" onSubmit={submit}>
      <StarInput label={`The car: ${booking.vehicleName}`} value={stars} onChange={setStars} />
      {booking.withDriver && <StarInput label={`Your driver: ${booking.driverName}`} value={driverStars} onChange={setDriverStars} />}
      <label>Comment (optional)
        <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="What went well? What could be better?" />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary small" disabled={saving || !ready}>Submit review</button>
    </form>
  );
}
