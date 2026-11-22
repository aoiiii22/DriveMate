import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type ToastKind } from './toast';
import { CircleCheck, TriangleAlert } from 'lucide-react';

interface Toast { id: number; message: string; kind: ToastKind }

let nextId = 1;

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
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            {t.kind === 'success' ? <CircleCheck className="ico" aria-hidden="true" /> : t.kind === 'error' ? <TriangleAlert className="ico" aria-hidden="true" /> : null}<span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
