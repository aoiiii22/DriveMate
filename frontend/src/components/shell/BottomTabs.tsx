import { NavLink } from 'react-router';
import { motion } from 'motion/react';
import { Bell, Briefcase, CircleUser, LayoutDashboard, Search, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/auth';
import { cn } from '@/lib/utils';
import { dashboardLink } from './nav';

interface Tab { to: string; label: string; icon: LucideIcon }

/** Phone-only tab bar, like the Airbnb/Turo apps. The purple pill slides to the active tab (Motion "layoutId"). */
export function BottomTabs() {
  const { user } = useAuth();
  const dash = user ? dashboardLink(user) : null;
  const tabs: Tab[] = user
    ? [
        { to: '/search', label: 'Explore', icon: Search },
        { to: '/trips', label: 'Trips', icon: Briefcase },
        ...(dash ? [{ to: dash.to, label: user.role === 'Admin' || user.role === 'SuperAdmin' ? 'Admin' : 'Dashboard', icon: LayoutDashboard }] : []),
        { to: '/alerts', label: 'Alerts', icon: Bell },
        { to: '/account', label: 'Account', icon: CircleUser },
      ]
    : [
        { to: '/search', label: 'Explore', icon: Search },
        { to: '/login', label: 'Log in', icon: CircleUser },
      ];

  return (
    <nav
      aria-label="Main"
      className="tw fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink to={t.to} className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium">
              {({ isActive }) => (
                <>
                  <span className="relative grid h-7 w-14 place-items-center">
                    {isActive && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <t.icon className={cn('relative size-5 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                  </span>
                  <span className={cn('transition-colors', isActive ? 'font-semibold text-primary' : 'text-muted-foreground')}>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
