// Logo Idola One: drum mesin cuci (lingkaran) dengan huruf I di tengahnya.
// "lime" untuk di atas latar gelap (menu samping), "dark" untuk di atas latar terang.
export function LogoMark({ variant = 'lime', className = 'size-9' }: { variant?: 'lime' | 'dark'; className?: string }) {
  const bg = variant === 'lime' ? '#D9F36B' : '#1E1E2D'
  const fg = variant === 'lime' ? '#1E1E2D' : '#D9F36B'
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} role="img" aria-label="Idola One">
      <rect width="48" height="48" rx="14" fill={bg} />
      <circle cx="24" cy="24" r="14" fill="none" stroke={fg} strokeWidth="4" />
      <rect x="21.5" y="16" width="5" height="16" rx="2.5" fill={fg} />
    </svg>
  )
}
