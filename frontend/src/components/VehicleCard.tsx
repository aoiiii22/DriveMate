import { Link } from 'react-router';
import { peso } from '../format';
import type { VehicleSummary } from '../types';
import { Heart, MapPin, Plane, Star, Truck } from 'lucide-react';

interface Props {
  vehicle: VehicleSummary;
  to: string;
  /** Shown only when logged in. */
  onToggleFavorite?: (v: VehicleSummary) => void;
}

/**
 * A photo-first car card (like Turo's results): the whole card is one link.
 * The heart sits next to the link, not inside it, because a button inside a link isn't valid HTML.
 */
export function VehicleCard({ vehicle: v, to, onToggleFavorite }: Props) {
  return (
    <div className="vehicle-card-wrap">
      <Link to={to} className="vehicle-card card">
        <img src={v.imageUrl} alt="" loading="lazy" />
        <div className="vehicle-card-body">
          <h3>{v.name}</h3>
          <p>
            <span className="rating"><Star className="ico" aria-hidden="true" /> {v.rating ? v.rating.toFixed(1) : 'New'}</span>
            {v.reviewCount > 0 && <span className="muted"> ({v.reviewCount})</span>}
            <span className="muted"> · {v.type} · {v.seats} seats · {v.transmission}</span>
          </p>
          <p className="muted"><MapPin className="ico" aria-hidden="true" /> {v.location}</p>
          {(v.offersDelivery || v.offersAirport) && (
            <p className="tags">
              {v.offersDelivery && <span className="tag"><Truck className="ico" aria-hidden="true" /> Delivery</span>}
              {v.offersAirport && <span className="tag"><Plane className="ico" aria-hidden="true" /> Airport</span>}
            </p>
          )}
          <div className="price-line">
            <span><strong>{peso(v.pricePerDay)}</strong><span className="muted">/day</span></span>
            {v.tripTotal != null && v.tripDays != null && (
              <span className="trip-total">{peso(v.tripTotal)} <span className="muted">total · {v.tripDays} day{v.tripDays > 1 ? 's' : ''}</span></span>
            )}
          </div>
        </div>
      </Link>
      {onToggleFavorite && (
        <button type="button" className={`heart ${v.isFavorite ? 'on' : ''}`} aria-pressed={v.isFavorite}
          aria-label={v.isFavorite ? `Remove ${v.name} from favorites` : `Save ${v.name} to favorites`}
          onClick={() => onToggleFavorite(v)}><Heart className="ico" fill={v.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
      )}
    </div>
  );
}

/** Grey placeholder cards while results load (feels faster than "Loading…"). */
export function VehicleCardSkeleton() {
  return (
    <div className="vehicle-card card skeleton" aria-hidden="true">
      <div className="skeleton-img" />
      <div className="vehicle-card-body">
        <div className="skeleton-line w70" />
        <div className="skeleton-line w50" />
        <div className="skeleton-line w30" />
      </div>
    </div>
  );
}
