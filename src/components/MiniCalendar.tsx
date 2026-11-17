import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M']
const monthFormat = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

export function MiniCalendar() {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Minggu dimulai Senin: getDay() 0=Minggu -> 6, 1=Senin -> 0
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const cells = [...Array<null>(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label="Bulan sebelumnya"
          className="icon-btn icon-btn-sm"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold capitalize">{monthFormat.format(cursor)}</span>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label="Bulan berikutnya"
          className="icon-btn icon-btn-sm"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 rounded-2xl bg-canvas p-2 text-center text-xs">
        {dayNames.map((d, i) => (
          <span key={i} className="py-1 font-semibold">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`e${i}`} />
          ) : (
            <span
              key={d}
              aria-current={isToday(d) ? 'date' : undefined}
              className={`mx-auto grid size-7 place-items-center rounded-full ${
                isToday(d) ? 'bg-lime font-bold' : 'text-ink/80'
              }`}
            >
              {d}
            </span>
          ),
        )}
      </div>
    </div>
  )
}
