import { useState } from 'react';
import { api } from '../api';
import { PhotoPicker } from '../components/PhotoPicker';
import type { InspectionStage, InspectionTarget, PhotoAngle } from '../types';
import { Banknote } from 'lucide-react';

interface Props {
  booking: InspectionTarget;
  stage: InspectionStage;
  onDone: () => void;
  onCancel: () => void;
}

const requiredAngles: { angle: PhotoAngle; label: string }[] = [
  { angle: 'Front', label: 'Front' },
  { angle: 'Back', label: 'Back' },
  { angle: 'Left', label: 'Left side' },
  { angle: 'Right', label: 'Right side' },
  { angle: 'Dashboard', label: 'Dashboard (odometer + fuel)' },
];

const fuelLevels = [
  { value: 0, label: 'Empty' }, { value: 25, label: '¼' }, { value: 50, label: '½' },
  { value: 75, label: '¾' }, { value: 100, label: 'Full' },
];

/**
 * Pick-up check-in or return check-out. Like Turo: photos of every side plus the dashboard,
 * so any new scratch or missing fuel can be proven later.
 */
export function InspectionPage({ booking, stage, onDone, onCancel }: Props) {
  const [photos, setPhotos] = useState<Partial<Record<PhotoAngle, string | null>>>({});
  const [extra, setExtra] = useState<{ angle: PhotoAngle; fileId: string | null }[]>([]);
  const [odometer, setOdometer] = useState('');
  const [fuel, setFuel] = useState(100);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allRequired = requiredAngles.every((r) => photos[r.angle]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const list = [
        ...requiredAngles.map((r) => ({ fileId: photos[r.angle], angle: r.angle })),
        ...extra.filter((x) => x.fileId),
      ];
      await api.post(`/bookings/${booking.id}/inspections`, {
        stage, odometerKm: Number(odometer), fuelPercent: fuel, notes, photos: list,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isPickup = stage === 'PickUp';

  return (
    <main className="page narrow">
      <form className="card auth-form" onSubmit={submit}>
        <h2>{isPickup ? 'Start your trip' : 'Return the vehicle'}</h2>
        <p className="muted">{booking.vehicleName} · {booking.vehiclePlate}</p>
        <p className="hint">
          {isPickup
            ? 'Walk around the car and photograph every side. Point out any existing scratches now, so you are not charged for them later.'
            : 'Take the same photos again. They are compared with the pick-up photos.'}
        </p>

        <div className="photo-grid">
          {requiredAngles.map((r) => (
            <PhotoPicker key={r.angle} label={r.label} bookingId={booking.id} fileId={photos[r.angle] ?? null}
              onUploaded={(id) => setPhotos((p) => ({ ...p, [r.angle]: id }))} />
          ))}
          {extra.map((x, i) => (
            <PhotoPicker key={i} label={x.angle === 'Damage' ? 'Damage close-up' : 'Interior'} bookingId={booking.id}
              fileId={x.fileId}
              onUploaded={(id) => setExtra((list) => list.map((y, j) => (j === i ? { ...y, fileId: id } : y)))} />
          ))}
        </div>
        {extra.length < 10 && (
          <div className="actions">
            <button type="button" className="ghost small" onClick={() => setExtra([...extra, { angle: 'Interior', fileId: null }])}>+ Interior photo</button>
            <button type="button" className="ghost small" onClick={() => setExtra([...extra, { angle: 'Damage', fileId: null }])}>+ Damage photo</button>
          </div>
        )}

        <div className="row">
          <label>Odometer (km)
            <input type="number" inputMode="numeric" required min={0} max={2000000} value={odometer}
              onChange={(e) => setOdometer(e.target.value)} />
          </label>
          <label>Fuel level
            <select value={fuel} onChange={(e) => setFuel(Number(e.target.value))}>
              {fuelLevels.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
        </div>
        <label>Notes (optional)
          <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={isPickup ? 'e.g. Small scratch on rear bumper' : 'e.g. All good, no new damage'} />
        </label>

        {isPickup && booking.depositStatus === 'Unpaid' && (
          <p className="notice"><Banknote className="ico" aria-hidden="true" /> Pay the rental and the deposit in cash to the owner now.</p>
        )}
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={saving || !allRequired}>
          {saving ? 'Saving…' : isPickup ? 'Confirm pick-up' : 'Confirm return'}
        </button>
        {!allRequired && <p className="hint center">Add all 5 required photos to continue.</p>}
        <button type="button" className="link" onClick={onCancel}>Back</button>
      </form>
    </main>
  );
}
