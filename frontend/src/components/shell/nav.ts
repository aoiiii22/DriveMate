import type { User } from '@/types';

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
