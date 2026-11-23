import { useState } from 'react';
import { Share } from 'lucide-react';
import { useInstall } from '../install';

/** Full-width "Get the app" banner. Hidden once DriveMate is installed. */
export function InstallBanner() {
  const { installed, canInstall, iosHint, install } = useInstall();
  const [showHelp, setShowHelp] = useState(false);
  if (installed) return null;

  return (
    <section className="install-banner" aria-label="Get the DriveMate app">
      <h2>Get the DriveMate app. It’s free!</h2>
      <p className="banner-sub">Apply and track your registration right from your phone. Install it in one tap from your browser, no app store needed.</p>
      <p className="banner-small">Works on Android, iPhone and desktop.</p>
      {iosHint ? (
        <p className="banner-help">On iPhone: tap <Share className="ico" aria-label="Share" /> in Safari, then <strong>Add to Home Screen</strong>.</p>
      ) : (
        <>
          <button type="button" className="banner-btn" onClick={() => (canInstall ? void install() : setShowHelp(true))}>Download Now</button>
          {showHelp && !canInstall && (
            <p className="banner-help" role="status">Open your browser menu and choose <strong>Install app</strong> (Chrome, Edge) or <strong>Add to Home Screen</strong>.</p>
          )}
        </>
      )}
    </section>
  );
}
