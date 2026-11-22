import { addDays, toDateInput } from './format';

/** Everything on the search screen. Stored in the URL (?start=...&type=SUV) so Back and shared links keep it. */
export interface SearchFilters {
  start: string; // yyyy-mm-dd
  end: string;
  location: string;
  type: string;
  seats: string;
  transmission: string;
  fuelType: string;
  maxPrice: string;
  sort: string;
  favorites: boolean;
  delivery: boolean;
}

export function defaultDates(): { start: string; end: string } {
  const tomorrow = addDays(new Date(), 1);
  return { start: toDateInput(tomorrow), end: toDateInput(addDays(tomorrow, 2)) };
}

export function filtersFromParams(p: URLSearchParams): SearchFilters {
  const d = defaultDates();
  return {
    start: p.get('start') ?? d.start,
    end: p.get('end') ?? d.end,
    location: p.get('location') ?? '',
    type: p.get('type') ?? '',
    seats: p.get('seats') ?? '',
    transmission: p.get('transmission') ?? '',
    fuelType: p.get('fuelType') ?? '',
    maxPrice: p.get('maxPrice') ?? '',
    sort: p.get('sort') ?? '',
    favorites: p.get('favorites') === 'true',
    delivery: p.get('delivery') === 'true',
  };
}

/** Only non-empty values go in the URL, so it stays short and readable. */
export function filtersToParams(f: Partial<SearchFilters>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(f)) {
    if (value === true) p.set(key, 'true');
    else if (typeof value === 'string' && value !== '') p.set(key, value);
  }
  return p;
}

/** Link to the search page with some filters, e.g. searchLink({ type: 'SUV' }). */
export const searchLink = (f: Partial<SearchFilters>) => `/search?${filtersToParams({ ...defaultDates(), ...f })}`;

/** Link to a car, carrying the trip dates (and "with driver" choice from the home page) along. */
export function carLink(id: number, start?: string, end?: string, withDriver = false): string {
  const p = new URLSearchParams();
  if (start && end) { p.set('start', start); p.set('end', end); }
  if (withDriver) p.set('driver', '1');
  const q = p.toString();
  return `/cars/${id}${q ? `?${q}` : ''}`;
}
