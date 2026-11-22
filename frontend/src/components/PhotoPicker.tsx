import { useEffect, useId, useState } from 'react';
import { api } from '../api';
import { Camera, Check } from 'lucide-react';

interface Props {
  label: string;
  /** For trip photos: links the upload to the booking so the owner can see it. */
  bookingId?: number;
  fileId: string | null;
  onUploaded: (fileId: string | null) => void;
}

const MAX_SIDE = 1600; // px. Big enough to read a plate or a scratch, small enough to upload fast.

/**
 * Shrinks a phone photo (often 4000px, 5+ MB) to a JPEG of at most 1600px before uploading.
 * Falls back to the original file if the browser can't decode it.
 */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** One photo slot: tap to take/choose a photo, it uploads straight away and shows a preview. */
export function PhotoPicker({ label, bookingId, fileId, onUploaded }: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free the preview's temporary URL when it changes or the slot disappears.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still triggers onChange
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await shrink(file);
      const { id } = await api.upload(blob, 'photo.jpg', bookingId);
      setPreview(URL.createObjectURL(blob));
      onUploaded(id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const done = fileId !== null;

  return (
    <div className={`photo-slot ${done ? 'done' : ''}`}>
      <label htmlFor={inputId}>
        {preview && done ? <img src={preview} alt={label} /> : <Camera className="photo-icon" aria-hidden="true" />}
        <span>{busy ? 'Uploading…' : done ? <><Check className="ico" aria-hidden="true" /> {label}</> : label}</span>
      </label>
      {/* capture="environment" opens the back camera on phones; desktops get a file chooser. */}
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
        onChange={choose} disabled={busy} className="visually-hidden" />
      {error && <p className="error small-text">{error}</p>}
    </div>
  );
}
