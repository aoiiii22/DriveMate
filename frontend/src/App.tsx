import { useState, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useAuth } from './auth';
import { BottomTabs } from './components/shell/BottomTabs';
import { SiteFooter } from './components/shell/SiteFooter';
import { SiteHeader } from './components/shell/SiteHeader';
import { TooltipProvider } from './components/ui/tooltip';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { AlertsPage } from './pages/AlertsPage';
import { AuthPage } from './pages/AuthPage';
import { BookingsPage } from './pages/BookingsPage';
import { CreditsPage } from './pages/CreditsPage';
import { DriverPage } from './pages/DriverPage';
import { HomePage } from './pages/HomePage';
import { InspectionPage } from './pages/InspectionPage';
import { OwnerPage } from './pages/OwnerPage';
import { PartnerPage, PartnerRedirect } from './pages/PartnerPage';
import { PaymentPage } from './pages/PaymentPage';
import { SearchPage } from './pages/SearchPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { VehiclePage } from './pages/VehiclePage';
import { VerifyPage } from './pages/VerifyPage';
import { emptyDraft, type BookingDraft, type InspectionStage, type InspectionTarget, type User } from './types';

/** Pages that share one screen get one key, so switching between them keeps their own animation (no fade). */
function transitionKey(pathname: string): string {
  if (pathname === '/login' || pathname === '/register') return 'auth';
  if (pathname.startsWith('/partner')) return 'partner';
  return pathname;
}

/**
 * The app shell: top bar, the page for the current URL (with a soft fade between pages), footer,
 * and (on phones) a bottom tab bar. Each <Route> maps a URL to a page, e.g. /cars/4 → VehiclePage for car 4.
 */
function App() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Half-filled booking forms, one per car, so going to the login page and back keeps them.
  const [drafts, setDrafts] = useState<Record<number, BookingDraft>>({});

  /** Opens the check-in screen; the booking info travels in the navigation "state". */
  const openInspection = (target: InspectionTarget, stage: InspectionStage) =>
    navigate(`/inspect/${target.id}/${stage}`, { state: { target } });

  return (
    // reducedMotion="user": people who turned on "reduce motion" in their device settings get no movement.
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={200}>
        <a href="#main" className="skip-link">Skip to content</a>
        <SiteHeader />

        <div id="main">
          {/* Opacity-only fade: a transform here would break "position: fixed" bars inside pages. */}
          <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
            <motion.div
              key={transitionKey(location.pathname)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/cars/:id" element={<CarRoute drafts={drafts} setDrafts={setDrafts} />} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />

                <Route path="/trips" element={<RequireAuth><BookingsPage onInspect={openInspection} /></RequireAuth>} />
                <Route path="/pay/:id" element={<RequireAuth><PaymentPage /></RequireAuth>} />
                <Route path="/inspect/:id/:stage" element={<RequireAuth><InspectionRoute /></RequireAuth>} />
                <Route path="/verify" element={<RequireAuth><VerifyPage /></RequireAuth>} />
                <Route path="/partner" element={<PartnerRedirect />} />
                <Route path="/partner/:kind" element={<PartnerPage />} />
                <Route path="/alerts" element={<RequireAuth><AlertsPage /></RequireAuth>} />
                <Route path="/account" element={<RequireAuth><AccountPage onLogout={() => { logout(); navigate('/'); }} /></RequireAuth>} />
                <Route path="/owner" element={<RequireAuth role="Owner"><OwnerPage onInspect={openInspection} /></RequireAuth>} />
                <Route path="/driver" element={<RequireAuth role="Driver"><DriverPage onInspect={openInspection} /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth role={['Admin', 'SuperAdmin']}><AdminPage /></RequireAuth>} />
                <Route path="/superadmin" element={<RequireAuth role="SuperAdmin"><SuperAdminPage /></RequireAuth>} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>

        <SiteFooter />
        <BottomTabs />
      </TooltipProvider>
    </MotionConfig>
  );
}

/** Pages that need a login (and maybe one of some roles). Logged-out visitors go to /login and come back after. */
function RequireAuth({ children, role }: { children: ReactNode; role?: User['role'] | User['role'][] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const allowed = role === undefined ? null : Array.isArray(role) ? role : [role];
  if (loading) return <main className="page"><p className="muted">Loading…</p></main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (allowed && !allowed.includes(user.role)) {
    return <main className="page"><p className="card empty">This page is for {allowed.join(' / ').toLowerCase()} accounts.</p></main>;
  }
  return children;
}

function CarRoute({ drafts, setDrafts }: {
  drafts: Record<number, BookingDraft>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<number, BookingDraft>>>;
}) {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  if (!Number.isInteger(id)) return <NotFound />;
  return (
    <VehiclePage
      key={id} // a different car = a fresh page
      vehicleId={id}
      // "With driver" picked on the home page carries over until the customer changes it.
      draft={drafts[id] ?? { ...emptyDraft, withDriver: params.get('driver') === '1' }}
      onDraftChange={(d) => setDrafts((all) => ({ ...all, [id]: d }))}
      onBooked={() => setDrafts((all) => ({ ...all, [id]: emptyDraft }))}
    />
  );
}

/** The check-in screen gets the booking from the page that opened it. After a refresh that's gone, so we go back. */
function InspectionRoute() {
  const { stage } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const target = (location.state as { target?: InspectionTarget } | null)?.target;
  if (!target || (stage !== 'PickUp' && stage !== 'Return')) {
    return <main className="page narrow"><p className="card empty">Open this from your trips or dashboard. <Link to="/trips">Go to My trips</Link></p></main>;
  }
  return <InspectionPage booking={target} stage={stage} onDone={() => navigate(-1)} onCancel={() => navigate(-1)} />;
}

function NotFound() {
  return (
    <main className="page narrow">
      <section className="card empty">
        <h2>Page not found</h2>
        <p>This road doesn't go anywhere. <Link to="/">Back to home</Link></p>
      </section>
    </main>
  );
}

export default App;
