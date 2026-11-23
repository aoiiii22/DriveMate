import { useEffect, useState } from 'react';

/** Chrome/Edge/Android fire this when the app can be installed. It isn't in TypeScript's types yet. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/*
 * The browser fires "beforeinstallprompt" only once, shortly after the page loads. We listen here, when this file
 * is first loaded, and keep the event, so a card or banner that appears later (after clicking around) can still use it.
 */
let deferred: InstallPromptEvent | null = null;
let appInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  appInstalled = true;
  deferred = null;
  notify();
});

/**
 * "Install DriveMate" support.
 *  - canInstall: the browser offered an install prompt (Chrome, Edge, Android).
 *  - iosHint: iPhones can't prompt; the user must use Share → Add to Home Screen.
 */
export function useInstall() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const installed = appInstalled || isInstalled();
  return {
    installed,
    canInstall: !installed && deferred !== null,
    iosHint: !installed && isIos(),
    install: async () => {
      const event = deferred;
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      deferred = null; // a prompt can only be used once
      notify();
    },
  };
}
