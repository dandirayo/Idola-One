import { useMemo, useState, type FormEvent } from 'react'
import { ManualCashForm } from '@/components/ManualCashForm'
import { Card, Hint, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { addExpense, useStore } from '@/data/store'
import { balance, inRange, periodLabel, periodRange, summarize, type Period } from '@/lib/finance'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'

const periods: Period[] = ['today', 'yesterday', 'week', 'month']
const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const INITIAL_ROWS = 10

export function CashbookPage() {
  const cash = useStore((s) => s.cash)

  const [period, setPeriod] = useState<Period>('today')
  const [showAll, setShowAll] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Operasional')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)

  const entries = useMemo(() => {
    const range = periodRange(period)
    return cash.filter((e) => inRange(e.at, range)).sort((a, b) => b.at.localeCompare(a.at))
  }, [cash, period])
  const summary = summarize(entries)
  const closing = balance(cash)
  const rows = showAll ? entries : entries.slice(0, INITIAL_ROWS)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      addExpense(description, category, Number(amount.replace(/\./g, '').replace(',', '.')), method)
      setDescription('')
      setAmount('')
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pengeluaran.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Buku Kas</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setManualOpen((v) => !v)}
            aria-expanded={manualOpen}
            className="btn btn-outline"
          >
            Kas Manual
          </button>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            aria-expanded={formOpen}
            className="btn btn-accent"
          >
            Catat Pengeluaran
          </button>
        </div>
      </div>

      {manualOpen && <ManualCashForm onDone={() => setManualOpen(false)} />}

      <Hint>Kas masuk terisi otomatis dari pembayaran pesanan, kas keluar dari pengeluaran dan pembelian stok.</Hint>

      {formOpen && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <label className="block text-sm font-semibold lg:col-span-2">
              Deskripsi
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Kategori
              <input value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Nominal (Rp)
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Metode
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className={`${inputClass} mt-1.5`}
              >
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel[m]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={primaryButton}>
              Simpan
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </Card>
      )}

      <div className="seg" role="group" aria-label="Periode">
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => {
              setPeriod(p)
              setShowAll(false)
            }}
            className="seg-item"
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="dark">
          <p className="text-xs font-semibold text-lime">Saldo akhir</p>
          <p className="mt-1 text-2xl font-bold">{formatRupiah(closing)}</p>
          <p className="mt-1 text-xs text-white/60">Sepanjang waktu</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-muted">Masuk · {periodLabel[period]}</p>
          <p className="mt-1 text-2xl font-bold text-success">{formatRupiah(summary.in)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold text-muted">Keluar · {periodLabel[period]}</p>
          <p className="mt-1 text-2xl font-bold text-danger">{formatRupiah(summary.out)}</p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Rincian per metode · {periodLabel[period]}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
            <div key={m} className="rounded-2xl bg-canvas p-3 text-sm">
              <p className="font-semibold">{paymentMethodLabel[m]}</p>
              <p className="text-success">Masuk {formatRupiah(summary.byMethod[m].in)}</p>
              <p className="text-danger">Keluar {formatRupiah(summary.byMethod[m].out)}</p>
            </div>
          ))}
        </div>
      </Card>

      <section aria-labelledby="tx-title">
        <h2 id="tx-title" className="mb-3 text-lg font-bold">
          Transaksi
        </h2>
        {entries.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Belum ada transaksi pada {periodLabel[period].toLowerCase()}.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-card">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                    e.direction === 'in' ? 'bg-lime-soft text-success' : 'bg-peach text-danger'
                  }`}
                  aria-hidden
                >
                  {e.direction === 'in' ? '+' : '−'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{e.description}</span>
                  <span className="block truncate text-xs text-muted">
                    {e.category}{e.manual ? ' (manual)' : ''} · {paymentMethodLabel[e.method]} · {dateTime.format(new Date(e.at))}
                  </span>
                </span>
                <span className={`text-sm font-bold ${e.direction === 'in' ? 'text-success' : 'text-danger'}`}>
                  {e.direction === 'in' ? '+' : '−'}
                  {formatRupiah(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {entries.length > INITIAL_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="btn btn-outline btn-sm mt-3"
          >
            {showAll ? 'Tampilkan lebih sedikit' : `Lihat semua (${entries.length})`}
          </button>
        )}
      </section>
    </div>
  )
}
