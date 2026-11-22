import { useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import './App.css';
import './polish.css'; // keep after App.css: it overrides earlier rules
import { useAuth } from './auth';
import { NotificationBell } from './components/NotificationBell';
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
import { PartnerPage } from './pages/PartnerPage';
import { PaymentPage } from './pages/PaymentPage';
import { SearchPage } from './pages/SearchPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { VehiclePage } from './pages/VehiclePage';
import { VerifyPage } from './pages/VerifyPage';
import { emptyDraft, type BookingDraft, type InspectionStage, type InspectionTarget, type User } from './types';
import { Bell, Briefcase, CircleUser, Eye, LayoutDashboard, Search } from 'lucide-react';
import { Logo } from './components/Logo';

/**
 * The app shell: top bar, the page for the current URL, and (on phones) a bottom tab bar.
 * Each <Route> maps a URL to a page, e.g. /cars/4 → VehiclePage for car 4.
 */
function App() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  // Half-filled booking forms, one per car, so going to the login page and back keeps them.
  const [drafts, setDrafts] = useState<Record<number, BookingDraft>>({});

  /** Opens the check-in screen; the booking info travels in the navigation "state". */
  const openInspection = (target: InspectionTarget, stage: InspectionStage) =>
    navigate(`/inspect/${target.id}/${stage}`, { state: { target } });

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ViewAsBanner />
      <header className="topbar">
        <Link className="brand" to="/"><Logo />Drive<span>Mate</span></Link>
        <nav aria-label="Main">
          <NavLink to="/search" className="nav-link desktop-only">Find a ride</NavLink>
          {user && <NavLink to="/trips" className="nav-link desktop-only">My trips</NavLink>}
          {user && dashboardLink(user) && <NavLink to={dashboardLink(user)!.to} className="nav-link desktop-only">{dashboardLink(user)!.label}</NavLink>}
          {user?.role === 'Customer' && <NavLink to="/partner" className="nav-link desktop-only">Become a partner</NavLink>}
          {user && <NotificationBell onOpen={(page) => navigate(pageToPath(page))} />}
          {!loading && !user && (
            <>
              <Link to="/login" className="nav-link">Log in</Link>
              <Link to="/register" className="nav-link pill">Sign up</Link>
            </>
          )}
          {user && <NavLink to="/account" className="nav-link desktop-only"><CircleUser className="ico" aria-hidden="true" /> {user.fullName.split(' ')[0]}</NavLink>}
        </nav>
      </header>

      <div id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cars/:id" element={<CarRoute drafts={drafts} setDrafts={setDrafts} />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />

          <Route path="/trips" element={<RequireAuth><BookingsPage onInspect={openInspection} /></RequireAuth>} />
          <Route path="/pay/:id" element={<RequireAuth><PaymentPage /></RequireAuth>} />
          <Route path="/inspect/:id/:stage" element={<RequireAuth><InspectionRoute /></RequireAuth>} />
          <Route path="/verify" element={<RequireAuth><VerifyPage /></RequireAuth>} />
          <Route path="/partner" element={<RequireAuth><PartnerPage /></RequireAuth>} />
          <Route path="/alerts" element={<RequireAuth><AlertsPage /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><AccountPage onLogout={() => { logout(); navigate('/'); }} /></RequireAuth>} />
          <Route path="/owner" element={<RequireAuth role="Owner"><OwnerPage onInspect={openInspection} /></RequireAuth>} />
          <Route path="/driver" element={<RequireAuth role="Driver"><DriverPage onInspect={openInspection} /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth role={['Admin', 'SuperAdmin']}><AdminPage /></RequireAuth>} />
          <Route path="/superadmin" element={<RequireAuth role="SuperAdmin"><SuperAdminPage /></RequireAuth>} />
          <Route path="/credits" element={<CreditsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <footer className="footer">DriveMate · Your Ride, Your Choice. · <Link to="/credits">Photo credits</Link></footer>
      <BottomTabs user={user} />
    </>
  );
}

/** The owner/driver/admin dashboard for this user, if any. */
function dashboardLink(user: User): { to: string; label: string } | null {
  switch (user.role) {
    case 'Owner': return { to: '/owner', label: 'Owner dashboard' };
    case 'Driver': return { to: '/driver', label: 'Driver dashboard' };
    case 'Admin': return { to: '/admin', label: 'Admin' };
    case 'SuperAdmin': return { to: '/superadmin', label: 'Super admin' };
    default: return null;
  }
}

/** Turns a notification's "page" (sent by the server) into a URL. */
function pageToPath(page: string): string {
  return ['owner', 'driver', 'verify', 'partner', 'admin'].includes(page) ? `/${page}` : '/trips';
}

/** Phone-only tab bar, like real apps. Hidden on wide screens by CSS. */
function BottomTabs({ user }: { user: User | null }) {
  const dash = user ? dashboardLink(user) : null;
  return (
    <nav className="bottom-tabs" aria-label="Main">
      <NavLink to="/search"><Search className="ico" aria-hidden="true" />Explore</NavLink>
      {user ? (
        <>
          <NavLink to="/trips"><Briefcase className="ico" aria-hidden="true" />Trips</NavLink>
          {dash && <NavLink to={dash.to}><LayoutDashboard className="ico" aria-hidden="true" />{user.role === 'Admin' || user.role === 'SuperAdmin' ? 'Admin' : 'Dashboard'}</NavLink>}
          <NavLink to="/alerts"><Bell className="ico" aria-hidden="true" />Alerts</NavLink>
          <NavLink to="/account"><CircleUser className="ico" aria-hidden="true" />Account</NavLink>
        </>
      ) : (
        <NavLink to="/login"><CircleUser className="ico" aria-hidden="true" />Log in</NavLink>
      )}
    </nav>
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

/** Always visible while a super admin is viewing the app as someone else. */
function ViewAsBanner() {
  const { user, stopViewAs } = useAuth();
  const navigate = useNavigate();
  if (!user?.impersonatedBy) return null;
  return (
    <div className="view-as-banner" role="status">
      <span><Eye className="ico" aria-hidden="true" /> You are viewing DriveMate as <strong>{user.fullName}</strong> ({user.role}). Everything you do happens on their account.</span>
      <button className="ghost small" onClick={async () => { await stopViewAs(); navigate('/superadmin'); }}>
        Return to super admin
      </button>
    </div>
  );
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
