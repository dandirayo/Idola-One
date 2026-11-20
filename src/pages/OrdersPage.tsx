import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Card, Hint, orderStatusTone, paymentTone, StatusChip } from '@/components/ui'
import { DataList, type Column } from '@/components/DataList'
import { useStore, type Order } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import {
  orderSpeed,
  orderStatusLabel,
  paymentStatus,
  paymentStatusLabel,
  speedLabel,
  type OrderStatus,
  type Speed,
} from '@/lib/orders'
import { PeriodPicker } from '@/components/PeriodPicker'
import { useAuth } from '@/lib/auth'
import { choiceRange, inRangeOrAll, initialPeriod } from '@/lib/finance'
import { matches } from '@/lib/search'

const filters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'received', label: 'Diterima' },
  { value: 'processing', label: 'Diproses' },
  { value: 'ready', label: 'Siap Diambil' },
  { value: 'picked_up', label: 'Diambil' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const PAGE_SIZE = 10

const columns: Column<Order>[] = [
  {
    key: 'customer',
    label: 'Pelanggan',
    primary: true,
    sort: (o) => o.customerName,
    render: (o) => (
      <Link to={`/orders/${o.id}`} className="hover:underline">
        {o.customerName}
      </Link>
    ),
  },
  { key: 'number', label: 'Nota', sort: (o) => o.number, hideBelow: 'md', render: (o) => o.number },
  { key: 'date', label: 'Tanggal', sort: (o) => o.createdAt, hideBelow: 'lg', render: (o) => dateFormat.format(new Date(o.createdAt)) },
  { key: 'items', label: 'Layanan', hideBelow: 'lg', render: (o) => <span className="inline-block min-w-48 whitespace-normal">{o.items.map((i) => `${formatQty(i.qty)} ${i.unit} ${i.name}`).join(', ')}</span> },
  { key: 'total', label: 'Total', align: 'right', compact: true, sort: (o) => o.total, render: (o) => formatRupiah(o.total) },
  { key: 'status', label: 'Status', compact: true, sort: (o) => o.status, render: (o) => <StatusChip label={orderStatusLabel[o.status]} tone={orderStatusTone[o.status]} /> },
  {
    key: 'pay',
    label: 'Bayar',
    sort: (o) => o.paid / (o.total || 1),
    render: (o) => {
      const pay = paymentStatus(o.total, o.paid)
      return <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
    },
  },
]

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** `mine`: halaman "Pesanan Saya" untuk karyawan, hanya pesanan yang dia buat. */
export function OrdersPage({ mine = false }: { mine?: boolean }) {
  const allOrders = useStore((s) => s.orders)
  const { session } = useAuth()
  const orders = useMemo(
    () => (mine && session ? allOrders.filter((o) => o.cashier === session.name) : allOrders),
    [allOrders, mine, session],
  )
  const [period, setPeriod] = useState(() => initialPeriod('all'))
  const [speed, setSpeed] = useState<Speed | 'all'>('all')
  const [params] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(0)

  // Pencarian dari kolom di header mengisi kolom cari halaman ini
  useEffect(() => {
    setQuery(urlQuery)
    setPage(0)
  }, [urlQuery])

  const filtered = useMemo(() => {
    const range = choiceRange(period)
    return orders.filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (speed === 'all' || orderSpeed(o.items) === speed) &&
        inRangeOrAll(o.createdAt, range) &&
        matches(query, [o.number, o.customerName], [o.customerPhone]),
    )
  }, [orders, query, status, speed, period])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">{mine ? 'Pesanan Saya' : 'Pesanan'}</h1>
        <Link
          to="/orders/new"
          className="btn btn-accent"
        >
          <Plus className="size-4" aria-hidden />
          Pesanan Baru
        </Link>
      </div>

      <Hint>Perubahan hanya tersimpan sementara dan hilang saat halaman dimuat ulang.</Hint>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Cari nota, nama, atau nomor HP</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Cari nota, nama, atau nomor HP"
            className="field field-search"
          />
        </label>
        <div className="seg" role="group" aria-label="Filter status">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => {
                setStatus(f.value)
                setPage(0)
              }}
              className="seg-item"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <PeriodPicker value={period} onChange={(v) => { setPeriod(v); setPage(0) }} choices={['all', 'today', 'yesterday', 'week', 'month', 'custom']} />
        <div className="seg" role="group" aria-label="Filter kecepatan">
          {(['all', 'reguler', 'express', 'kilat'] as const).map((sp) => (
            <button
              key={sp}
              type="button"
              aria-pressed={speed === sp}
              onClick={() => { setSpeed(sp); setPage(0) }}
              className="seg-item"
            >
              {sp === 'all' ? 'Semua kecepatan' : speedLabel[sp]}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">Tidak ada pesanan yang cocok.</p>
          <p className="mt-1 text-sm text-muted">Ubah kata kunci atau filter status.</p>
        </Card>
      ) : (
        <DataList
          id="orders"
          items={visible}
          rowKey={(o) => o.id}
          columns={columns}
          renderNormal={(o) => {
            const pay = paymentStatus(o.total, o.paid)
            return (
              <li>
                <Link
                  to={`/orders/${o.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-card bg-surface p-4 shadow-card card-hover sm:flex sm:flex-wrap"
                >
                  <div className="min-w-0 flex-1 sm:basis-48">
                    <p className="truncate font-semibold">{o.customerName}</p>
                    <p className="text-xs text-muted sm:truncate">
                      {o.number} · {dateFormat.format(new Date(o.createdAt))}
                    </p>
                  </div>
                  <p className="col-span-2 row-start-2 text-sm text-muted sm:col-auto sm:row-auto">
                    {o.items.map((i) => `${formatQty(i.qty)} ${i.unit} ${i.name}`).join(', ')}
                  </p>
                  <p className="col-start-2 row-start-1 text-right font-semibold sm:col-auto sm:row-auto sm:w-28">{formatRupiah(o.total)}</p>
                  <div className="col-span-2 flex gap-2 sm:col-auto">
                    <StatusChip label={orderStatusLabel[o.status]} tone={orderStatusTone[o.status]} />
                    <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
                  </div>
                </Link>
              </li>
            )
          }}
        />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="btn btn-outline btn-sm"
          >
            Sebelumnya
          </button>
          <span className="text-muted">
            Halaman {current + 1} dari {pages}
          </span>
          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className="btn btn-outline btn-sm"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}
