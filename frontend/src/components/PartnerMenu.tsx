import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, Car, IdCard } from 'lucide-react';

/** "Be our partner" dropdown in the top bar: pick car owner or driver. Closes on outside click, Escape or navigation. */
export function PartnerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="partner-menu desktop-only" ref={ref}>
      <button type="button" className="nav-link" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        Be our partner <ChevronDown className={`ico chevron${open ? ' up' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="partner-dropdown">
          <Link to="/partner/owner"><Car className="ico" aria-hidden="true" />List your car</Link>
          <Link to="/partner/drive"><IdCard className="ico" aria-hidden="true" />Drive for DriveMate</Link>
        </div>
      )}
    </div>
  );
}
