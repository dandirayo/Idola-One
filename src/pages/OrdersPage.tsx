import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, orderStatusTone, paymentTone, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import {
  orderStatusLabel,
  paymentStatus,
  paymentStatusLabel,
  type OrderStatus,
} from '@/lib/orders'

const filters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'received', label: 'Diterima' },
  { value: 'processing', label: 'Diproses' },
  { value: 'ready', label: 'Siap Diambil' },
  { value: 'picked_up', label: 'Diambil' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const PAGE_SIZE = 10

const dateFormat = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function OrdersPage() {
  const orders = useStore((s) => s.orders)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (!q || o.number.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)),
    )
  }, [orders, query, status])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Pesanan</h1>
        <Link
          to="/orders/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-sidebar"
        >
          <Plus className="size-4" aria-hidden />
          Pesanan Baru
        </Link>
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Data contoh. Perubahan hanya tersimpan sementara dan hilang saat halaman dimuat ulang.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Cari nomor nota atau pelanggan</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Cari nomor nota atau pelanggan"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none placeholder:text-muted focus:border-ink"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter status">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={status === f.value}
              onClick={() => {
                setStatus(f.value)
                setPage(0)
              }}
              className={`h-9 rounded-full px-4 text-sm font-semibold ${
                status === f.value ? 'bg-sidebar text-white' : 'bg-surface text-ink shadow-card hover:bg-line'
              }`}
            >
              {f.label}
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
        <ul className="space-y-3">
          {visible.map((o) => {
            const pay = paymentStatus(o.total, o.paid)
            return (
              <li key={o.id}>
                <Link
                  to={`/orders/${o.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card bg-surface p-4 shadow-card hover:bg-white/70"
                >
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-semibold">{o.customerName}</p>
                    <p className="truncate text-xs text-muted">
                      {o.number} · {dateFormat.format(new Date(o.createdAt))}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    {o.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ')}
                  </p>
                  <p className="w-28 text-right font-semibold">{formatRupiah(o.total)}</p>
                  <div className="flex gap-2">
                    <StatusChip label={orderStatusLabel[o.status]} tone={orderStatusTone[o.status]} />
                    <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="h-9 rounded-full bg-surface px-4 font-semibold shadow-card disabled:opacity-50"
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
            className="h-9 rounded-full bg-surface px-4 font-semibold shadow-card disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}
