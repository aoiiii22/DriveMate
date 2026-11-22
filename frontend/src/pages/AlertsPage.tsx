import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { shortDateTime } from '../format';
import type { AppNotification } from '../types';
import { Bell } from 'lucide-react';

const pathFor = (page: string) => (['owner', 'driver', 'verify', 'partner', 'admin'].includes(page) ? `/${page}` : '/trips');

/** Full-page notifications list (the phone version of the bell dropdown). */
export function AlertsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    api.get<AppNotification[]>('/notifications').then(setItems).catch(() => setItems([]));
  }, []);

  async function open(n: AppNotification) {
    if (!n.isRead) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    navigate(pathFor(n.page));
  }

  async function readAll() {
    await api.post('/notifications/read-all');
    setItems(items?.map((n) => ({ ...n, isRead: true })) ?? null);
  }

  return (
    <main className="page narrow">
      <div className="section-head">
        <h1 className="page-title">Alerts</h1>
        {items?.some((n) => !n.isRead) && <button className="link" onClick={readAll}>Mark all read</button>}
      </div>
      {items === null && <p className="muted">Loading…</p>}
      {items?.length === 0 && <p className="card empty"><Bell className="empty-icon" aria-hidden="true" />No alerts yet. We'll let you know about bookings, payments and messages.</p>}
      <div className="menu-list card">
        {items?.map((n) => (
          <button key={n.id} className={`bell-item ${n.isRead ? '' : 'unread'}`} onClick={() => open(n)}>
            <strong>{n.title}</strong>
            <span>{n.body}</span>
            <small>{shortDateTime(n.createdAt)}</small>
          </button>
        ))}
      </div>
    </main>
  );
}
