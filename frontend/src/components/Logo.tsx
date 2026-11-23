/**
 * DriveMate mark: a location pin with a steering wheel inside. Plain SVG, one solid colour.
 * The viewBox has a little padding around the pin so no edge is ever cut off.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo" width={(size * 30) / 38} height={size} viewBox="0 0 30 38" role="img" aria-label="DriveMate logo">
      <path
        d="M15 1C7.3 1 1 7.1 1 14.6 1 24.6 15 37 15 37S29 24.6 29 14.6C29 7.1 22.7 1 15 1Z"
        fill="currentColor"
      />
      <circle cx="15" cy="14.5" r="7.2" fill="none" stroke="#fff" strokeWidth="2.4" />
      <path d="M15 14.5 8.9 11M15 14.5 21.1 11M15 14.5V21.7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="15" cy="14.5" r="1.8" fill="#fff" />
    </svg>
  );
}
