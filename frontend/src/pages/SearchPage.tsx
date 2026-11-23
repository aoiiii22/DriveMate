import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, queryString } from '../api';
import { useAuth } from '../auth';
import { VehicleCard, VehicleCardSkeleton } from '../components/VehicleCard';
import { pickupDateTime, returnDateTime, toDateInput } from '../format';
import { carLink, filtersFromParams, filtersToParams, type SearchFilters } from '../search';
import { useToast } from '../toast';
import type { VehicleSummary } from '../types';
import { CarFront, Heart, SlidersHorizontal, Truck } from 'lucide-react';

/** Search results. All filters live in the URL, so Back, refresh and shared links keep them. */
export function SearchPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  // useMemo: only rebuild the filters object when the URL actually changes.
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const withDriver = params.get('driver') === '1';
  const [vehicles, setVehicles] = useState<VehicleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const datesBad = Boolean(filters.start && filters.end && filters.start >= filters.end);

  useEffect(() => {
    if (datesBad) return;
    let cancelled = false; // ignore a slow old response if a newer search started
    api.get<VehicleSummary[]>(`/vehicles${queryString({
      start: filters.start ? pickupDateTime(filters.start) : undefined,
      end: filters.end ? returnDateTime(filters.end) : undefined,
      location: filters.location, type: filters.type, seats: filters.seats,
      transmission: filters.transmission, fuelType: filters.fuelType, maxPrice: filters.maxPrice,
      sort: filters.sort,
      favorites: filters.favorites ? 'true' : undefined,
      delivery: filters.delivery ? 'true' : undefined,
    })}`)
      .then((v) => { if (!cancelled) { setVehicles(v); setError(null); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [filters, datesBad]);

  /** Change some filters. replace: true = don't add a Back step for every tweak. */
  const update = (changes: Partial<SearchFilters>) => {
    const next = filtersToParams({ ...filters, ...changes });
    if (withDriver) next.set('driver', '1');
    setVehicles(null); // show the loading placeholders
    setParams(next, { replace: true });
  };
  const set = (key: keyof SearchFilters) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update({ [key]: e.target.value });

  async function toggleFavorite(v: VehicleSummary) {
    // Update the screen first, then the server (feels instant). Undo if it fails.
    const flip = (on: boolean) => setVehicles((list) => list?.map((x) => (x.id === v.id ? { ...x, isFavorite: on } : x)) ?? null);
    flip(!v.isFavorite);
    try {
      if (v.isFavorite) await api.del(`/favorites/${v.id}`);
      else await api.put(`/favorites/${v.id}`, {});
      toast(v.isFavorite ? 'Removed from favorites' : 'Saved to favorites');
    } catch {
      flip(v.isFavorite);
      toast('Could not update favorites', 'error');
    }
  }

  const activeCount = [filters.type, filters.seats, filters.transmission, filters.fuelType, filters.maxPrice]
    .filter(Boolean).length + (filters.delivery ? 1 : 0) + (filters.favorites ? 1 : 0);
  const clearFilters = () => update({ type: '', seats: '', transmission: '', fuelType: '', maxPrice: '', delivery: false, favorites: false });

  return (
    <main className="page search-page">
      <form className="search-bar card sticky-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>Where?<input placeholder="Any city" value={filters.location} onChange={set('location')} /></label>
        <label>Pick-up<input type="date" min={toDateInput(new Date())} value={filters.start} onChange={set('start')} /></label>
        <label>Return<input type="date" min={filters.start} value={filters.end} onChange={set('end')} /></label>
      </form>

      <div className="results-head">
        <p className="muted" aria-live="polite">
          {vehicles && !error && !datesBad ? `${vehicles.length} car${vehicles.length === 1 ? '' : 's'} available` : ' '}
        </p>
        <div className="results-tools">
          <button type="button" className="chip mobile-only" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="ico" aria-hidden="true" /> Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
          <label className="sort">Sort
            <select value={filters.sort} onChange={set('sort')}>
              <option value="">Lowest price</option>
              <option value="price_desc">Highest price</option>
              <option value="rating">Top rated</option>
            </select>
          </label>
        </div>
      </div>

      <div className={`filters ${showFilters ? 'open' : ''}`}>
        <select value={filters.type} onChange={set('type')} aria-label="Vehicle type">
          <option value="">All types</option>
          <option>Sedan</option><option>SUV</option><option>Van</option>
        </select>
        <select value={filters.seats} onChange={set('seats')} aria-label="Seats">
          <option value="">Any seats</option>
          <option value="4">4+ seats</option><option value="7">7+ seats</option><option value="12">12+ seats</option>
        </select>
        <select value={filters.transmission} onChange={set('transmission')} aria-label="Transmission">
          <option value="">Any transmission</option>
          <option>Automatic</option><option>Manual</option>
        </select>
        <select value={filters.fuelType} onChange={set('fuelType')} aria-label="Fuel">
          <option value="">Any fuel</option>
          <option>Gasoline</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
        </select>
        <select value={filters.maxPrice} onChange={set('maxPrice')} aria-label="Max price">
          <option value="">Any price</option>
          <option value="1500">Up to ₱1,500/day</option>
          <option value="2500">Up to ₱2,500/day</option>
          <option value="4000">Up to ₱4,000/day</option>
        </select>
        <button type="button" className={filters.delivery ? 'chip on' : 'chip'} aria-pressed={filters.delivery}
          onClick={() => update({ delivery: !filters.delivery })}><Truck className="ico" aria-hidden="true" /> Delivers to you</button>
        {user && (
          <button type="button" className={filters.favorites ? 'chip on' : 'chip'} aria-pressed={filters.favorites}
            onClick={() => update({ favorites: !filters.favorites })}><Heart className="ico" aria-hidden="true" /> Favorites</button>
        )}
        {activeCount > 0 && <button type="button" className="link" onClick={clearFilters}>Clear all</button>}
      </div>

      {datesBad && <p className="error">The return date must be after the pick-up date.</p>}
      {error && <p className="error">{error}</p>}

      {!datesBad && vehicles?.length === 0 && (
        <section className="card empty">
          <CarFront className="empty-icon" aria-hidden="true" />
          <h3>No cars match</h3>
          <p className="muted">Try other dates, another city, or fewer filters.</p>
          {activeCount > 0 && <button className="ghost small" onClick={clearFilters}>Clear filters</button>}
        </section>
      )}

      <div className="car-grid">
        {vehicles === null && !error && !datesBad && Array.from({ length: 6 }, (_, i) => <VehicleCardSkeleton key={i} />)}
        {!datesBad && vehicles?.map((v) => (
          <VehicleCard key={v.id} vehicle={v} to={carLink(v.id, filters.start, filters.end, withDriver)}
            onToggleFavorite={user ? toggleFavorite : undefined} />
        ))}
      </div>
    </main>
  );
}
