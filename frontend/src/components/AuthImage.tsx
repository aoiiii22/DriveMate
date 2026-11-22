import { useEffect, useState } from 'react';
import { api } from '../api';

interface Props {
  fileId: string;
  alt: string;
  className?: string;
}

/** Shows a private uploaded photo (licence, ID, trip photo) that needs the login token. */
export function AuthImage({ fileId, alt, className }: Props) {
  // Remember which file the URL belongs to, so a changed fileId shows "Loading" again.
  const [loaded, setLoaded] = useState<{ fileId: string; url: string | null } | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    api.imageUrl(fileId)
      .then((u) => {
        url = u;
        if (cancelled) URL.revokeObjectURL(u);
        else setLoaded({ fileId, url: u });
      })
      .catch(() => { if (!cancelled) setLoaded({ fileId, url: null }); });
    // Cleanup: free the temporary blob URL when the image leaves the screen.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileId]);

  if (loaded?.fileId !== fileId) return <div className={`photo-placeholder ${className ?? ''}`}>Loading…</div>;
  if (!loaded.url) return <div className={`photo-placeholder ${className ?? ''}`}>Photo unavailable</div>;
  return <img src={loaded.url} alt={alt} className={className} />;
}
