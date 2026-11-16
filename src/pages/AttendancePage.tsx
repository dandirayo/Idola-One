import { useMemo, useState } from 'react'
import { Card, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { inRange, periodLabel, periodRange, type Period } from '@/lib/finance'
import { dateKey, slotLabel, weekdayIndex } from '@/lib/shifts'

const periods: Period[] = ['today', 'week', 'month']
const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

export function AttendancePage() {
  const attendance = useStore((s) => s.attendance)
  const employees = useStore((s) => s.employees)
  const shifts = useStore((s) => s.shifts)

  const [period, setPeriod] = useState<Period>('week')
  const [employeeId, setEmployeeId] = useState('all')

  const records = useMemo(() => {
    const range = periodRange(period)
    return attendance
      .filter((a) => inRange(a.checkIn, range) && (employeeId === 'all' || a.employeeId === employeeId))
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  }, [attendance, period, employeeId])

  const name = (id: string) => employees.find((e) => e.id === id)?.name ?? id
  const late = records.filter((r) => r.lateMinutes > 0)
  const lateTotal = late.reduce((sum, r) => sum + r.lateMinutes, 0)

  // Karyawan aktif yang dijadwalkan hari ini tetapi belum absen
  const now = new Date()
  const notYet = employees.filter(
    (e) =>
      e.active &&
      shifts.some((r) => r.employeeId === e.id && r.weekday === weekdayIndex(now)) &&
      !attendance.some((a) => a.employeeId === e.id && a.date === dateKey(now)),
  )

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Absensi</h1>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Data contoh. Absensi dibuat karyawan dari akunnya (selfie) atau lewat pengajuan Lupa Absen yang kamu setujui.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2" role="group" aria-label="Periode">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`h-9 rounded-full px-4 text-sm font-semibold ${period === p ? 'bg-sidebar text-white' : 'bg-surface shadow-card hover:bg-line'}`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
        <label className="text-sm font-semibold">
          <span className="sr-only">Filter karyawan</span>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-9 rounded-full border border-line bg-surface px-4 text-sm outline-none focus:border-ink">
            <option value="all">Semua karyawan</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Hadir</p>
          <p className="mt-1 text-xl font-bold">{records.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Terlambat</p>
          <p className="mt-1 text-xl font-bold">{late.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Total menit terlambat</p>
          <p className="mt-1 text-xl font-bold">{lateTotal}</p>
        </Card>
      </div>

      {notYet.length > 0 && (
        <p className="rounded-2xl bg-cream px-4 py-2.5 text-sm" role="status">
          <strong>Belum absen hari ini:</strong> {notYet.map((e) => e.name).join(', ')}
        </p>
      )}

      {records.length === 0 ? (
        <Card>
          <p className="font-semibold">Belum ada absensi pada {periodLabel[period].toLowerCase()}.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => {
            const wd = weekdayIndex(new Date(r.checkIn))
            const planned = shifts.find((x) => x.employeeId === r.employeeId && x.weekday === wd)
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold">{name(r.employeeId)}</p>
                  <p className="text-xs text-muted">
                    {r.date} · jadwal {slotLabel(planned ? { start: planned.start, end: planned.end } : null)}
                  </p>
                </div>
                <p className="text-sm">
                  {time.format(new Date(r.checkIn))} – {r.checkOut ? time.format(new Date(r.checkOut)) : 'belum pulang'}
                </p>
                {r.lateMinutes > 0 ? <StatusChip label={`Terlambat ${r.lateMinutes} mnt`} tone="peach" /> : <StatusChip label="Tepat waktu" tone="lime" />}
                {r.source === 'manual' && <StatusChip label="Manual" tone="lilac" />}
                <div className="flex gap-2">
                  {r.photoIn && <img src={r.photoIn} alt={`Selfie masuk ${name(r.employeeId)}`} className="size-12 rounded-lg object-cover" />}
                  {r.photoOut && <img src={r.photoOut} alt={`Selfie pulang ${name(r.employeeId)}`} className="size-12 rounded-lg object-cover" />}
                </div>
                {r.note && <p className="basis-full text-xs text-muted">{r.note}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
