import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, SectionTitle, StatusChip } from '@/components/ui'
import { posDayFor, setPosDay } from '@/data/pos'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { periodLabel, periodRange, type Period } from '@/lib/finance'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import { summarizeSales } from '@/lib/pos'

const periods: Period[] = ['today', 'yesterday', 'week', 'month']
const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

export function PosHomePage() {
  const { businessId } = useAuth()
  const business = useStore((s) => s.businesses).find((b) => b.id === businessId)
  const allSales = useStore((s) => s.posSales)
  useStore((s) => s.posDays) // agar tampilan ikut berubah saat hari dibuka atau ditutup

  const [period, setPeriod] = useState<Period>('today')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sales = useMemo(() => allSales.filter((s) => s.businessId === businessId), [allSales, businessId])
  const summary = useMemo(() => summarizeSales(sales, periodRange(period)), [sales, period])
  const day = businessId ? posDayFor(businessId) : undefined
  const open = !!day?.open

  if (!business || !businessId) return null

  function toggle() {
    setError(null)
    try {
      setPosDay(businessId!, !open, open ? '' : note)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status jualan.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{business.name}</h1>
          <p className="mt-1 text-sm text-muted">Ringkasan penjualan</p>
        </div>
        <StatusChip label={open ? 'Berjualan hari ini' : 'Belum berjualan'} tone={open ? 'lime' : 'peach'} />
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Data contoh. Penjualan POS dipisah dari Buku Kas laundry dan tidak dicampur ke omzet laundry.
      </p>

      <Card>
        <SectionTitle>Jualan hari ini</SectionTitle>
        {!open && (
          <label className="mb-3 block text-sm font-semibold">
            Catatan (opsional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: buka di depan kampus"
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm outline-none focus:border-ink"
            />
          </label>
        )}
        {open && day?.note && <p className="mb-3 text-sm">Catatan: {day.note}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggle}
            className={`h-11 rounded-full px-6 text-sm font-bold ${open ? 'border border-line text-danger hover:bg-canvas' : 'bg-sidebar text-white hover:bg-sidebar-hover'}`}
          >
            {open ? 'Tutup jualan hari ini' : 'Mulai jualan hari ini'}
          </button>
          {open && (
            <Link to="/pos/cashier" className="inline-flex h-11 items-center rounded-full bg-lime px-6 text-sm font-bold text-sidebar">
              Buka Kasir
            </Link>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Periode">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-sidebar text-white">
          <p className="text-xs font-semibold text-lime">Omzet · {periodLabel[period]}</p>
          <p className="mt-1 text-3xl font-bold">{formatRupiah(summary.total)}</p>
          <p className="mt-1 text-xs text-white/60">{summary.count} transaksi</p>
        </Card>
        <Card>
          <SectionTitle>Per metode</SectionTitle>
          <ul className="space-y-1.5 text-sm">
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <li key={m} className="flex justify-between">
                <span>{paymentMethodLabel[m]}</span>
                <span className="font-semibold">{formatRupiah(summary.byMethod[m])}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>Terlaris · {periodLabel[period]}</SectionTitle>
          {summary.top.length === 0 ? (
            <p className="text-sm text-muted">Belum ada penjualan.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {summary.top.slice(0, 5).map((t) => (
                <li key={t.name} className="flex justify-between">
                  <span>{t.name}</span>
                  <span className="font-semibold">{t.qty} gelas</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle>Transaksi terbaru</SectionTitle>
          {sales.length === 0 ? (
            <p className="text-sm text-muted">Belum ada transaksi.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sales.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span>
                    <span className="font-semibold">{s.number}</span>
                    <span className="block text-xs text-muted">
                      {time.format(new Date(s.at))} · {paymentMethodLabel[s.method]}
                    </span>
                  </span>
                  <span className="font-semibold">{formatRupiah(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
