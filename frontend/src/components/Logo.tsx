/** DriveMate mark: a rounded square with a road curving into the horizon. Drawn as plain SVG. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="DriveMate logo">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path d="M6 23 Q16 9 26 23" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 21v-4M16 15v-1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}
