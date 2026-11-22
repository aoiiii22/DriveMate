import { useEffect, useState } from 'react';

/** Chrome/Edge/Android fire this when the app can be installed. It isn't in TypeScript's types yet. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * "Install DriveMate" support.
 *  - canInstall: the browser offered an install prompt (Chrome, Edge, Android).
 *  - iosHint: iPhones can't prompt; the user must use Share → Add to Home Screen.
 */
export function useInstall() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isInstalled);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    installed,
    canInstall: !installed && event !== null,
    iosHint: !installed && isIos(),
    install: async () => {
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      setEvent(null); // a prompt can only be used once
    },
  };
}
