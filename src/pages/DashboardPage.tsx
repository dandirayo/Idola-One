import {
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Hourglass,
  Inbox,
  Package,
  Plus,
  Shirt,
  Sparkles,
  Users,
  Wallet,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, type ComponentType } from 'react'
import { Link } from 'react-router'
import { BarChart } from '@/components/BarChart'
import { MiniCalendar } from '@/components/MiniCalendar'
import { ProgressRing } from '@/components/ProgressRing'
import { Card, IconChip, orderStatusTone, paymentTone, SectionTitle, StatusChip, type Tone } from '@/components/ui'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { computeKpis, orderProgress, weekOverWeekChange, weeklyOrderCounts } from '@/lib/dashboard'
import { formatQty, formatRupiah } from '@/lib/format'
import { orderStatusLabel, paymentStatus, paymentStatusLabel } from '@/lib/orders'
import { requestStatusLabel, requestTypeLabel, type RequestStatus } from '@/lib/requests'

const recentTones: Tone[] = ['peach', 'lime', 'lilac']
const recentIcons: LucideIcon[] = [WashingMachine, Shirt, Sparkles]

const requestTone: Record<RequestStatus, Tone> = {
  pending: 'lilac',
  approved: 'lime',
  rejected: 'peach',
  paid: 'cream',
  completed: 'lime',
}

const timeFormat = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Kpi({
  to,
  icon,
  tone,
  label,
  value,
  hint,
}: {
  to: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone: Tone
  label: string
  value: string
  hint?: string
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card card-hover">
      <IconChip icon={icon} tone={tone} />
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted">{label}</span>
        <span className="block truncate text-lg font-bold">{value}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
    </Link>
  )
}

export function DashboardPage() {
  const { session } = useAuth()
  const orders = useStore((s) => s.orders)
  const cash = useStore((s) => s.cash)
  const inventory = useStore((s) => s.inventory)
  const requests = useStore((s) => s.requests)
  const customers = useStore((s) => s.customers)
  const activeCustomers = customers.filter((c) => c.active).length

  const kpis = useMemo(() => computeKpis(orders, cash, inventory), [orders, cash, inventory])
  const weekly = useMemo(() => weeklyOrderCounts(orders), [orders])
  const change = useMemo(() => weekOverWeekChange(orders), [orders])
  const weekTotal = weekly.reduce((sum, d) => sum + d.count, 0)

  const recent = orders.slice(0, 3)
  const active = orders.filter((o) => o.status === 'received' || o.status === 'processing' || o.status === 'ready').slice(0, 3)
  const readyCount = orders.filter((o) => o.status === 'ready').length
  const lowNames = inventory.filter((i) => i.stock <= i.min).map((i) => i.name)
  const pendingRequests = requests.filter((r) => r.status === 'pending').length

  const actions: { to: string; title: string; subtitle: string; tone: Tone; icon: LucideIcon }[] = [
    {
      to: '/orders',
      title: 'Siap diambil',
      subtitle: readyCount > 0 ? `${readyCount} pesanan · kabari pelanggan` : 'Tidak ada',
      tone: 'peach',
      icon: ClipboardList,
    },
    {
      to: '/orders',
      title: 'Tagihan belum lunas',
      subtitle: kpis.unpaidCount > 0 ? `${kpis.unpaidCount} pesanan · ${formatRupiah(kpis.unpaidTotal)}` : 'Tidak ada',
      tone: 'lime',
      icon: Wallet,
    },
    {
      to: '/inventory',
      title: 'Stok menipis',
      subtitle: lowNames.length > 0 ? lowNames.join(', ') : 'Semua stok aman',
      tone: 'cream',
      icon: Package,
    },
    {
      to: '/requests/review',
      title: 'Pengajuan menunggu',
      subtitle: pendingRequests > 0 ? `${pendingRequests} pengajuan` : 'Tidak ada',
      tone: 'lilac',
      icon: Inbox,
    },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Selamat datang kembali, {session?.name} 👋</h1>


        <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi to="/orders" icon={ClipboardList} tone="peach" label="Pesanan hari ini" value={String(kpis.ordersToday)} />
          <Kpi to="/orders" icon={Hourglass} tone="lilac" label="Pesanan baru" value={String(kpis.newOrders)} hint="Status Diterima" />
          <Kpi to="/cashbook" icon={Wallet} tone="lime" label="Pemasukan bulan ini" value={formatRupiah(kpis.incomeThisMonth)} />
          <Kpi
            to="/orders"
            icon={Wallet}
            tone="cream"
            label="Belum lunas"
            value={formatRupiah(kpis.unpaidTotal)}
            hint={`${kpis.unpaidCount} pesanan`}
          />
          <Kpi to="/inventory" icon={Package} tone="peach" label="Stok menipis" value={String(kpis.lowStock)} />
          <Kpi to="/customers" icon={Users} tone="lilac" label="Pelanggan aktif" value={String(activeCustomers)} />
        </section>

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
            {recent.map((o, i) => {
              const pay = paymentStatus(o.total, o.paid)
              return (
                <Link key={o.id} to={`/orders/${o.id}`} className="block rounded-card bg-surface p-4 shadow-card card-hover">
                  <div className="flex items-center gap-3">
                    <IconChip icon={recentIcons[i]} tone={recentTones[i]} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.customerName}</p>
                      <p className="truncate text-xs text-muted">
                        {o.items.map((it) => `${formatQty(it.qty)} ${it.unit} ${it.name}`).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">Total</p>
                      <p className="whitespace-nowrap text-sm font-semibold">{formatRupiah(o.total)}</p>
                    </div>
                    <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
                  </div>
                </Link>
              )
            })}
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
                    {change === null ? (
                      'Belum ada data minggu lalu'
                    ) : (
                      <>
                        <span className={`font-semibold ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                          {change >= 0 ? '+' : ''}
                          {change}%
                        </span>{' '}
                        dari minggu lalu
                      </>
                    )}{' '}
                    · {weekTotal} pesanan minggu ini
                  </span>
                </p>
              </div>
              <span className="rounded-full border border-line px-3 py-1.5 text-xs font-medium">Mingguan</span>
            </div>
            <BarChart data={weekly} />
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-bold">Perlu Tindakan</h2>
            <ul className="space-y-3">
              {actions.map((a) => (
                <li key={a.title}>
                  <Link to={a.to} className="flex w-full items-center gap-3 rounded-2xl p-1 hover:bg-canvas">
                    <IconChip icon={a.icon} tone={a.tone} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.title}</span>
                      <span className="block truncate text-xs text-muted">{a.subtitle}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
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
                className="icon-btn icon-btn-accent icon-btn-sm"
              >
                <Plus className="size-4" aria-hidden />
              </Link>
            }
          >
            <span id="active-title">Pesanan Berjalan</span>
          </SectionTitle>
          {active.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Tidak ada pesanan yang sedang berjalan.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((o) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-card card-hover"
                >
                  <IconChip icon={WashingMachine} tone={orderStatusTone[o.status]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{o.items.map((it) => it.name).join(', ')}</p>
                    <p className="truncate text-xs text-muted">
                      {o.customerName} · {o.number}
                    </p>
                  </div>
                  <div className="hidden text-sm sm:block">
                    <p className="text-xs text-muted">{orderStatusLabel[o.status]}</p>
                    <p className="font-semibold">Masuk {timeFormat.format(new Date(o.createdAt))}</p>
                  </div>
                  <ProgressRing value={orderProgress[o.status]} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="min-w-0 space-y-6">
        <div className="relative overflow-hidden rounded-card bg-sidebar p-5 text-white">
          <p className="text-xs font-semibold text-lime">Pesanan Baru</p>
          <h2 className="mt-1 text-xl font-bold">Terima cucian pelanggan</h2>
          <p className="mt-1 max-w-[14rem] text-sm text-white/70">Kiloan, satuan, atau gabung. Total dihitung otomatis.</p>
          <Link
            to="/orders/new"
            className="btn btn-accent mt-4"
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
                to="/requests/new"
                aria-label="Buat pengajuan"
                className="icon-btn icon-btn-accent icon-btn-sm"
              >
                <Plus className="size-4" aria-hidden />
              </Link>
            }
          >
            <span id="req-title">Pengajuan</span>
          </SectionTitle>
          <div className="space-y-3">
            {requests.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                to="/requests/review"
                className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card card-hover"
              >
                <IconChip icon={Sparkles} tone={requestTone[r.status]} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {requestTypeLabel[r.type]} · {r.requester}
                  </p>
                  <p className="truncate text-xs text-muted">{dateFormat.format(new Date(r.createdAt))}</p>
                </div>
                <StatusChip label={requestStatusLabel[r.status]} tone={requestTone[r.status]} />
              </Link>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
