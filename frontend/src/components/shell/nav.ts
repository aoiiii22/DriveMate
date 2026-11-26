import {
  Bell, Briefcase, Car, CircleUser, ClipboardCheck, Handshake, LayoutDashboard, Search, ShieldCheck, TicketPercent, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { User } from '@/types';

export interface NavItem { to: string; label: string; icon: LucideIcon }

/** Where each role lands after logging in (and when clicking the logo). */
export function homePath(user: User): string {
  return dashboardLink(user)?.to ?? '/';
}

/**
 * The main menu for each role: the phone bottom tabs and the desktop header links.
 * Customers get the renter app; owners, drivers and admins get their work screens.
 */
export function roleNav(user: User | null): NavItem[] {
  const alerts: NavItem = { to: '/alerts', label: 'Alerts', icon: Bell };
  const account: NavItem = { to: '/account', label: 'Account', icon: CircleUser };
  switch (user?.role) {
    case undefined:
      return [{ to: '/search', label: 'Explore', icon: Search }, { to: '/login', label: 'Log in', icon: CircleUser }];
    case 'Owner':
      return [
        { to: '/owner', label: 'Bookings', icon: ClipboardCheck },
        { to: '/owner?tab=cars', label: 'My cars', icon: Car },
        { to: '/owner?tab=earnings', label: 'Earnings', icon: Wallet },
        alerts, account,
      ];
    case 'Driver':
      return [
        { to: '/driver', label: 'Jobs', icon: Briefcase },
        { to: '/driver?tab=earnings', label: 'Earnings', icon: Wallet },
        alerts, account,
      ];
    case 'Admin':
      return [
        { to: '/admin', label: 'Verify', icon: ShieldCheck },
        { to: '/admin?tab=partners', label: 'Partners', icon: Handshake },
        { to: '/admin?tab=promos', label: 'Promos', icon: TicketPercent },
        alerts, account,
      ];
    case 'SuperAdmin':
      return [
        { to: '/superadmin', label: 'Accounts', icon: Users },
        { to: '/admin', label: 'Admin', icon: LayoutDashboard },
        alerts, account,
      ];
    default: // Customer
      return [
        { to: '/search', label: 'Explore', icon: Search },
        { to: '/trips', label: 'Trips', icon: Briefcase },
        alerts, account,
      ];
  }
}

/** Is this menu link the current screen? Compares the path and the ?tab= value (NavLink alone ignores ?tab). */
export function isNavActive(to: string, pathname: string, search: string): boolean {
  const [path, query = ''] = to.split('?');
  if (path !== pathname) return false;
  return (new URLSearchParams(query).get('tab') ?? '') === (new URLSearchParams(search).get('tab') ?? '');
}

/** The owner/driver/admin dashboard for this user, if any. */
export function dashboardLink(user: User): { to: string; label: string } | null {
  switch (user.role) {
    case 'Owner': return { to: '/owner', label: 'Owner dashboard' };
    case 'Driver': return { to: '/driver', label: 'Driver dashboard' };
    case 'Admin': return { to: '/admin', label: 'Admin' };
    case 'SuperAdmin': return { to: '/superadmin', label: 'Super admin' };
    default: return null;
  }
}

/** Turns a notification's "page" (sent by the server) into a URL. */
export function pageToPath(page: string): string {
  return ['owner', 'driver', 'verify', 'partner', 'admin'].includes(page) ? `/${page}` : '/trips';
}

/** Initials for the avatar circle, e.g. "Juan Dela Cruz" → "JC". */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
