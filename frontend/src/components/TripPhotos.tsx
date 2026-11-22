import { useEffect, useState } from 'react';
import { api } from '../api';
import { shortDateTime } from '../format';
import type { Inspection } from '../types';
import { AuthImage } from './AuthImage';
import { TriangleAlert } from 'lucide-react';

const fuelLabel = (p: number) => ({ 0: 'Empty', 25: '¼', 50: '½', 75: '¾', 100: 'Full' } as Record<number, string>)[p] ?? `${p}%`;

/** Pick-up and return inspections next to each other, with the distance driven and fuel change. */
export function TripPhotos({ bookingId }: { bookingId: number }) {
  const [items, setItems] = useState<Inspection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Inspection[]>(`/bookings/${bookingId}/inspections`).then(setItems).catch((e: Error) => setError(e.message));
  }, [bookingId]);

  if (error) return <p className="error">{error}</p>;
  if (!items) return <p className="muted">Loading photos…</p>;

  const pickup = items.find((i) => i.stage === 'PickUp');
  const ret = items.find((i) => i.stage === 'Return');

  return (
    <div className="trip-photos">
      {pickup && ret && (
        <p className="notice">
          Driven {(ret.odometerKm - pickup.odometerKm).toLocaleString()} km · Fuel {fuelLabel(pickup.fuelPercent)} → {fuelLabel(ret.fuelPercent)}
          {ret.fuelPercent < pickup.fuelPercent && <span className="warn-inline"> <TriangleAlert className="ico" aria-hidden="true" /> lower than at pick-up</span>}
        </p>
      )}
      {items.map((i) => (
        <section key={i.id}>
          <h4>{i.stage === 'PickUp' ? 'Pick-up' : 'Return'} · {shortDateTime(i.createdAt)} · by {i.createdByName}</h4>
          <p className="muted">{i.odometerKm.toLocaleString()} km · Fuel {fuelLabel(i.fuelPercent)}{i.notes && ` · "${i.notes}"`}</p>
          <div className="photo-row">
            {i.photos.map((p) => (
              <figure key={p.fileId}>
                <AuthImage fileId={p.fileId} alt={p.angle} className="trip-photo" />
                <figcaption>{p.angle}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
