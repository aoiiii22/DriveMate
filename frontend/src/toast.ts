import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

/** Shows a short message at the bottom of the screen that disappears by itself (a "toast"). */
export const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export const useToast = () => useContext(ToastContext);
