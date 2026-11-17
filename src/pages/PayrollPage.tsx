import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card, Hint, StatusChip } from '@/components/ui'
import { payIncentive, payWeeklySalary } from '@/data/payroll'
import { useStore } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import { weekRangeLabel, weekStartKey } from '@/lib/payroll'

type Tab = 'salary' | 'incentive'
const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export function PayrollPage() {
  const employees = useStore((s) => s.employees)
  const payrolls = useStore((s) => s.payrolls)
  const incentives = useStore((s) => s.incentives)

  const [tab, setTab] = useState<Tab>('salary')
  const [week, setWeek] = useState(() => weekStartKey(new Date()))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)

  const shift = (delta: number) => {
    const [y, m, d] = week.split('-').map(Number)
    setWeek(weekStartKey(new Date(y, m - 1, d + delta * 7)))
  }
  const currentWeek = weekStartKey(new Date())
  const name = (id: string) => employees.find((e) => e.id === id)?.name ?? id

  function run(fn: () => void) {
    setError(null)
    try {
      fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  const earned = incentives.filter((i) => i.status === 'earned')
  const paidInc = incentives.filter((i) => i.status === 'paid')
  const earnedTotal = earned.reduce((s, i) => s + i.amount, 0)
  const methodSelect = (
    <label className="text-sm font-semibold">
      <span className="sr-only">Metode bayar</span>
      <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="field w-40">
        {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
          <option key={m} value={m}>
            {paymentMethodLabel[m]}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Gaji & Insentif</h1>

      <Hint>Gaji dan insentif yang dibayar menjadi pengeluaran dan kas keluar di Buku Kas. Insentif yang belum dibayar tidak mengurangi kas.</Hint>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="seg" role="tablist" aria-label="Jenis">
          {(
            [
              ['salary', 'Gaji mingguan'],
              ['incentive', `Insentif${earned.length > 0 ? ` (${earned.length})` : ''}`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className="seg-item"
            >
              {label}
            </button>
          ))}
        </div>
        {methodSelect}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {tab === 'salary' ? (
        <div className="space-y-4" role="tabpanel" aria-label="Gaji mingguan">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => shift(-1)} aria-label="Minggu sebelumnya" className="icon-btn icon-btn-outline icon-btn-sm">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p className="text-sm font-semibold">
              Minggu {weekRangeLabel(week)} {week === currentWeek && <StatusChip label="Minggu ini" tone="lime" />}
            </p>
            <button
              type="button"
              disabled={week >= currentWeek}
              onClick={() => shift(1)}
              aria-label="Minggu berikutnya"
              className="icon-btn icon-btn-outline icon-btn-sm"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <ul className="space-y-3">
            {employees
              .filter((e) => e.active)
              .map((e) => {
                const paid = payrolls.find((p) => p.employeeId === e.id && p.weekStart === week)
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="font-semibold">{e.name}</p>
                      <p className="text-xs text-muted">
                        {e.position} · {formatRupiah(e.weeklySalary)} / minggu
                      </p>
                    </div>
                    {paid ? (
                      <span className="text-right text-sm">
                        <StatusChip label="Dibayar" tone="lime" />
                        <span className="block text-xs text-muted">
                          {formatRupiah(paid.amount)} · {dateTime.format(new Date(paid.at))}
                        </span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => run(() => payWeeklySalary(e.id, week, e.weeklySalary, method))}
                        aria-label={`Bayar gaji ${e.name} ${formatRupiah(e.weeklySalary)}`}
                        className="btn btn-primary btn-sm"
                      >
                        Bayar {formatRupiah(e.weeklySalary)}
                      </button>
                    )}
                  </li>
                )
              })}
          </ul>
        </div>
      ) : (
        <div className="space-y-5" role="tabpanel" aria-label="Insentif">
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Belum dibayar</p>
            <p className="mt-1 text-xl font-bold">{formatRupiah(earnedTotal)}</p>
            <p className="text-xs text-muted">{earned.length} hak insentif</p>
          </Card>

          <section aria-labelledby="earned">
            <h2 id="earned" className="mb-3 text-lg font-bold">
              Hak insentif
            </h2>
            {earned.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Belum ada. Hak insentif tercatat saat pesanan sepatu, helm, atau tas berstatus Siap Diambil.</p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {earned.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-semibold">
                        {name(i.employeeId)} · {i.itemName} {formatQty(i.qty)} pcs
                      </p>
                      <p className="text-xs text-muted">
                        {i.orderNumber} · {formatRupiah(i.perUnit)} per pcs
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => run(() => payIncentive(i.id, method))}
                      aria-label={`Bayar insentif ${name(i.employeeId)} ${formatRupiah(i.amount)}`}
                      className="btn btn-primary btn-sm"
                    >
                      Bayar {formatRupiah(i.amount)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {paidInc.length > 0 && (
            <section aria-labelledby="paid-inc">
              <h2 id="paid-inc" className="mb-3 text-lg font-bold">
                Sudah dibayar
              </h2>
              <ul className="space-y-2 text-sm">
                {paidInc.map((i) => (
                  <li key={i.id} className="flex justify-between rounded-2xl bg-surface p-3 shadow-card">
                    <span>
                      {name(i.employeeId)} · {i.itemName} ({i.orderNumber})
                    </span>
                    <span className="font-semibold">{formatRupiah(i.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
