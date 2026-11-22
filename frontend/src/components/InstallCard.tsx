import { Download, Share } from 'lucide-react';
import { useInstall } from '../install';

/** "Install DriveMate" card. Shows nothing if the app is already installed or can't be installed here. */
export function InstallCard() {
  const { canInstall, iosHint, install } = useInstall();
  if (!canInstall && !iosHint) return null;

  return (
    <section className="card install-card">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div>
        <strong>Get the DriveMate app</strong>
        {canInstall
          ? <p className="muted small-text">Install it on this device for one-tap access, full-screen, no browser bar.</p>
          : <p className="muted small-text">
              On iPhone: tap <Share className="ico" aria-label="Share" /> in Safari, then <strong>Add to Home Screen</strong>.
            </p>}
      </div>
      {canInstall && <button className="primary small" onClick={install}><Download className="ico" aria-hidden="true" /> Install</button>}
    </section>
  );
}
