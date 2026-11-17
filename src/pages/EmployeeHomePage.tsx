import { Plus, type LucideIcon } from 'lucide-react'
import { concept } from '@/lib/icons'
import { Link } from 'react-router'
import { Card, Hint, SectionTitle, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import { isVisibleTo } from '@/lib/notifications'
import { requestStatusLabel, requestTypeLabel } from '@/lib/requests'
import { dateKey, slotLabel, weekdayIndex } from '@/lib/shifts'

const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

function Action({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link to={to} className="flex min-h-24 flex-col justify-between rounded-card bg-surface p-4 shadow-card card-hover">
      <span className="grid size-10 place-items-center rounded-xl bg-lilac">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="mt-3 text-sm font-semibold">{label}</span>
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
      <h1 className="text-2xl font-bold sm:text-3xl">Halo, {session.name}</h1>

      <Hint>Pratinjau dengan data contoh.</Hint>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Jadwal hari ini</p>
          <p className="mt-1 text-lg font-bold">{slotLabel(slot ? { start: slot.start, end: slot.end } : null)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Absensi hari ini</p>
          {today ? (
            <p className="mt-1 text-lg font-bold">
              {time.format(new Date(today.checkIn))}
              {today.checkOut ? ` – ${time.format(new Date(today.checkOut))}` : ' · belum pulang'}
            </p>
          ) : (
            <Link to="/attendance/me" className="mt-1 inline-block text-lg font-bold underline">
              Belum absen
            </Link>
          )}
          {today && today.lateMinutes > 0 && <StatusChip label={`Terlambat ${today.lateMinutes} mnt`} tone="peach" />}
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Insentif belum dibayar</p>
          <p className="mt-1 text-lg font-bold">{formatRupiah(myIncentive)}</p>
        </Card>
      </div>

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
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <Link to="/orders" className="hover:underline">
                Perlu diproses
              </Link>
              <span className="font-semibold">{toProcess}</span>
            </li>
            <li className="flex justify-between">
              <Link to="/orders" className="hover:underline">
                Siap diambil, kabari pelanggan
              </Link>
              <span className="font-semibold">{ready}</span>
            </li>
            <li className="flex justify-between">
              <Link to="/notifications" className="inline-flex items-center gap-1 hover:underline">
                <concept.notifications className="size-3.5" aria-hidden /> Notifikasi belum dibaca
              </Link>
              <span className="font-semibold">{unread}</span>
            </li>
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Pengajuan saya</h2>
            <Link to="/requests/me" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
              <concept.requests className="size-4" aria-hidden /> {pendingMine} menunggu
            </Link>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-muted">Belum ada pengajuan.</p>
          ) : (
            <ul className="space-y-2 text-sm">
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
