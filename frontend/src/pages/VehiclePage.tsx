import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api, queryString } from '../api';
import { useAuth } from '../auth';
import { peso, pickupDateTime, returnDateTime, shortDate, toDateInput } from '../format';
import { creditFor } from '../photoCredits';
import { defaultDates } from '../search';
import { useToast } from '../toast';
import type {
  Agreement, Booking, BookingDraft, Driver, HandoverType, MyVerification, ProtectionPlanInfo, Quote, Review, VehicleDetail,
} from '../types';
import { ArrowLeft, BadgePercent, Car, CarFront, Check, Fuel, Heart, MapPin, Plane, Settings2, Star, Truck, UserRound, Users } from 'lucide-react';
import { Stars } from '../components/Stars';

const terminals = ['NAIA Terminal 1', 'NAIA Terminal 2', 'NAIA Terminal 3'];
const stepNames = ['Trip details', 'Protection & extras', 'Review & book'];

interface Props {
  vehicleId: number;
  draft: BookingDraft;
  onDraftChange: (draft: BookingDraft) => void;
  onBooked: () => void;
}

/**
 * Car details + a 3-step booking (like Turo's checkout): 1 trip, 2 protection & extras, 3 review.
 * The price summary is always visible; on phones it's a sticky bar at the bottom.
 */
export function VehiclePage({ vehicleId, draft, onDraftChange, onBooked }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const fallback = defaultDates();
  const start = params.get('start') ?? fallback.start;
  const end = params.get('end') ?? fallback.end;

  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [plans, setPlans] = useState<ProtectionPlanInfo[]>([]);
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [verification, setVerification] = useState<MyVerification | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // ?step=3 is used when coming back from the login page, so the visitor lands where they left off.
  const [step, setStep] = useState(() => Math.min(3, Math.max(1, Number(params.get('step')) || 1)));
  const [tried, setTried] = useState(false); // show field errors only after "Continue" was pressed
  const formRef = useRef<HTMLFormElement>(null);

  const { withDriver, driverId, pickup, destination, plan, acceptAgreement, handover, promoCode } = draft;
  const update = (changes: Partial<BookingDraft>) => onDraftChange({ ...draft, ...changes });
  const [promoInput, setPromoInput] = useState(promoCode);
  const [driverReviews, setDriverReviews] = useState<{ driverId: number; reviews: Review[] } | null>(null);

  const datesOk = Boolean(start && end && start < end);
  const setDates = (s: string, e: string) => setParams((p) => { p.set('start', s); p.set('end', e); return p; }, { replace: true });

  useEffect(() => {
    api.get<VehicleDetail>(`/vehicles/${vehicleId}`).then(setVehicle).catch((e: Error) => setError(e.message));
  }, [vehicleId]);

  useEffect(() => {
    api.get<ProtectionPlanInfo[]>('/bookings/plans').then(setPlans).catch(() => setPlans([]));
    api.get<Agreement>('/bookings/agreement').then(setAgreement).catch(() => setAgreement(null));
  }, []);

  // Is the customer allowed to self-drive? (Checked again on the server when booking.)
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    api.get<MyVerification>('/verification/me').then(setVerification).catch(() => setVerification(null));
  }, [userId]);

  // Drivers free for the chosen dates.
  useEffect(() => {
    if (!withDriver || !datesOk) return;
    api.get<Driver[]>(`/drivers/available${queryString({ start: pickupDateTime(start), end: returnDateTime(end) })}`)
      .then(setDrivers)
      .catch((e: Error) => setError(e.message));
  }, [withDriver, datesOk, start, end]);

  // Keep the chosen driver if still free for these dates, else pick the best rated.
  const chosenDriver = withDriver
    ? (drivers.some((d) => d.id === driverId) ? driverId : drivers[0]?.id ?? null)
    : null;

  // Live price from the server (the server is the only source of truth for prices).
  useEffect(() => {
    if (!datesOk) return;
    api.get<Quote>(`/bookings/quote${queryString({
      vehicleId, driverId: chosenDriver, plan, handover, promoCode,
      start: pickupDateTime(start), end: returnDateTime(end),
    })}`).then(setQuote).catch(() => setQuote(null));
  }, [vehicleId, chosenDriver, plan, handover, promoCode, datesOk, start, end]);

  async function showDriverReviews(id: number) {
    if (driverReviews?.driverId === id) { setDriverReviews(null); return; }
    setDriverReviews({ driverId: id, reviews: await api.get<Review[]>(`/drivers/${id}/reviews`) });
  }

  async function toggleFavorite() {
    if (!vehicle) return;
    const on = !vehicle.isFavorite;
    setVehicle({ ...vehicle, isFavorite: on });
    try {
      if (on) await api.put(`/favorites/${vehicle.id}`, {});
      else await api.del(`/favorites/${vehicle.id}`);
      toast(on ? 'Saved to favorites' : 'Removed from favorites');
    } catch {
      setVehicle({ ...vehicle, isFavorite: !on });
    }
  }

  function chooseHandover(h: HandoverType) {
    // The pick-up field means something different per option, so clear it (or preset the terminal).
    update({ handover: h, pickup: h === 'Airport' ? terminals[2] : '' });
  }

  // ---------- Step rules ----------
  const credit = vehicle ? creditFor(vehicle.imageUrl) : undefined;
  const isCustomer = !user || user.role === 'Customer';
  // Same rules as the server: self-drive needs Approved; with a driver, just a submitted (not rejected) ID.
  const vStatus = verification?.status ?? null;
  const verifyBlock = Boolean(user && verification && (withDriver
    ? vStatus === null || vStatus === 'Rejected'
    : vStatus !== 'Approved'));

  const step1Problems = [
    !datesOk && 'Choose a return date after the pick-up date.',
    !pickup.trim() && (handover === 'Delivery' ? 'Enter your delivery address.' : 'Enter a meeting point.'),
    !destination.trim() && 'Where are you going? Enter a destination.',
    withDriver && !chosenDriver && 'Choose a driver (or switch to self-drive).',
  ].filter((p): p is string => Boolean(p));

  function next() {
    setTried(true);
    if (step === 1 && step1Problems.length > 0) return;
    setTried(false);
    setStep(step + 1);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function book() {
    if (!user) {
      const back = new URLSearchParams(location.search);
      back.set('step', '3');
      navigate(`/login?next=${encodeURIComponent(`${location.pathname}?${back}`)}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const booking = await api.post<Booking>('/bookings', {
        vehicleId, withDriver, driverId: chosenDriver,
        start: pickupDateTime(start), end: returnDateTime(end),
        pickupLocation: pickup, destination, protectionPlan: plan, acceptAgreement, handover,
        // Only send a code the quote accepted, so a typo doesn't block the booking.
        promoCode: quote?.promoError ? null : promoCode || null,
      });
      onBooked();
      toast('Booked! Now choose how to pay.');
      navigate(`/pay/${booking.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const canBook = datesOk && isCustomer && !verifyBlock && (!user || acceptAgreement) && step1Problems.length === 0;
  const primary = step < 3
    ? { label: 'Continue', onClick: next, disabled: false }
    : { label: saving ? 'Booking…' : user ? 'Book now' : 'Log in to book', onClick: book, disabled: saving || !canBook };

  if (!vehicle) {
    return <main className="page">{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</main>;
  }

  const driver = drivers.find((d) => d.id === chosenDriver);

  return (
    <main className="page vehicle-page">
      <button className="link" onClick={() => navigate(-1)}><ArrowLeft className="ico" aria-hidden="true" /> Back</button>

      <div className="detail">
        {/* ---------------- Car info ---------------- */}
        <section className="card detail-info">
          <img src={vehicle.imageUrl} alt={vehicle.name} />
          {credit && (
            <p className="photo-credit">
              Photo: {credit.photographer}, <a href={credit.source} target="_blank" rel="noreferrer">{credit.license}</a> via Wikimedia Commons
            </p>
          )}
          <div className="title-row">
            <h1 className="car-title">{vehicle.name}</h1>
            {user && (
              <button type="button" className={`heart heart-inline ${vehicle.isFavorite ? 'on' : ''}`} aria-pressed={vehicle.isFavorite}
                aria-label={vehicle.isFavorite ? 'Remove from favorites' : 'Save to favorites'} onClick={toggleFavorite}>
                <Heart className="ico" fill={vehicle.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            )}
          </div>
          <p>
            <span className="rating"><Star className="ico" aria-hidden="true" /> {vehicle.rating ? vehicle.rating.toFixed(1) : 'New'}</span>
            {vehicle.ratingCount > 0 && <span className="muted"> ({vehicle.ratingCount} rating{vehicle.ratingCount > 1 ? 's' : ''})</span>}
            <span className="muted"> · <MapPin className="ico" aria-hidden="true" /> {vehicle.location} · Hosted by {vehicle.ownerName}</span>
          </p>

          <ul className="spec-grid">
            <li><CarFront className="ico" aria-hidden="true" />{vehicle.type}</li>
            <li><Users className="ico" aria-hidden="true" />{vehicle.seats} seats</li>
            <li><Settings2 className="ico" aria-hidden="true" />{vehicle.transmission}</li>
            <li><Fuel className="ico" aria-hidden="true" />{vehicle.fuelType}</li>
            {vehicle.deliveryFee !== null && <li><Truck className="ico" aria-hidden="true" />Delivers</li>}
            {vehicle.airportFee !== null && <li><Plane className="ico" aria-hidden="true" />NAIA pick-up</li>}
          </ul>

          <p className="price">{peso(vehicle.pricePerDay)}<span className="muted">/day</span></p>
          <p className="hint"><BadgePercent className="ico" aria-hidden="true" /> 10% off for 7+ days · 25% off for 28+ days</p>
          {vehicle.description && <p>{vehicle.description}</p>}

          {vehicle.bookedDates.length > 0 && (
            <>
              <h2 className="sub">Not available</h2>
              <ul className="booked">
                {vehicle.bookedDates.map((d) => <li key={d.start}>{shortDate(d.start)} – {shortDate(d.end)}</li>)}
              </ul>
            </>
          )}

          <h2 className="sub">Reviews ({vehicle.reviews.length})</h2>
          {vehicle.reviews.length === 0 && <p className="muted">No reviews yet. Be the first!</p>}
          {vehicle.reviews.map((r) => (
            <blockquote key={r.id} className="review">
              <strong><Stars value={r.stars} /></strong> {r.customerName}
              {r.comment && <p>{r.comment}</p>}
            </blockquote>
          ))}
        </section>

        {/* ---------------- Booking steps ---------------- */}
        <form ref={formRef} className="card booking-form" onSubmit={(e) => { e.preventDefault(); primary.onClick(); }}>
          <ol className="stepper" aria-label="Booking steps">
            {stepNames.map((name, i) => (
              <li key={name} className={i + 1 === step ? 'current' : i + 1 < step ? 'done' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
                <button type="button" disabled={i + 1 > step} onClick={() => setStep(i + 1)}>
                  <span className="dot">{i + 1 < step ? <Check className="ico" aria-hidden="true" /> : i + 1}</span><span className="step-label">{name}</span>
                </button>
              </li>
            ))}
          </ol>

          {step === 1 && (
            <>
              <div className="row">
                <label>Pick-up date
                  <input type="date" required min={toDateInput(new Date())} value={start} onChange={(e) => setDates(e.target.value, end)} />
                </label>
                <label>Return date
                  <input type="date" required min={start} value={end} onChange={(e) => setDates(start, e.target.value)} />
                </label>
              </div>
              <p className="hint">Pick-up 8:00 AM · Return 6:00 PM</p>

              <div className="toggle" role="radiogroup" aria-label="Driving option">
                <button type="button" role="radio" aria-checked={!withDriver} className={!withDriver ? 'active' : ''} onClick={() => update({ withDriver: false })}><Car className="ico" aria-hidden="true" /> Self-drive</button>
                <button type="button" role="radio" aria-checked={withDriver} className={withDriver ? 'active' : ''} onClick={() => update({ withDriver: true })}><UserRound className="ico" aria-hidden="true" /> With driver</button>
              </div>

              {withDriver && datesOk && drivers.length === 0 && <p className="error">No drivers are free for these dates. Try other dates or self-drive.</p>}
              {withDriver && datesOk && drivers.map((d) => (
                <div key={d.id}>
                  <label className={`driver-option ${chosenDriver === d.id ? 'selected' : ''}`}>
                    <input type="radio" name="driver" checked={chosenDriver === d.id} onChange={() => update({ driverId: d.id })} />
                    <span>
                      <strong>{d.fullName}</strong> · <span className="rating"><Star className="ico" aria-hidden="true" /> {d.rating ? d.rating.toFixed(1) : 'New'}</span>
                      {d.ratingCount > 0 && <span className="muted"> ({d.ratingCount})</span>} · {d.yearsExperience} yrs
                    </span>
                    <span>{peso(d.pricePerDay)}/day</span>
                  </label>
                  <button type="button" className="link small-text" onClick={() => showDriverReviews(d.id)}>
                    {driverReviews?.driverId === d.id ? 'Hide reviews' : 'See reviews'}
                  </button>
                  {driverReviews?.driverId === d.id && (
                    driverReviews.reviews.length === 0
                      ? <p className="hint">No written reviews yet.</p>
                      : driverReviews.reviews.map((r) => (
                        <blockquote key={r.id} className="review">
                          <strong><Stars value={r.stars} /></strong> {r.customerName}
                          {r.comment && <p>{r.comment}</p>}
                        </blockquote>
                      ))
                  )}
                </div>
              ))}

              <fieldset className="plans">
                <legend>How do you get the car?</legend>
                <label className={`driver-option ${handover === 'OwnerLocation' ? 'selected' : ''}`}>
                  <input type="radio" name="handover" checked={handover === 'OwnerLocation'} onChange={() => chooseHandover('OwnerLocation')} />
                  <span><strong>Meet the owner</strong><br /><span className="muted small-text">In {vehicle.location}</span></span>
                  <span>Free</span>
                </label>
                {vehicle.deliveryFee !== null && (
                  <label className={`driver-option ${handover === 'Delivery' ? 'selected' : ''}`}>
                    <input type="radio" name="handover" checked={handover === 'Delivery'} onChange={() => chooseHandover('Delivery')} />
                    <span><strong><Truck className="ico" aria-hidden="true" /> Deliver to me</strong><br /><span className="muted small-text">The owner brings it to your address</span></span>
                    <span>{peso(vehicle.deliveryFee)}</span>
                  </label>
                )}
                {vehicle.airportFee !== null && (
                  <label className={`driver-option ${handover === 'Airport' ? 'selected' : ''}`}>
                    <input type="radio" name="handover" checked={handover === 'Airport'} onChange={() => chooseHandover('Airport')} />
                    <span><strong><Plane className="ico" aria-hidden="true" /> Airport pick-up</strong><br /><span className="muted small-text">Meet at NAIA arrivals</span></span>
                    <span>{peso(vehicle.airportFee)}</span>
                  </label>
                )}
              </fieldset>

              {handover === 'Airport' ? (
                <label>Terminal
                  <select value={pickup} onChange={(e) => update({ pickup: e.target.value })}>
                    {terminals.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              ) : (
                <label>{handover === 'Delivery' ? 'Delivery address' : 'Meeting point'}
                  <input maxLength={200} value={pickup} aria-invalid={tried && !pickup.trim()} onChange={(e) => update({ pickup: e.target.value })}
                    placeholder={handover === 'Delivery' ? 'House no., street, barangay, city' : 'e.g. SM Mall of Asia, Pasay'} />
                </label>
              )}
              <label>Destination
                <input maxLength={200} value={destination} aria-invalid={tried && !destination.trim()}
                  onChange={(e) => update({ destination: e.target.value })} placeholder="e.g. Tagaytay City" />
              </label>

              {tried && step1Problems.length > 0 && (
                <ul className="form-errors" role="alert">{step1Problems.map((p) => <li key={p}>{p}</li>)}</ul>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <fieldset className="plans">
                <legend>Protection plan</legend>
                {plans.map((p) => (
                  <label key={p.plan} className={`driver-option ${plan === p.plan ? 'selected' : ''}`}>
                    <input type="radio" name="plan" checked={plan === p.plan} onChange={() => update({ plan: p.plan })} />
                    <span><strong>{p.name}</strong>{p.plan === 'Standard' && <span className="tag"> Popular</span>}<br />
                      <span className="muted small-text">{p.description}</span></span>
                    <span>{p.pricePerDay ? `${peso(p.pricePerDay)}/day` : 'Free'}</span>
                  </label>
                ))}
              </fieldset>

              <div className="promo">
                <label>Promo code
                  <input value={promoInput} maxLength={30} placeholder="e.g. WELCOME10" onChange={(e) => setPromoInput(e.target.value.toUpperCase())} />
                </label>
                {promoCode && promoCode === promoInput
                  ? <button type="button" className="ghost small" onClick={() => { setPromoInput(''); update({ promoCode: '' }); }}>Remove</button>
                  : <button type="button" className="ghost small" disabled={!promoInput.trim()} onClick={() => update({ promoCode: promoInput.trim() })}>Apply</button>}
              </div>
              {promoCode && quote?.promoError && <p className="error small-text">{quote.promoError}</p>}
              {promoCode && quote && !quote.promoError && quote.promoDiscount > 0 && <p className="discount small-text"><Check className="ico" aria-hidden="true" /> {quote.promoCode} saves you {peso(quote.promoDiscount)}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <dl className="review-list">
                <dt>Dates</dt><dd>{shortDate(pickupDateTime(start))} 8:00 AM → {shortDate(returnDateTime(end))} 6:00 PM</dd>
                <dt>{handover === 'Delivery' ? 'Delivered to' : handover === 'Airport' ? 'Airport' : 'Meet at'}</dt><dd>{pickup}</dd>
                <dt>Destination</dt><dd>{destination}</dd>
                <dt>Driving</dt><dd>{withDriver ? `With ${driver?.fullName ?? 'driver'}` : 'Self-drive'}</dd>
                <dt>Protection</dt><dd>{plan}</dd>
              </dl>
              <button type="button" className="link small-text" onClick={() => setStep(1)}>Edit trip details</button>

              {verifyBlock && (
                <p className="notice">
                  {withDriver
                    ? 'Upload a government ID before booking. '
                    : vStatus === 'Pending'
                      ? 'Your licence is still being checked. You can book with a driver meanwhile. '
                      : 'Self-drive needs a verified driver\'s licence. '}
                  {vStatus !== 'Pending' && <Link to="/verify">Verify now →</Link>}
                </p>
              )}

              {agreement && user && (
                <div className="agreement">
                  <label className="checkbox">
                    <input type="checkbox" checked={acceptAgreement} onChange={(e) => update({ acceptAgreement: e.target.checked })} />
                    <span>I agree to the <button type="button" className="link" onClick={() => setShowTerms(!showTerms)}>rental agreement</button></span>
                  </label>
                  {showTerms && (
                    <ol className="terms">
                      {agreement.terms.map((t) => <li key={t}>{t}</li>)}
                      <li className="hint">Version {agreement.version}</li>
                    </ol>
                  )}
                </div>
              )}
              {!user && <p className="hint">You'll log in (or sign up) next. Your choices are kept.</p>}
              {!isCustomer && <p className="hint">Only customer accounts can book.</p>}
            </>
          )}

          <PriceSummary quote={datesOk ? quote : null} handover={handover} />

          {error && <p className="error">{error}</p>}
          <div className="step-actions">
            {step > 1 && <button type="button" className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
            <button className="primary" disabled={primary.disabled}>{primary.label}</button>
          </div>
          <p className="hint center">You won't be charged until you choose a payment method.</p>
        </form>
      </div>

      {/* Phones: the total and the next action are always one thumb away. */}
      <div className="sticky-book mobile-only">
        <div>
          <strong>{quote && datesOk ? peso(quote.total) : peso(vehicle.pricePerDay)}</strong>
          <span className="muted small-text">{quote && datesOk ? ` total · ${quote.days} day${quote.days > 1 ? 's' : ''}` : '/day'}</span>
        </div>
        <button className="primary" disabled={primary.disabled}
          onClick={() => { formRef.current?.scrollIntoView({ behavior: 'smooth' }); primary.onClick(); }}>
          {step < 3 ? `Continue (${step}/3)` : primary.label}
        </button>
      </div>
    </main>
  );
}

function PriceSummary({ quote, handover }: { quote: Quote | null; handover: HandoverType }) {
  if (!quote) return null;
  return (
    <dl className="summary">
      <dt>Vehicle ({quote.days} day{quote.days > 1 ? 's' : ''})</dt><dd>{peso(quote.vehicleCost)}</dd>
      {quote.longRentalDiscount > 0 && <>
        <dt className="discount">{quote.longRentalRate >= 0.25 ? 'Monthly' : 'Weekly'} discount ({quote.longRentalRate * 100}%)</dt>
        <dd className="discount">−{peso(quote.longRentalDiscount)}</dd>
      </>}
      {quote.driverCost > 0 && <><dt>Driver</dt><dd>{peso(quote.driverCost)}</dd></>}
      {quote.protectionCost > 0 && <><dt>{quote.plan} protection</dt><dd>{peso(quote.protectionCost)}</dd></>}
      {quote.deliveryFee > 0 && <><dt>{handover === 'Airport' ? 'Airport hand-over' : 'Delivery'}</dt><dd>{peso(quote.deliveryFee)}</dd></>}
      {quote.promoDiscount > 0 && <><dt className="discount">Promo {quote.promoCode}</dt><dd className="discount">−{peso(quote.promoDiscount)}</dd></>}
      <dt className="total">Total</dt><dd className="total">{peso(quote.total)}</dd>
      <dt className="muted">Refundable deposit</dt><dd className="muted">{peso(quote.securityDeposit)}</dd>
    </dl>
  );
}
