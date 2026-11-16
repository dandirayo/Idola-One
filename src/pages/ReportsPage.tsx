import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, SectionTitle } from '@/components/ui'
import { useStore } from '@/data/store'
import { inRange, periodLabel, periodRange, type Period } from '@/lib/finance'
import { downloadCsv } from '@/lib/download'
import { formatQty, formatRupiah } from '@/lib/format'
import { orderStatusLabel, paymentMethodLabel, type OrderStatus, type PaymentMethod } from '@/lib/orders'
import { cashCsv, cashReport, orderReport, ordersCsv } from '@/lib/reports'

const periods: Period[] = ['today', 'yesterday', 'week', 'month']
type Tab = 'orders' | 'cash'

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  )
}

export function ReportsPage() {
  const orders = useStore((s) => s.orders)
  const cash = useStore((s) => s.cash)

  const [tab, setTab] = useState<Tab>('orders')
  const [period, setPeriod] = useState<Period>('month')

  const range = useMemo(() => periodRange(period), [period])
  const orderRep = useMemo(() => orderReport(orders, range), [orders, range])
  const cashRep = useMemo(() => cashReport(cash, range), [cash, range])

  function exportCsv() {
    const stamp = new Date().toISOString().slice(0, 10)
    if (tab === 'orders') {
      downloadCsv(`pesanan-${period}-${stamp}.csv`, ordersCsv(orders.filter((o) => inRange(o.createdAt, range))))
    } else {
      downloadCsv(`kas-${period}-${stamp}.csv`, cashCsv(cash.filter((e) => inRange(e.at, range))))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Laporan</h1>
        <div className="flex gap-2">
          <Link
            to="/reports/payments"
            className="inline-flex h-11 items-center rounded-full bg-surface px-5 text-sm font-semibold shadow-card hover:bg-line"
          >
            Laporan Pembayaran
          </Link>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-sidebar"
          >
            <Download className="size-4" aria-hidden />
            Ekspor CSV
          </button>
        </div>
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Data contoh yang dihitung di browser. Di aplikasi sungguhan angka laporan dihitung server.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="tablist" aria-label="Jenis laporan">
          {(
            [
              ['orders', 'Pesanan'],
              ['cash', 'Keuangan'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`h-10 rounded-full px-5 text-sm font-semibold ${
                tab === value ? 'bg-sidebar text-white' : 'bg-surface shadow-card hover:bg-line'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Periode">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={`h-9 rounded-full px-4 text-sm font-semibold ${
                period === p ? 'bg-sidebar text-white' : 'bg-surface shadow-card hover:bg-line'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'orders' ? (
        <div className="space-y-5" role="tabpanel" aria-label="Laporan pesanan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Jumlah pesanan" value={String(orderRep.count)} hint="Tanpa yang dibatalkan" />
            <Stat label="Nilai tagihan" value={formatRupiah(orderRep.value)} />
            <Stat label="Volume" value={`${formatQty(orderRep.kg)} kg · ${formatQty(orderRep.pcs)} pcs`} />
            <Stat label="Sisa tagihan" value={formatRupiah(orderRep.outstanding)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <SectionTitle>Per status</SectionTitle>
              <ul className="space-y-2 text-sm">
                {(Object.keys(orderStatusLabel) as OrderStatus[]).map((s) => (
                  <li key={s} className="flex justify-between">
                    <span>{orderStatusLabel[s]}</span>
                    <span className="font-semibold">{orderRep.byStatus[s]}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionTitle>Per layanan</SectionTitle>
              {orderRep.byService.length === 0 ? (
                <p className="text-sm text-muted">Belum ada pesanan pada {periodLabel[period].toLowerCase()}.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {orderRep.byService.map((r) => (
                    <li key={`${r.unit}:${r.name}`} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {r.name} <span className="text-muted">· {formatQty(r.qty)} {r.unit}</span>
                      </span>
                      <span className="font-semibold">{formatRupiah(r.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-5" role="tabpanel" aria-label="Laporan keuangan">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Masuk" value={formatRupiah(cashRep.in)} />
            <Stat label="Keluar" value={formatRupiah(cashRep.out)} />
            <Stat label="Bersih" value={formatRupiah(cashRep.net)} hint="Masuk dikurangi keluar" />
            <Stat label="Jumlah transaksi" value={String(cashRep.count)} hint="Tanpa saldo awal" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <SectionTitle>Per metode</SectionTitle>
              <ul className="space-y-2 text-sm">
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                  <li key={m} className="flex justify-between gap-3">
                    <span>{paymentMethodLabel[m]}</span>
                    <span>
                      <span className="text-success">+{formatRupiah(cashRep.byMethod[m].in)}</span>{' '}
                      <span className="text-danger">−{formatRupiah(cashRep.byMethod[m].out)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionTitle>Per kategori</SectionTitle>
              {cashRep.byCategory.length === 0 ? (
                <p className="text-sm text-muted">Belum ada transaksi pada {periodLabel[period].toLowerCase()}.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {cashRep.byCategory.map((c) => (
                    <li key={c.category} className="flex justify-between gap-3">
                      <span>{c.category}</span>
                      <span>
                        {c.in > 0 && <span className="text-success">+{formatRupiah(c.in)} </span>}
                        {c.out > 0 && <span className="text-danger">−{formatRupiah(c.out)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
