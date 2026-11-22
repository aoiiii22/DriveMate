import { useEffect, useState } from 'react';
import { api } from '../api';
import { AuthImage } from '../components/AuthImage';
import { PhotoPicker } from '../components/PhotoPicker';
import { shortDate, toDateInput } from '../format';
import type { MyVerification } from '../types';
import { CircleCheck } from 'lucide-react';

/** Customer uploads their driver's licence and a government ID for an Admin to check. */
export function VerifyPage() {
  const [current, setCurrent] = useState<MyVerification | null>(null);
  const [editing, setEditing] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licensePhotoId, setLicensePhotoId] = useState<string | null>(null);
  const [idPhotoId, setIdPhotoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<MyVerification>('/verification/me').then(setCurrent).catch((e: Error) => setError(e.message));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      setCurrent(await api.put<MyVerification>('/verification/me', {
        licenseNumber, licenseExpiry, licensePhotoId, idPhotoId,
      }));
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!current) return <main className="page narrow">{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</main>;

  const showForm = editing || current.status === null;

  return (
    <main className="page narrow">
      <section className="card">
        <h2>Verify your account</h2>
        <p className="muted">
          Like other rental apps, we check your driver's licence and a government ID before self-drive trips.
          This protects car owners and keeps DriveMate safe.
        </p>

        {current.status && !showForm && (
          <>
            <p><span className={`status status-${current.status.toLowerCase()}`}>{current.status}</span></p>
            {current.status === 'Pending' && <p>Thanks! An admin is checking your documents. This usually takes less than a day.</p>}
            {current.status === 'Approved' && <p><CircleCheck className="ico" aria-hidden="true" /> You're verified and can book self-drive trips.</p>}
            {current.status === 'Rejected' && <p className="error">Not approved: {current.rejectionReason}</p>}
            <p className="muted">Licence {current.licenseNumber} · expires {current.licenseExpiry && shortDate(current.licenseExpiry)}</p>
            <div className="photo-row">
              {current.licensePhotoId && <AuthImage fileId={current.licensePhotoId} alt="Driver's licence" className="doc-photo" />}
              {current.idPhotoId && <AuthImage fileId={current.idPhotoId} alt="Government ID" className="doc-photo" />}
            </div>
            <button className="ghost" onClick={() => setEditing(true)}>
              {current.status === 'Rejected' ? 'Submit again' : 'Update documents'}
            </button>
          </>
        )}

        {showForm && (
          <form className="auth-form" onSubmit={submit}>
            <label>Driver's licence number
              <input required maxLength={30} value={licenseNumber} placeholder="e.g. N01-23-456789"
                onChange={(e) => setLicenseNumber(e.target.value)} />
            </label>
            <label>Licence expiry date
              <input type="date" required min={toDateInput(new Date())} value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)} />
            </label>
            <div className="photo-grid">
              <PhotoPicker label="Licence (front)" fileId={licensePhotoId} onUploaded={setLicensePhotoId} />
              <PhotoPicker label="Government ID" fileId={idPhotoId} onUploaded={setIdPhotoId} />
            </div>
            <p className="hint">Photos are private: only you and DriveMate admins can see them.</p>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={saving || !licensePhotoId || !idPhotoId}>
              {saving ? 'Sending…' : 'Submit for review'}
            </button>
            {editing && <button type="button" className="link" onClick={() => setEditing(false)}>Cancel</button>}
          </form>
        )}
      </section>
    </main>
  );
}
