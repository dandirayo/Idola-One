import { useState } from 'react'

interface Point {
  day: string
  count: number
}

export function BarChart({ data }: { data: Point[] }) {
  const max = Math.max(...data.map((d) => d.count))
  // Sisakan ruang di atas batang tertinggi agar tooltip tidak menutupi judul.
  const top = Math.max(10, Math.ceil((max * 1.2) / 10) * 10)
  const ticks = [top, top * 0.75, top * 0.5, top * 0.25, 0].map(Math.round)
  const peak = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0)
  const [active, setActive] = useState(peak)

  return (
    <div className="relative mt-4 flex h-56 gap-3">
      <div className="flex flex-col justify-between pb-6 text-xs text-muted" aria-hidden>
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="relative mb-6 flex flex-1 items-end justify-between gap-2 border-b border-line">
        {data.map((d, i) => {
          const selected = i === active
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-label={`${d.day}: ${d.count} pesanan`}
              aria-pressed={selected}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {selected && (
                <span
                  className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-sidebar px-2.5 py-1.5 text-xs font-semibold text-white"
                  style={{ bottom: `calc(${(d.count / top) * 100}% + 0.25rem)` }}
                >
                  {d.count} pesanan
                </span>
              )}
              <span
                className={`w-3 rounded-full transition-colors sm:w-4 ${selected ? 'bg-lime' : 'bg-sidebar'}`}
                style={{ height: `${(d.count / top) * 100}%` }}
              />
              <span className="absolute -bottom-6 text-xs text-muted">{d.day}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
