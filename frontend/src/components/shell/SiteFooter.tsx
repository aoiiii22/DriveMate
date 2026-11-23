import { Link } from 'react-router';
import { Logo } from '@/components/Logo';

const columns = [
  { title: 'Ride', links: [['Find a car', '/search'], ['Book a driver', '/search?driver=1'], ['My trips', '/trips']] },
  { title: 'Earn', links: [['List your car', '/partner/owner'], ['Drive for DriveMate', '/partner/drive']] },
  { title: 'Account', links: [['Log in', '/login'], ['Sign up', '/register'], ['Verify your ID', '/verify']] },
] as const;

/** Airbnb-style footer: light grey band, link columns, then a thin legal row. Hidden on phones (bottom tabs instead). */
export function SiteFooter() {
  return (
    <footer className="tw mt-16 hidden border-t bg-muted md:block">
      <div className="mx-auto grid max-w-7xl grid-cols-[1.4fr_repeat(3,1fr)] gap-10 px-8 py-12">
        <div>
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Logo size={28} /><span>Drive<span className="text-primary">Mate</span></span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Your Ride, Your Choice. Rent from trusted local owners, drive yourself or book a driver.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map(([label, to]) => (
                <li key={to}><Link to={to} className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DriveMate</p>
          <Link to="/credits" className="hover:text-foreground hover:underline">Photo credits</Link>
        </div>
      </div>
    </footer>
  );
}
