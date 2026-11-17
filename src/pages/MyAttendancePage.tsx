import { LogIn, LogOut } from 'lucide-react'
import { useState } from 'react'
import { SelfieCapture } from '@/components/SelfieCapture'
import { Card, StatusChip } from '@/components/ui'
import { checkIn, checkOut } from '@/data/attendance'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { dateKey, slotLabel, weekdayIndex } from '@/lib/shifts'

const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })
const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })

export function MyAttendancePage() {
  const { session } = useAuth()
  const attendance = useStore((s) => s.attendance)
  const shifts = useStore((s) => s.shifts)
  const [mode, setMode] = useState<'in' | 'out' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const employeeId = session?.employeeId
  if (!session || !employeeId) {
    return (
      <Card>
        <p className="font-semibold">Absensi hanya untuk akun karyawan.</p>
      </Card>
    )
  }

  const now = new Date()
  const today = attendance.find((a) => a.employeeId === employeeId && a.date === dateKey(now))
  const slot = shifts.find((r) => r.employeeId === employeeId && r.weekday === weekdayIndex(now))
  const history = attendance.filter((a) => a.employeeId === employeeId).sort((a, b) => b.checkIn.localeCompare(a.checkIn)).slice(0, 7)

  function onCapture(photo: string) {
    setError(null)
    setDone(null)
    try {
      if (mode === 'in') {
        const rec = checkIn(employeeId!, photo)
        setDone(rec.lateMinutes > 0 ? `Absen masuk tercatat. Terlambat ${rec.lateMinutes} menit.` : 'Absen masuk tercatat. Tepat waktu.')
      } else if (mode === 'out') {
        checkOut(employeeId!, photo)
        setDone('Absen pulang tercatat. Terima kasih.')
      }
      setMode(null)
    } catch (err) {
      setMode(null)
      setError(err instanceof Error ? err.message : 'Gagal mencatat absensi.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Absensi</h1>
        <p className="mt-1 text-base text-muted">{day.format(now)}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">Jadwal hari ini</p>
            <p className="text-xl font-bold">{slotLabel(slot)}</p>
          </div>
          {today ? (
            today.checkOut ? (
              <StatusChip label="Selesai hari ini" tone="cream" />
            ) : (
              <StatusChip label="Sedang bekerja" tone="lime" />
            )
          ) : (
            <StatusChip label="Belum absen" tone="peach" />
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-canvas p-4">
            <dt className="text-sm font-semibold text-muted">Masuk</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums">{today ? time.format(new Date(today.checkIn)) : '--:--'}</dd>
            {today && today.lateMinutes > 0 && (
              <dd className="mt-1.5">
                <StatusChip label={`Terlambat ${today.lateMinutes} mnt`} tone="peach" />
              </dd>
            )}
          </div>
          <div className="rounded-2xl bg-canvas p-4">
            <dt className="text-sm font-semibold text-muted">Pulang</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums">{today?.checkOut ? time.format(new Date(today.checkOut)) : '--:--'}</dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={!!today} onClick={() => setMode('in')} className="btn btn-primary btn-lg w-full">
            <LogIn className="size-5" aria-hidden />
            Absen Masuk
          </button>
          <button type="button" disabled={!today || !!today.checkOut} onClick={() => setMode('out')} className="btn btn-accent btn-lg w-full">
            <LogOut className="size-5" aria-hidden />
            Absen Pulang
          </button>
        </div>

        {done && (
          <p role="status" className="mt-4 rounded-2xl bg-lime-soft p-3 text-base font-semibold text-success">
            {done}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-peach p-3 text-base font-semibold text-danger">
            {error}
          </p>
        )}
        <p className="mt-4 text-sm text-muted">
          Waktu absen dicatat oleh sistem. Lupa absen? Ajukan lewat Pengajuan Saya, jenis Lupa Absen.
        </p>
      </Card>

      <section aria-labelledby="hist">
        <h2 id="hist" className="mb-3 text-lg font-bold">
          7 absensi terakhir
        </h2>
        {history.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Belum ada absensi.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {history.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-sm shadow-card">
                <span>
                  <span className="font-semibold">{a.date}</span>
                  <span className="block text-xs text-muted">
                    {time.format(new Date(a.checkIn))} – {a.checkOut ? time.format(new Date(a.checkOut)) : 'belum pulang'}
                    {a.source === 'manual' ? ' · manual' : ''}
                  </span>
                </span>
                {a.lateMinutes > 0 ? <StatusChip label={`Terlambat ${a.lateMinutes} mnt`} tone="peach" /> : <StatusChip label="Tepat waktu" tone="lime" />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {mode && <SelfieCapture title={mode === 'in' ? 'Selfie absen masuk' : 'Selfie absen pulang'} onCapture={onCapture} onCancel={() => setMode(null)} />}
    </div>
  )
}
