import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { shortDateTime } from '../format';
import type { AppNotification } from '../types';
import { Bell } from 'lucide-react';

/** The bell in the top bar: unread count, and a dropdown of recent notifications. */
export function NotificationBell({ onOpen }: { onOpen: (page: string) => void }) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  const refreshCount = useCallback(() => {
    api.get<number>('/notifications/unread-count').then(setUnread).catch(() => {});
  }, []);

  // Check for new notifications every 30 seconds (and once straight away).
  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 30_000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  async function toggle() {
    if (!open) setItems(await api.get<AppNotification[]>('/notifications'));
    setOpen(!open);
  }

  async function choose(n: AppNotification) {
    if (!n.isRead) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    setOpen(false);
    refreshCount();
    onOpen(n.page);
  }

  async function readAll() {
    await api.post('/notifications/read-all');
    setItems(items.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  return (
    <div className="bell">
      <button onClick={toggle} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell className="ico" aria-hidden="true" />{unread > 0 && <span className="badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-menu card" role="menu">
          <div className="bell-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link" onClick={readAll}>Mark all read</button>}
          </div>
          {items.length === 0 && <p className="hint center">Nothing yet.</p>}
          {items.map((n) => (
            <button key={n.id} role="menuitem" className={`bell-item ${n.isRead ? '' : 'unread'}`} onClick={() => choose(n)}>
              <strong>{n.title}</strong>
              <span>{n.body}</span>
              <small>{shortDateTime(n.createdAt)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
