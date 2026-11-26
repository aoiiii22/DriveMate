import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '@/auth';
import { cn } from '@/lib/utils';
import { isNavActive, roleNav } from './nav';

/**
 * Phone-only tab bar, like the Airbnb/Turo apps. The tabs depend on the role (see roleNav):
 * customers get Explore/Trips, owners Bookings/My cars/Earnings, drivers Jobs/Earnings, admins their queues.
 * The purple pill slides to the active tab (Motion "layoutId").
 */
export function BottomTabs() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const tabs = roleNav(user);

  return (
    <nav
      aria-label="Main"
      className="tw fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-stretch">
        {tabs.map((t) => {
          const isActive = isNavActive(t.to, pathname, search);
          return (
            <li key={t.to} className="flex-1">
              <Link to={t.to} aria-current={isActive ? 'page' : undefined} className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium">
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
