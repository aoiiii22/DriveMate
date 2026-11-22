import { Star } from 'lucide-react';
/** Five tappable stars. Uses radio buttons underneath, so keyboards and screen readers work too. */
export function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (stars: number) => void }) {
  return (
    <fieldset className="stars">
      <legend>{label}</legend>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className={n <= value ? 'on' : ''}>
          <input type="radio" name={label} value={n} checked={value === n} onChange={() => onChange(n)} className="visually-hidden" />
          <Star className="ico" aria-hidden="true" fill="currentColor" />
          <span className="visually-hidden">{n} star{n > 1 ? 's' : ''}</span>
        </label>
      ))}
    </fieldset>
  );
}
