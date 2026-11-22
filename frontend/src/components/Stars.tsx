import { Star } from 'lucide-react';

/** A read-only star rating, e.g. 4 of 5 filled. Screen readers hear "4 out of 5 stars". */
export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="stars-row" role="img" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className="ico" fill={i < value ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </span>
  );
}
