import { Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, inputClass, SectionTitle } from '@/components/ui'
import { correctPayment, useStore, type Order, type Payment } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO ke nilai input datetime-local (waktu lokal). */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function PaymentHistory({ order }: { order: Order }) {
  const { session } = useAuth()
  const audit = useStore((s) => s.audit).filter((a) => a.entity === 'Pesanan' && a.entityId === order.id)
  const isOwner = session?.role === 'owner'

  const [editing, setEditing] = useState<Payment | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [when, setWhen] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open(p: Payment) {
    setEditing(p)
    setAmount(String(p.amount))
    setMethod(p.method)
    setWhen(toLocalInput(p.at))
    setError(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    try {
      correctPayment(order.id, editing.id, {
        amount: Number(amount.replace(/\./g, '').replace(',', '.')),
        method,
        at: when ? new Date(when).toISOString() : '',
      })
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengoreksi pembayaran.')
    }
  }

  return (
    <Card>
      <SectionTitle>Riwayat Pembayaran</SectionTitle>
      {order.payments.length === 0 ? (
        <p className="text-sm text-muted">Belum ada pembayaran.</p>
      ) : (
        <ul className="divide-y divide-line text-sm">
          {order.payments.map((p) => (
            <li key={p.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span>
                  {paymentMethodLabel[p.method]}
                  <span className="block text-xs text-muted">{dateTime.format(new Date(p.at))}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{formatRupiah(p.amount)}</span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => (editing?.id === p.id ? setEditing(null) : open(p))}
                      aria-label={`Koreksi pembayaran ${formatRupiah(p.amount)}`}
                      aria-expanded={editing?.id === p.id}
                      className="icon-btn icon-btn-sm"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  )}
                </span>
              </div>

              {editing?.id === p.id && (
                <form onSubmit={submit} noValidate className="mt-3 grid gap-2 rounded-2xl bg-canvas p-3 sm:grid-cols-3">
                  <label className="block text-xs font-semibold">
                    Nominal (Rp)
                    <input
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`${inputClass} mt-1 bg-surface`}
                    />
                  </label>
                  <label className="block text-xs font-semibold">
                    Metode
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      className={`${inputClass} mt-1 bg-surface`}
                    >
                      {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {paymentMethodLabel[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold">
                    Tanggal
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className={`${inputClass} mt-1 bg-surface`}
                    />
                  </label>
                  <div className="flex gap-2 sm:col-span-3">
                    <button type="submit" className="btn btn-primary btn-sm">
                      Simpan koreksi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="btn btn-outline btn-sm"
                    >
                      Batal
                    </button>
                  </div>
                  <p className="text-xs text-muted sm:col-span-3">
                    Koreksi memperbarui tagihan dan Buku Kas, lalu tercatat di riwayat koreksi.
                  </p>
                  {error && (
                    <p role="alert" className="text-sm font-medium text-danger sm:col-span-3">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {audit.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <h3 className="mb-2 text-sm font-bold">Riwayat Koreksi</h3>
          <ul className="space-y-2 text-xs">
            {audit.map((a) => (
              <li key={a.id} className="rounded-xl bg-canvas p-2.5">
                <p className="font-semibold">
                  {a.action} · {dateTime.format(new Date(a.at))}
                </p>
                <p className="text-muted">Sebelum: {a.before}</p>
                <p>Sesudah: {a.after}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
