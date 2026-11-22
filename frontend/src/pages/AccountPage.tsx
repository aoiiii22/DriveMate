import { Link } from 'react-router';
import { useAuth } from '../auth';
import { InstallCard } from '../components/InstallCard';
import { Briefcase, ChevronRight, Handshake, Heart, IdCard, LayoutDashboard, type LucideIcon, ShieldCheck, Wrench } from 'lucide-react';

/** "Account" tab: who you are and every place you can go. Mostly for phones, where the top menu is hidden. */
export function AccountPage({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const links: { to: string; icon: LucideIcon; label: string; hint: string }[] = [
    { to: '/trips', icon: Briefcase, label: 'My trips', hint: 'Bookings, payments, trip photos' },
    { to: '/search?favorites=true', icon: Heart, label: 'Favorites', hint: 'Cars you saved' },
  ];
  if (user.role === 'Customer') {
    links.push({ to: '/verify', icon: IdCard, label: 'Verify ID', hint: 'Needed for self-drive' });
    links.push({ to: '/partner', icon: Handshake, label: 'Become a partner', hint: 'List your car or drive for us' });
  }
  if (user.role === 'Owner') links.unshift({ to: '/owner', icon: LayoutDashboard, label: 'Owner dashboard', hint: 'Cars, calendar, earnings' });
  if (user.role === 'Driver') links.unshift({ to: '/driver', icon: LayoutDashboard, label: 'Driver dashboard', hint: 'Trips and earnings' });
  if (user.role === 'Admin' || user.role === 'SuperAdmin') links.unshift({ to: '/admin', icon: Wrench, label: 'Admin', hint: 'Verifications, partners, promos' });
  if (user.role === 'SuperAdmin') links.unshift({ to: '/superadmin', icon: ShieldCheck, label: 'Super admin', hint: 'All accounts, roles, activity log' });

  return (
    <main className="page narrow">
      <section className="card account-head">
        <span className="avatar" aria-hidden="true">{user.fullName.charAt(0)}</span>
        <div>
          <h1 className="page-title">{user.fullName}</h1>
          <p className="muted">{user.email} · {user.role}</p>
        </div>
      </section>
      <InstallCard />
      <nav className="menu-list card" aria-label="Account">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            <l.icon className="menu-icon" aria-hidden="true" />
            <span><strong>{l.label}</strong><br /><span className="muted small-text">{l.hint}</span></span>
            <ChevronRight className="ico muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <button className="ghost" onClick={onLogout}>Log out</button>
    </main>
  );
}
