import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, queryString } from '../api';
import { useAuth } from '../auth';
import { AdminSummary } from '../components/WelcomeSummary';
import { peso, shortDate, shortDateTime } from '../format';
import { useToast } from '../toast';
import type { AuditEntry, AuthResponse, UserDetail, UserListItem } from '../types';
import { Eye, KeyRound, Lock, LockOpen, ScrollText, Star, Users } from 'lucide-react';

type Tab = 'users' | 'activity';

/** Super admin: every account (roles, locks, passwords, "view as") and the activity log. */
export function SuperAdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  return (
    <main className="page">
      {/* The cards already link to the admin tools, as does "Admin" in the header. */}
      <AdminSummary />
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'users'} className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users className="ico" aria-hidden="true" /> Users</button>
        <button role="tab" aria-selected={tab === 'activity'} className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><ScrollText className="ico" aria-hidden="true" /> Activity log</button>
      </div>
      {tab === 'users' ? <UsersTab /> : <ActivityTab />}
    </main>
  );
}

// ------------------------------- Users -------------------------------

function UsersTab() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [users, setUsers] = useState<UserListItem[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<UserListItem[]>(`/superadmin/users${queryString({ search, role })}`)
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  }, [search, role]);

  // Wait 300 ms after typing stops before searching (a "debounce"), so we don't call the API on every key.
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="admin-split">
      <section>
        <div className="filters">
          <input type="search" aria-label="Search users" placeholder="Search name, email or phone" value={search}
            onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option>Customer</option><option>Owner</option><option>Driver</option><option>Admin</option><option>SuperAdmin</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        {users?.length === 0 && <p className="card empty">No accounts match.</p>}
        <div className="menu-list card user-list">
          {users?.map((u) => (
            <button key={u.id} className={`user-row ${selected === u.id ? 'selected' : ''}`} onClick={() => setSelected(u.id)}>
              <span className="avatar small" aria-hidden="true">{u.fullName.charAt(0)}</span>
              <span className="user-row-main">
                <strong>{u.fullName}</strong> {u.isLocked && <span className="status status-cancelled">Locked</span>}
                <br /><span className="muted small-text">{u.email}</span>
              </span>
              <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
            </button>
          ))}
        </div>
        {users && users.length >= 200 && <p className="hint">Showing the first 200. Search to narrow it down.</p>}
      </section>

      <section>
        {selected
          ? <UserPanel key={selected} userId={selected} onChanged={load} />
          : <p className="card empty">Pick an account to see its details and actions.</p>}
      </section>
    </div>
  );
}

function UserPanel({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { startViewAs } = useAuth();
  const [u, setU] = useState<UserDetail | null>(null);
  const [role, setRole] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<UserDetail>(`/superadmin/users/${userId}`)
      .then((d) => { setU(d); setRole(d.role); })
      .catch((e: Error) => setError(e.message));
  }, [userId]);
  useEffect(load, [load]);

  /** Runs an action, shows a toast, then reloads the panel and the list. */
  async function act(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await work();
      toast(done);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !u) return <p className="error">{error}</p>;
  if (!u) return <p className="muted">Loading…</p>;

  const changeRole = () => {
    const warn = u.role === 'Owner' && role !== 'Owner' && u.vehicles.length > 0
      ? `\n\nTheir ${u.vehicles.length} car(s) will be hidden from search.` : '';
    if (!confirm(`Change ${u.fullName} from ${u.role} to ${role}?${warn}`)) return;
    act(() => api.put(`/superadmin/users/${u.id}/role`, { role }), `${u.fullName} is now ${role}`);
  };
  const lock = () => {
    const reason = prompt(`Why are you locking ${u.fullName}? (saved in the activity log)`);
    if (!reason?.trim()) return;
    act(() => api.post(`/superadmin/users/${u.id}/lock`, { reason }), `${u.fullName} is locked and logged out`);
  };
  const unlock = () => act(() => api.post(`/superadmin/users/${u.id}/unlock`), `${u.fullName} is unlocked`);
  const resetPassword = () => {
    if (!confirm(`Give ${u.fullName} a new temporary password? Their current password stops working.`)) return;
    act(async () => setTempPassword((await api.post<{ temporaryPassword: string }>(`/superadmin/users/${u.id}/reset-password`)).temporaryPassword),
      'Temporary password created');
  };
  const viewAs = async () => {
    if (!confirm(`View DriveMate as ${u.fullName}? You'll see and can act as them for up to 1 hour. This is recorded.`)) return;
    setBusy(true);
    try {
      startViewAs(await api.post<AuthResponse>(`/superadmin/users/${u.id}/view-as`));
      toast(`Now viewing as ${u.fullName}`, 'info');
      navigate(u.role === 'Owner' ? '/owner' : u.role === 'Driver' ? '/driver' : u.role === 'Admin' ? '/admin' : '/trips');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="card user-panel">
      <div className="account-head">
        <span className="avatar" aria-hidden="true">{u.fullName.charAt(0)}</span>
        <div>
          <h2 className="page-title">{u.fullName}</h2>
          <p className="muted">{u.email} · {u.phoneNumber ?? 'no phone'}</p>
          <p className="small-text">
            <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
            {u.isLocked && <span className="status status-cancelled"> Locked</span>}
            <span className="muted"> · joined {shortDate(u.createdAt)} · ID {u.verification ?? 'not verified'}</span>
          </p>
        </div>
      </div>

      {!u.canManage && <p className="notice">This is a super admin account (or your own), so it can't be changed here.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {tempPassword && (
        <div className="notice">
          <strong>Temporary password:</strong> <code className="temp-pass">{tempPassword}</code>{' '}
          <button className="link" onClick={() => navigator.clipboard.writeText(tempPassword).then(() => toast('Copied'))}>Copy</button>
          <p className="small-text">Give this to {u.fullName} privately. It's shown only once and isn't stored in the log.</p>
        </div>
      )}

      {u.canManage && (
        <div className="admin-actions">
          <div className="promo">
            <label>Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Customer</option><option>Owner</option><option>Driver</option><option>Admin</option>
              </select>
            </label>
            <button className="ghost small" disabled={busy || role === u.role} onClick={changeRole}>Change role</button>
          </div>
          <div className="actions">
            <button className="primary small" disabled={busy || u.isLocked} onClick={viewAs}><Eye className="ico" aria-hidden="true" /> View as user</button>
            <button className="ghost small" disabled={busy} onClick={resetPassword}><KeyRound className="ico" aria-hidden="true" /> Reset password</button>
            {u.isLocked
              ? <button className="ghost small" disabled={busy} onClick={unlock}><LockOpen className="ico" aria-hidden="true" /> Unlock</button>
              : <button className="ghost small danger" disabled={busy} onClick={lock}><Lock className="ico" aria-hidden="true" /> Lock account</button>}
          </div>
        </div>
      )}

      {u.driver && (
        <>
          <h3 className="sub">Driver profile</h3>
          <p className="small-text">Licence {u.driver.licenseNumber || '—'} · <Star className="ico" aria-hidden="true" /> {u.driver.rating ? u.driver.rating.toFixed(1) : 'New'} · {peso(u.driver.pricePerDay)}/day · {u.driver.isAvailable ? 'accepting trips' : 'offline'}</p>
        </>
      )}

      {u.vehicles.length > 0 && (
        <>
          <h3 className="sub">Cars ({u.vehicles.length})</h3>
          <ul className="plain-list">
            {u.vehicles.map((v) => <li key={v.id}><Link to={`/cars/${v.id}`}>{v.name}</Link> · {v.plateNumber}{!v.isAvailable && <span className="muted"> (hidden)</span>}</li>)}
          </ul>
        </>
      )}

      <h3 className="sub">Bookings as a customer ({u.bookings.length})</h3>
      {u.bookings.length === 0 ? <p className="muted small-text">None.</p> : (
        <table className="table">
          <thead><tr><th>#</th><th>Car</th><th>Dates</th><th>Status</th><th className="num">Total</th></tr></thead>
          <tbody>
            {u.bookings.map((b) => (
              <tr key={b.id}><td>{b.id}</td><td>{b.vehicleName}</td><td className="small-text">{shortDate(b.startDate)} – {shortDate(b.endDate)}</td>
                <td><span className={`status status-${b.status.toLowerCase()}`}>{b.status}</span></td><td className="num">{peso(b.totalPrice)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      {u.applications.length > 0 && (
        <>
          <h3 className="sub">Partner applications</h3>
          <ul className="plain-list">
            {u.applications.map((a) => <li key={a.id}>{a.type} · {a.status} · {shortDate(a.createdAt)}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

// ------------------------------- Activity -------------------------------

const actionLabels: Record<string, string> = {
  RoleChanged: 'Role changed',
  UserLocked: 'Locked',
  UserUnlocked: 'Unlocked',
  PasswordReset: 'Password reset',
  ViewAsStarted: 'Viewed as user',
  VerificationApproved: 'ID approved',
  VerificationRejected: 'ID rejected',
  PartnerApproved: 'Partner approved',
  PartnerRejected: 'Partner rejected',
  PromoCreated: 'Promo created',
  PromoUpdated: 'Promo updated',
};

function ActivityTab() {
  const [action, setAction] = useState('');
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AuditEntry[]>(`/superadmin/audit${queryString({ action })}`).then(setEntries).catch((e: Error) => setError(e.message));
  }, [action]);

  return (
    <>
      <div className="filters">
        <select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {Object.entries(actionLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {entries?.length === 0 && <p className="card empty">Nothing recorded yet.</p>}
      {entries && entries.length > 0 && (
        <section className="card table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Account</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="small-text">{shortDateTime(e.createdAt)}</td>
                  <td>{e.actorName}</td>
                  <td>{actionLabels[e.action] ?? e.action}</td>
                  <td>{e.targetName ?? '—'}</td>
                  <td className="small-text">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
