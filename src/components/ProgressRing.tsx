export function ProgressRing({ value }: { value: number }) {
  const r = 9
  const c = 2 * Math.PI * r
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold" role="img" aria-label={`${value} persen`}>
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-line)" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
        />
      </svg>
      {value}%
    </span>
  )
}
