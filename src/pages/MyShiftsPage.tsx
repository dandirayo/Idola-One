import { Card, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { slotLabel, weekdayIndex, weekdayNames } from '@/lib/shifts'

export function MyShiftsPage() {
  const { session } = useAuth()
  const shifts = useStore((s) => s.shifts)
  const employeeId = session?.employeeId

  if (!employeeId) {
    return (
      <Card>
        <p className="font-semibold">Jadwal hanya untuk akun karyawan.</p>
      </Card>
    )
  }

  const today = weekdayIndex(new Date())

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Jadwal Saya</h1>
      <p className="text-sm text-muted">Jadwal mingguan yang berulang. Perubahan hanya oleh owner.</p>
      <ul className="space-y-3">
        {weekdayNames.map((d, wd) => {
          const row = shifts.find((r) => r.employeeId === employeeId && r.weekday === wd)
          return (
            <li key={d} className={`flex items-center justify-between rounded-card p-4 shadow-card ${wd === today ? 'bg-lime-soft' : 'bg-surface'}`}>
              <span className="font-semibold">
                {d} {wd === today && <StatusChip label="Hari ini" tone="lime" />}
              </span>
              <span className={`text-sm ${row ? 'font-semibold' : 'text-muted'}`}>{slotLabel(row ? { start: row.start, end: row.end } : null)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
