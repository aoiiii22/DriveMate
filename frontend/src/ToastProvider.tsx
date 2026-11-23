import { useCallback, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { ToastContext, type ToastKind } from './toast';
import { cn } from './lib/utils';

interface Toast { id: number; message: string; kind: ToastKind }

let nextId = 1;

/** Small pop-up messages ("Booking confirmed!"). They slide up, stack, and fade away after 4 seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++;
    setToasts((list) => [...list, { id, message, kind }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: screen readers announce new toasts without moving focus */}
      <div aria-live="polite" className="tw pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = t.kind === 'success' ? CircleCheck : t.kind === 'error' ? TriangleAlert : Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-xl"
              >
                <Icon className={cn('size-5 shrink-0', t.kind === 'success' && 'text-emerald-400', t.kind === 'error' && 'text-rose-400')} aria-hidden="true" />
                <span>{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
