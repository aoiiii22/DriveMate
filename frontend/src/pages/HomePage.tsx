import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { InstallCard } from '../components/InstallCard';
import { VehicleCard } from '../components/VehicleCard';
import { toDateInput } from '../format';
import { carLink, defaultDates, filtersToParams, searchLink } from '../search';
import type { VehicleSummary } from '../types';
import { BadgePercent, Camera, Car, IdCard, ShieldCheck, UserRound } from 'lucide-react';

const categories = [
  { type: 'Sedan', label: 'Sedans', hint: 'City trips', img: '/images/vehicles/sedan.svg' },
  { type: 'SUV', label: 'SUVs', hint: 'Family & province', img: '/images/vehicles/suv.svg' },
  { type: 'Van', label: 'Vans', hint: 'Groups up to 15', img: '/images/vehicles/van.svg' },
];

/** Landing page: one simple search first (like Turo/Klook), then categories, how it works and top cars. */
export function HomePage() {
  const navigate = useNavigate();
  const [{ start, end }, setDates] = useState(defaultDates);
  const [location, setLocation] = useState('');
  const [withDriver, setWithDriver] = useState(false);
  const [topCars, setTopCars] = useState<VehicleSummary[]>([]);

  useEffect(() => {
    api.get<VehicleSummary[]>('/vehicles?sort=rating').then((v) => setTopCars(v.slice(0, 4))).catch(() => setTopCars([]));
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search?${filtersToParams({ start, end, location })}${withDriver ? '&driver=1' : ''}`);
  }

  return (
    <>
      <section className="hero home-hero">
        <h1>Your Ride, Your Choice.</h1>
        <p>Rent a car from trusted local owners. Drive yourself or book a professional driver.</p>

        <form className="search-bar card big-search" onSubmit={search} role="search">
          <label>Where?<input placeholder="City, e.g. Makati" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
          <label>Pick-up<input type="date" required min={toDateInput(new Date())} value={start}
            onChange={(e) => setDates({ start: e.target.value, end })} /></label>
          <label>Return<input type="date" required min={start} value={end}
            onChange={(e) => setDates({ start, end: e.target.value })} /></label>
          <button className="primary">Search cars</button>
          <div className="toggle mini" role="radiogroup" aria-label="Driving option">
            <button type="button" className={!withDriver ? 'active' : ''} onClick={() => setWithDriver(false)}><Car className="ico" aria-hidden="true" /> Self-drive</button>
            <button type="button" className={withDriver ? 'active' : ''} onClick={() => setWithDriver(true)}><UserRound className="ico" aria-hidden="true" /> With driver</button>
          </div>
        </form>
      </section>

      <main className="page home">
        <section>
          <h2 className="section-title">Browse by type</h2>
          <div className="category-grid">
            {categories.map((c) => (
              <Link key={c.type} to={searchLink({ type: c.type })} className="category card">
                <img src={c.img} alt="" />
                <strong>{c.label}</strong>
                <span className="muted small-text">{c.hint}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-title">How DriveMate works</h2>
          <ol className="steps-grid">
            <li className="card"><span className="step-num">1</span><strong>Find your ride</strong><p className="muted">Pick dates and a car. See the full price before you book. No surprises.</p></li>
            <li className="card"><span className="step-num">2</span><strong>Book &amp; pay</strong><p className="muted">Choose self-drive or a driver, add protection, and pay with GCash, card or cash.</p></li>
            <li className="card"><span className="step-num">3</span><strong>Hit the road</strong><p className="muted">Check in with photos at pick-up, enjoy the trip, and get your deposit back after return.</p></li>
          </ol>
        </section>

        <section className="trust">
          <div><IdCard className="trust-icon" aria-hidden="true" /><strong>Verified renters</strong><p className="muted small-text">Licence and ID checked before self-drive</p></div>
          <div><ShieldCheck className="trust-icon" aria-hidden="true" /><strong>Protection plans</strong><p className="muted small-text">Down to ₱0 liability for damage</p></div>
          <div><Camera className="trust-icon" aria-hidden="true" /><strong>Photo check-in</strong><p className="muted small-text">Pick-up and return photos protect everyone</p></div>
          <div><BadgePercent className="trust-icon" aria-hidden="true" /><strong>Long-trip savings</strong><p className="muted small-text">10% off weekly, 25% off monthly</p></div>
        </section>

        {topCars.length > 0 && (
          <section>
            <div className="section-head">
              <h2 className="section-title">Top-rated cars</h2>
              <Link to={searchLink({ sort: 'rating' })}>See all →</Link>
            </div>
            <div className="grid">
              {topCars.map((v) => <VehicleCard key={v.id} vehicle={v} to={carLink(v.id, start, end)} />)}
            </div>
          </section>
        )}

        <InstallCard />

        <section className="card cta">
          <div>
            <h2>Own a car? Earn with DriveMate.</h2>
            <p className="muted">List your car or drive for us. You keep 85% of every booking.</p>
          </div>
          <Link className="primary" to="/partner">Become a partner</Link>
        </section>
      </main>
    </>
  );
}
