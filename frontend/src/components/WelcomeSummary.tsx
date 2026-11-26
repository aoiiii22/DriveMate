import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  CalendarClock, Car, ChevronRight, ClipboardCheck, CreditCard, Handshake, Inbox, ShieldCheck, TicketPercent, Trophy, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { peso, shortDate } from '../format';
import { cn } from '@/lib/utils';
import type {
  AdminVerification, Booking, DriverTrip, Earnings, OwnerBooking, OwnerVehicle, PartnerApplication, Promo,
} from '../types';

/** One big summary card. "to" makes the whole card a one-tap shortcut. */
export interface Stat {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  to?: string;
  /** "attention" = something waiting for you (amber); otherwise the normal purple. */
  tone?: 'normal' | 'attention';
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * Friendly top of every dashboard: "Good morning, Maria" + a short line + 3-4 summary cards.
 * stats = null while loading (shows grey placeholder cards of the same size, so nothing jumps).
 */
export function WelcomeSummary({ subtitle, stats }: { subtitle: string; stats: Stat[] | null }) {
  const { user } = useAuth();
  // "Maria Santos" → "Maria". Built-in accounts like "DriveMate Admin" get no name ("Good evening 👋").
  const first = user?.fullName.trim().split(/\s+/)[0] ?? '';
  const name = first && first.toLowerCase() !== 'drivemate' ? `, ${first}` : '';

  return (
    <section className="tw mb-6" aria-label="Summary">
      <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{greeting()}{name} 👋</h1>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats === null
          ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[112px] animate-pulse rounded-2xl bg-muted" />)
          : stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StatCard stat={s} />
              </motion.div>
            ))}
      </div>
    </section>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const attention = stat.tone === 'attention';
  const body = (
    <>
      <span className="flex items-center justify-between">
        <span className={cn('grid size-9 place-items-center rounded-xl', attention ? 'bg-amber-100 text-amber-700' : 'bg-accent text-primary')}>
          <stat.icon className="size-5" aria-hidden="true" />
        </span>
        {stat.to && <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />}
      </span>
      <span className="mt-3 block text-[13px] text-muted-foreground">{stat.label}</span>
      <span className={cn('block truncate text-xl font-bold', attention && 'text-amber-700')}>{stat.value}</span>
      {stat.hint && <span className="block truncate text-xs text-muted-foreground">{stat.hint}</span>}
    </>
  );
  const box = cn('block h-full rounded-2xl border bg-card p-4 text-foreground no-underline shadow-sm transition',
    attention && 'border-amber-300 bg-amber-50', stat.to && 'hover:-translate-y-0.5 hover:shadow-md');
  return stat.to ? <Link to={stat.to} className={box}>{body}</Link> : <div className={box}>{body}</div>;
}

/**
 * Loads data once when the dashboard opens; null while loading. On an error the cards are simply
 * left out (the dashboard below shows its own error), so the page never breaks.
 */
function useLoad<T>(load: () => Promise<T>): T | null | 'error' {
  const [request] = useState(load); // useState runs "load" only on the first render: one request per visit
  const [data, setData] = useState<T | null | 'error'>(null);
  useEffect(() => {
    let cancelled = false;
    request.then((d) => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData('error'); });
    return () => { cancelled = true; };
  }, [request]);
  return data;
}

const upcoming = (start: string) => new Date(start).getTime() > Date.now();
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ------------------------------- Customer (My trips) -------------------------------

export function CustomerSummary() {
  const data = useLoad(() => api.get<Booking[]>('/bookings/mine'));
  let stats: Stat[] | null = null;
  if (data === 'error') stats = [];
  else if (data) {
    const next = data
      .filter((b) => (b.status === 'Confirmed' || b.status === 'Pending') && upcoming(b.startDate))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const toPay = data.filter((b) => b.canPay);
    stats = [
      { label: 'Next trip', value: next[0] ? shortDate(next[0].startDate) : 'None yet', hint: next[0]?.vehicleName ?? 'Find a car to get started', icon: CalendarClock, to: next[0] ? undefined : '/search' },
      { label: 'Upcoming trips', value: String(next.length), icon: Car },
      { label: 'Waiting for payment', value: String(toPay.length), hint: toPay.length ? 'Tap a trip below to pay' : 'All paid', icon: CreditCard, tone: toPay.length ? 'attention' : 'normal' },
      { label: 'Trips completed', value: String(data.filter((b) => b.status === 'Completed').length), icon: Trophy },
    ];
  }
  return <WelcomeSummary subtitle="Here are your trips at a glance." stats={stats} />;
}

// ------------------------------- Owner -------------------------------

export function OwnerSummary() {
  const data = useLoad(() => Promise.all([
    api.get<OwnerBooking[]>('/owner/bookings'),
    api.get<OwnerVehicle[]>('/owner/vehicles'),
    api.get<Earnings>('/owner/earnings'),
  ]));
  let stats: Stat[] | null = null;
  if (data === 'error') stats = [];
  else if (data) {
    const [bookings, cars, earnings] = data;
    const requests = bookings.filter((b) => b.status === 'Pending').length;
    const onTrip = bookings.filter((b) => b.status === 'Ongoing').length;
    stats = [
      { label: 'New requests', value: String(requests), hint: requests ? 'Waiting for your answer' : 'All caught up', icon: Inbox, to: '/owner', tone: requests ? 'attention' : 'normal' },
      { label: 'On a trip now', value: String(onTrip), icon: Car, to: '/owner' },
      { label: 'Earned this month', value: peso(earnings.thisMonth), hint: `${peso(earnings.upcoming)} coming`, icon: Wallet, to: '/owner?tab=earnings' },
      { label: 'My cars', value: count(cars.length, 'car'), hint: `${cars.filter((c) => c.isAvailable).length} available`, icon: ClipboardCheck, to: '/owner?tab=cars' },
    ];
  }
  return <WelcomeSummary subtitle="Here's how your cars are doing." stats={stats} />;
}

// ------------------------------- Driver -------------------------------

export function DriverSummary() {
  const data = useLoad(() => Promise.all([api.get<DriverTrip[]>('/driver/trips'), api.get<Earnings>('/driver/earnings')]));
  let stats: Stat[] | null = null;
  if (data === 'error') stats = [];
  else if (data) {
    const [trips, earnings] = data;
    const requests = trips.filter((t) => t.canRespond).length;
    const next = trips
      .filter((t) => t.accepted && (t.status === 'Confirmed' || t.status === 'Pending') && upcoming(t.startDate))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    stats = [
      { label: 'Job requests', value: String(requests), hint: requests ? 'Accept or decline below' : 'No new requests', icon: Inbox, to: '/driver', tone: requests ? 'attention' : 'normal' },
      { label: 'Next job', value: next ? shortDate(next.startDate) : 'None yet', hint: next?.pickupLocation, icon: CalendarClock, to: '/driver' },
      { label: 'Earned this month', value: peso(earnings.thisMonth), hint: `${peso(earnings.upcoming)} coming`, icon: Wallet, to: '/driver?tab=earnings' },
      { label: 'Trips completed', value: String(earnings.completedTrips), icon: Trophy },
    ];
  }
  return <WelcomeSummary subtitle="Here's your driving work at a glance." stats={stats} />;
}

// ------------------------------- Admin -------------------------------

export function AdminSummary() {
  const data = useLoad(() => Promise.all([
    api.get<AdminVerification[]>('/admin/verifications?status=Pending'),
    api.get<PartnerApplication[]>('/admin/partners?status=Pending'),
    api.get<Promo[]>('/admin/promos'),
  ]));
  let stats: Stat[] | null = null;
  if (data === 'error') stats = [];
  else if (data) {
    const [ids, partners, promos] = data;
    stats = [
      { label: 'IDs to review', value: String(ids.length), hint: ids.length ? 'Customers are waiting' : 'All caught up', icon: ShieldCheck, to: '/admin', tone: ids.length ? 'attention' : 'normal' },
      { label: 'Partner applications', value: String(partners.length), hint: partners.length ? 'Owners & drivers to approve' : 'All caught up', icon: Handshake, to: '/admin?tab=partners', tone: partners.length ? 'attention' : 'normal' },
      { label: 'Active promo codes', value: String(promos.filter((p) => p.isActive).length), hint: `${promos.length} in total`, icon: TicketPercent, to: '/admin?tab=promos' },
    ];
  }
  return <WelcomeSummary subtitle="Here's what needs your attention today." stats={stats} />;
}
