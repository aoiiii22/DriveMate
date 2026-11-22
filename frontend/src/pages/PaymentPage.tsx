import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '../api';
import { paymentLabel, peso, shortDateTime } from '../format';
import { useToast } from '../toast';
import type { Booking, PaymentMethod } from '../types';
import { Banknote, CircleCheck, CreditCard, type LucideIcon, Smartphone } from 'lucide-react';

const methods: { method: PaymentMethod; icon: LucideIcon; hint: string }[] = [
  { method: 'GCash', icon: Smartphone, hint: 'Pay now with your GCash wallet' },
  { method: 'Card', icon: CreditCard, hint: 'Visa, Mastercard, JCB' },
  { method: 'CashOnPickup', icon: Banknote, hint: 'Pay the owner when you get the car' },
];

/** Simulated checkout at /pay/:id: no real money moves. Loads the booking from the URL, so refresh works. */
export function PaymentPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const toast = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('GCash');
  const [paid, setPaid] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Booking>(`/bookings/${id}`).then(setBooking).catch((e: Error) => setError(e.message));
  }, [id]);

  // replace: the paid checkout page leaves the Back history, so Back doesn't land on it again.
  const onDone = () => navigate('/trips', { replace: true });

  async function pay() {
    setSaving(true);
    setError(null);
    try {
      const result = await api.post<Booking>(`/bookings/${id}/pay`, { method });
      setPaid(result);
      toast(method === 'CashOnPickup' ? 'Booking confirmed!' : 'Payment received. Booking confirmed!');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!booking) return <main className="page narrow">{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</main>;
  if (!paid && !booking.canPay) {
    return <main className="page narrow"><p className="card empty">This booking doesn't need payment. <button className="link" onClick={onDone}>Go to My trips</button></p></main>;
  }

  const b = paid ?? booking;

  return (
    <main className="page narrow">
      <section className="card">
        {paid ? <h2><CircleCheck className="ico" aria-hidden="true" /> Booking confirmed</h2> : <h2>Pay for booking #{b.id}</h2>}
        <img className="thumb" src={b.vehicleImageUrl} alt="" />
        <p><strong>{b.vehicleName}</strong> {b.withDriver && `with ${b.driverName}`}</p>
        <p className="muted">{shortDateTime(b.startDate)} → {shortDateTime(b.endDate)}</p>
        <p className="muted">{b.pickupLocation} → {b.destination}</p>

        <dl className="summary">
          <dt>Vehicle</dt><dd>{peso(b.vehicleCost)}</dd>
          {b.longRentalDiscount > 0 && <><dt className="discount">Long-rental discount</dt><dd className="discount">−{peso(b.longRentalDiscount)}</dd></>}
          {b.driverCost > 0 && <><dt>Driver</dt><dd>{peso(b.driverCost)}</dd></>}
          {b.protectionCost > 0 && <><dt>{b.protectionPlan} protection</dt><dd>{peso(b.protectionCost)}</dd></>}
          {b.deliveryFee > 0 && <><dt>{b.handover === 'Airport' ? 'Airport hand-over' : 'Delivery'}</dt><dd>{peso(b.deliveryFee)}</dd></>}
          {b.promoDiscount > 0 && <><dt className="discount">Promo {b.promoCode}</dt><dd className="discount">−{peso(b.promoDiscount)}</dd></>}
          <dt>Rental total</dt><dd>{peso(b.totalPrice)}</dd>
          {b.securityDeposit > 0 && <><dt>Refundable deposit</dt><dd>{peso(b.securityDeposit)}</dd></>}
          <dt className="total">To pay</dt><dd className="total">{peso(b.totalPrice + b.securityDeposit)}</dd>
        </dl>
        <p className="hint">The deposit is returned after the vehicle is checked at return.</p>

        {paid ? (
          <>
            <p>Paid with <strong>{paymentLabel[paid.paymentMethod ?? '']}</strong>
              {paid.isPaid ? ' (paid)' : ' — pay the owner (rental + deposit) when you pick up the vehicle.'}</p>
            <ol className="next-steps">
              <li>On pick-up day, open <strong>My trips</strong> and tap <strong>Start trip</strong> to take the check-in photos.</li>
              <li>Questions for the owner? Use <strong>Messages</strong> on the trip.</li>
            </ol>
            <button className="primary" onClick={onDone}>Go to My trips</button>
          </>
        ) : (
          <>
            <h3>Payment method</h3>
            {methods.map((m) => (
              <label key={m.method} className={`driver-option ${method === m.method ? 'selected' : ''}`}>
                <input type="radio" name="method" checked={method === m.method} onChange={() => setMethod(m.method)} />
                <span><strong><m.icon className="ico" aria-hidden="true" /> {paymentLabel[m.method]}</strong><br /><span className="muted small-text">{m.hint}</span></span>
              </label>
            ))}
            <p className="hint">Demo only: payments are simulated.</p>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={saving} onClick={pay}>
              {saving ? 'Processing…' : method === 'CashOnPickup' ? 'Confirm, pay at pick-up' : `Pay ${peso(b.totalPrice + b.securityDeposit)}`}
            </button>
            <button className="link" onClick={onDone}>Pay later</button>
          </>
        )}
      </section>
    </main>
  );
}
