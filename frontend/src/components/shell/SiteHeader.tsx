import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Eye, Search } from 'lucide-react';
import { useAuth } from '@/auth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationMenu } from './NotificationMenu';
import { PartnerMenu } from './PartnerMenu';
import { UserMenu } from './UserMenu';
import { homePath, isNavActive, pageToPath, roleNav } from './nav';

/** Pages that already have their own search box, so the compact pill would be a duplicate. */
const noPill = ['/', '/search', '/login', '/register'];

/** Sticky top bar: logo, compact search pill, partner menu, bell and the account menu. Gains a shadow once you scroll. */
export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  // Owners, drivers and admins see their work links instead of the car-search pill.
  const isPartnerOrStaff = Boolean(user && user.role !== 'Customer');
  const workLinks = isPartnerOrStaff ? roleNav(user).filter((n) => n.to !== '/alerts' && n.to !== '/account') : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn('tw sticky top-0 z-40 bg-background/90 backdrop-blur-md transition-shadow duration-300', scrolled ? 'shadow-[0_1px_12px_rgba(11,30,63,0.08)]' : 'shadow-[0_1px_0_var(--border)]')}>
      <ViewAsBanner />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:h-20 md:px-8">
        <Link to={user ? homePath(user) : '/'} className="flex items-center gap-2 text-xl font-extrabold tracking-tight md:text-2xl" aria-label="DriveMate home">
          <Logo size={30} />
          <span>Drive<span className="text-primary">Mate</span></span>
        </Link>

        {isPartnerOrStaff && (
          <div className="hidden items-center gap-1 md:flex">
            {workLinks.map((n) => {
              const active = isNavActive(n.to, pathname, search);
              return (
                <Link key={n.to} to={n.to} aria-current={active ? 'page' : undefined}
                  className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    active ? 'bg-accent text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  <n.icon className="size-4" aria-hidden="true" />{n.label}
                </Link>
              );
            })}
          </div>
        )}

        {!isPartnerOrStaff && !noPill.includes(pathname) && (
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="hidden items-center gap-3 rounded-full border bg-background py-2 pr-2 pl-5 text-sm shadow-sm transition-shadow hover:shadow-md md:flex"
          >
            <span className="font-semibold">Anywhere</span>
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <span className="font-semibold">Any dates</span>
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <span className="text-muted-foreground">Self-drive or driver</span>
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Search className="size-4" aria-hidden="true" /></span>
            <span className="sr-only">Search cars</span>
          </button>
        )}

        <nav aria-label="Main" className="flex items-center gap-1">
          {(!user || user.role === 'Customer') && <span className="hidden md:block"><PartnerMenu /></span>}
          {user && <NotificationMenu onOpen={(page) => navigate(pageToPath(page))} />}
          <span className="hidden md:block"><UserMenu /></span>
          {!user && (
            <Button asChild size="sm" className="rounded-full px-4 md:hidden"><Link to="/register">Sign up</Link></Button>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Always visible while a super admin is viewing the app as someone else. */
function ViewAsBanner() {
  const { user, stopViewAs } = useAuth();
  const navigate = useNavigate();
  if (!user?.impersonatedBy) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-3 bg-amber-400 px-4 py-2 text-center text-sm text-gray-900">
      <span className="flex items-center gap-2">
        <Eye className="size-4" aria-hidden="true" /> You are viewing DriveMate as <strong>{user.fullName}</strong> ({user.role}). Everything you do happens on their account.
      </span>
      <Button size="sm" variant="outline" className="h-8 rounded-full border-gray-900/20 bg-white/70" onClick={async () => { await stopViewAs(); navigate('/superadmin'); }}>
        Return to super admin
      </Button>
    </div>
  );
}
