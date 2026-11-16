import { ArrowUpRight, ChevronRight, Plus, Shirt, Sparkles, Star, WashingMachine } from 'lucide-react'
import { Link } from 'react-router'
import { BarChart } from '@/components/BarChart'
import { MiniCalendar } from '@/components/MiniCalendar'
import { ProgressRing } from '@/components/ProgressRing'
import { Card, IconChip, SectionTitle, StatusChip } from '@/components/ui'
import {
  activeOrders,
  orderStatusLabel,
  recentOrders,
  requests,
  requestStatusLabel,
  todaySchedule,
  weeklyOrders,
  type Tone,
} from '@/data/mock'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'

const recentTones: Tone[] = ['peach', 'lime', 'lilac']
const recentIcons = [WashingMachine, Shirt, Sparkles]
const paymentTone: Record<string, Tone> = { Lunas: 'lime', DP: 'cream', 'Belum Bayar': 'peach' }

export function DashboardPage() {
  const { session } = useAuth()
  const weekTotal = weeklyOrders.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">Selamat datang kembali, {session?.name} 👋</h1>
        </div>

        <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
          Pratinjau tampilan dengan <strong>data contoh</strong>. Belum terhubung ke server.
        </p>

        <section aria-labelledby="recent-title">
          <SectionTitle
            action={
              <Link to="/orders" className="text-sm font-medium text-muted hover:text-ink">
                Lihat semua
              </Link>
            }
          >
            <span id="recent-title">Pesanan Terbaru</span>
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            {recentOrders.map((o, i) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center gap-3">
                  <IconChip icon={recentIcons[i]} tone={recentTones[i]} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.customer}</p>
                    <p className="truncate text-xs text-muted">{o.detail}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">Total</p>
                    <p className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
                      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                      {formatRupiah(o.total)}
                    </p>
                  </div>
                  <StatusChip label={o.payment} tone={paymentTone[o.payment]} />
                </div>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Aktivitas Pesanan</h2>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span className="grid size-6 place-items-center rounded-md bg-canvas">
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </span>
                  <span>
                    <span className="font-semibold text-success">+3%</span> dari minggu lalu · {weekTotal} pesanan
                  </span>
                </p>
              </div>
              <span className="rounded-full border border-line px-3 py-1.5 text-xs font-medium">Mingguan</span>
            </div>
            <BarChart data={weeklyOrders} />
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-bold">Jadwal Hari Ini</h2>
            <ul className="space-y-3">
              {todaySchedule.map((s) => (
                <li key={s.title}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl p-1 text-left hover:bg-canvas"
                  >
                    <IconChip icon={Sparkles} tone={s.tone} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{s.title}</span>
                      <span className="block truncate text-xs text-muted">{s.subtitle}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <section aria-labelledby="active-title">
          <SectionTitle
            action={
              <Link
                to="/orders/new"
                aria-label="Buat pesanan baru"
                className="grid size-8 place-items-center rounded-full bg-lime"
              >
                <Plus className="size-4" aria-hidden />
              </Link>
            }
          >
            <span id="active-title">Pesanan Berjalan</span>
          </SectionTitle>
          <div className="space-y-3">
            {activeOrders.map((o) => (
              <Card key={o.id} className="flex items-center gap-4 p-4">
                <IconChip icon={WashingMachine} tone="lilac" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.service}</p>
                  <p className="truncate text-xs text-muted">
                    {o.customer} · {o.id}
                  </p>
                </div>
                <div className="hidden text-sm sm:block">
                  <p className="text-xs text-muted">{orderStatusLabel[o.status]}</p>
                  <p className="font-semibold">{o.dueIn}</p>
                </div>
                <ProgressRing value={o.progress} />
              </Card>
            ))}
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-6">
        <div className="relative overflow-hidden rounded-card bg-sidebar p-5 text-white">
          <p className="text-xs font-semibold text-lime">Pesanan Baru</p>
          <h2 className="mt-1 text-xl font-bold">Terima cucian pelanggan</h2>
          <p className="mt-1 max-w-[14rem] text-sm text-white/70">Kiloan, satuan, atau gabung. Nota langsung siap dicetak.</p>
          <Link
            to="/orders/new"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-lime px-5 text-sm font-bold text-sidebar"
          >
            Buat Pesanan
          </Link>
          <WashingMachine className="absolute -bottom-4 -right-3 size-28 text-white/10" aria-hidden />
        </div>

        <Card>
          <MiniCalendar />
        </Card>

        <section aria-labelledby="req-title">
          <SectionTitle
            action={
              <Link
                to="/requests/review"
                aria-label="Buka Pusat Pengajuan"
                className="grid size-8 place-items-center rounded-full bg-lime"
              >
                <Plus className="size-4" aria-hidden />
              </Link>
            }
          >
            <span id="req-title">Pengajuan</span>
          </SectionTitle>
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.title} className="flex items-center gap-3 p-4">
                <IconChip icon={Sparkles} tone={r.tone} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="truncate text-xs text-muted">{r.time}</p>
                </div>
                <StatusChip label={requestStatusLabel[r.status]} tone={r.tone} />
              </Card>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
