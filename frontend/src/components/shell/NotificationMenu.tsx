import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, BellOff } from 'lucide-react';
import { api } from '@/api';
import { shortDateTime } from '@/format';
import type { AppNotification } from '@/types';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

/** The bell in the top bar: unread badge (pops when it changes) and a dropdown of recent notifications. */
export function NotificationMenu({ onOpen }: { onOpen: (page: string) => void }) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const refreshCount = useCallback(() => {
    api.get<number>('/notifications/unread-count').then(setUnread).catch(() => {});
  }, []);

  // Check for new notifications every 30 seconds (and once straight away).
  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, 30_000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  function onOpenChange(open: boolean) {
    if (open) api.get<AppNotification[]>('/notifications').then(setItems).catch(() => setItems([]));
  }

  async function choose(n: AppNotification) {
    if (!n.isRead) await api.post(`/notifications/${n.id}/read`).catch(() => {});
    refreshCount();
    onOpen(n.page);
  }

  async function readAll() {
    await api.post('/notifications/read-all');
    setItems((list) => list?.map((n) => ({ ...n, isRead: true })) ?? null);
    setUnread(0);
  }

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-muted data-[state=open]:bg-muted"
        aria-label={`Notifications, ${unread} unread`}
      >
        <Bell className="size-5" aria-hidden="true" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={unread}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="absolute top-1 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-brand-pink-foreground ring-2 ring-background"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="w-[min(380px,calc(100vw-24px))] rounded-xl p-0 shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          {unread > 0 && (
            <button type="button" onClick={readAll} className="text-sm font-semibold text-primary hover:underline">Mark all read</button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-1.5">
          {items === null && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {items?.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <BellOff className="size-6" aria-hidden="true" />Nothing yet.
            </div>
          )}
          {items?.map((n) => (
            <DropdownMenuItem key={n.id} onSelect={() => choose(n)} className="cursor-pointer flex-col items-start gap-0.5 rounded-lg px-3 py-2.5">
              <span className="flex w-full items-center gap-2">
                <span className={cn('size-2 shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-primary')} aria-hidden="true" />
                <span className={cn('text-sm', !n.isRead && 'font-semibold')}>{n.title}</span>
              </span>
              <span className="pl-4 text-sm text-muted-foreground">{n.body}</span>
              <span className="pl-4 text-xs text-muted-foreground">{shortDateTime(n.createdAt)}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
