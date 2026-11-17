import { ChevronRight, Plus, type LucideIcon } from 'lucide-react'
import { concept } from '@/lib/icons'
import { Link } from 'react-router'
import { Card, SectionTitle, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import { isVisibleTo } from '@/lib/notifications'
import { requestStatusLabel, requestTypeLabel } from '@/lib/requests'
import { dateKey, slotLabel, weekdayIndex } from '@/lib/shifts'

const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

function Action({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex min-h-32 flex-col justify-between rounded-card bg-surface p-4 shadow-card card-hover">
      <span className="grid size-12 place-items-center rounded-2xl bg-lilac">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="mt-3 text-base font-bold leading-snug">{label}</span>
    </Link>
  )
}

export function EmployeeHomePage() {
  const { session } = useAuth()
  const orders = useStore((s) => s.orders)
  const shifts = useStore((s) => s.shifts)
  const attendance = useStore((s) => s.attendance)
  const requests = useStore((s) => s.requests)
  const notifications = useStore((s) => s.notifications)
  const incentives = useStore((s) => s.incentives)

  if (!session) return null
  const now = new Date()
  const employeeId = session.employeeId
  const slot = shifts.find((r) => r.employeeId === employeeId && r.weekday === weekdayIndex(now))
  const today = attendance.find((a) => a.employeeId === employeeId && a.date === dateKey(now))
  const mine = requests.filter((r) => r.requester === session.name)
  const pendingMine = mine.filter((r) => r.status === 'pending').length
  const unread = notifications.filter((n) => isVisibleTo(n, session) && !n.read).length
  const ready = orders.filter((o) => o.status === 'ready').length
  const toProcess = orders.filter((o) => o.status === 'received' || o.status === 'processing').length
  const myIncentive = incentives.filter((i) => i.employeeId === employeeId && i.status === 'earned').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Halo, {session.name}</h1>

      <Card variant="dark">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="stat-label text-sm font-semibold">Jadwal hari ini</p>
            <p className="mt-1 whitespace-nowrap text-xl font-bold tabular-nums">{slotLabel(slot ? { start: slot.start, end: slot.end } : null)}</p>
          </div>
          <div>
            <p className="stat-label text-sm font-semibold">Absensi hari ini</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {today ? time.format(new Date(today.checkIn)) : 'Belum absen'}
            </p>
            <p className="mt-1 text-sm text-white/70">
              {today ? (today.checkOut ? `Pulang ${time.format(new Date(today.checkOut))}` : 'Belum pulang') : 'Ketuk tombol di bawah'}
              {today && today.lateMinutes > 0 ? ` · terlambat ${today.lateMinutes} mnt` : ''}
            </p>
          </div>
        </div>
        <Link to="/attendance/me" className="btn btn-accent btn-lg mt-5 w-full">
          <concept.attendance aria-hidden />
          {!today ? 'Absen Masuk' : today.checkOut ? 'Lihat Absensi' : 'Absen Pulang'}
        </Link>
      </Card>

      <Card className="flex items-center justify-between gap-3 p-4">
        <p className="text-base font-semibold text-muted">Insentif belum dibayar</p>
        <p className="text-xl font-bold">{formatRupiah(myIncentive)}</p>
      </Card>

      <section aria-labelledby="quick">
        <SectionTitle>
          <span id="quick">Aksi cepat</span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Action to="/orders/new" icon={Plus} label="Pesanan Baru" />
          <Action to="/customers" icon={concept.customers} label="Pelanggan" />
          <Action to="/orders" icon={concept.orders} label="Pesanan" />
          <Action to="/inventory" icon={concept.stock} label="Pakai Stok" />
          <Action to="/attendance/me" icon={concept.attendance} label="Absensi" />
          <Action to="/reports/payments" icon={concept.receivable} label="Laporan Pembayaran" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>Pekerjaan</SectionTitle>
          <ul className="divide-y divide-line text-base">
            {[
              { to: '/orders', label: 'Perlu diproses', value: toProcess },
              { to: '/orders', label: 'Siap diambil, kabari pelanggan', value: ready },
              { to: '/notifications', label: 'Notifikasi belum dibaca', value: unread },
            ].map((row) => (
              <li key={row.label}>
                <Link to={row.to} className="flex min-h-14 items-center justify-between gap-3">
                  <span className="font-medium">{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="grid min-w-9 place-items-center rounded-full bg-canvas px-2 py-1 text-lg font-bold">{row.value}</span>
                    <ChevronRight className="size-5 text-muted" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Pengajuan saya</h2>
            <Link to="/requests/me" className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-muted hover:text-ink">
              <concept.requests className="size-5" aria-hidden /> {pendingMine} menunggu
            </Link>
          </div>
          {mine.length === 0 ? (
            <p className="text-base text-muted">Belum ada pengajuan.</p>
          ) : (
            <ul className="space-y-3 text-base">
              {mine.slice(0, 3).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{requestTypeLabel[r.type]}</span>
                  <StatusChip label={requestStatusLabel[r.status]} tone={r.status === 'pending' ? 'lilac' : r.status === 'rejected' ? 'peach' : 'lime'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
