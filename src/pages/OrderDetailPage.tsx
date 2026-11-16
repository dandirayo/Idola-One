import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { Card, inputClass, orderStatusTone, paymentTone, primaryButton, SectionTitle, StatusChip } from '@/components/ui'
import { addPayment, setOrderStatus, useStore } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import {
  nextStatuses,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatus,
  paymentStatusLabel,
  whatsappReadyUrl,
  type OrderStatus,
  type PaymentMethod,
} from '@/lib/orders'

const actionLabel: Record<OrderStatus, string> = {
  received: 'Diterima',
  processing: 'Proses Cucian',
  ready: 'Tandai Siap Diambil',
  picked_up: 'Tandai Diambil',
  cancelled: 'Batalkan Pesanan',
}

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export function OrderDetailPage() {
  const { orderId } = useParams()
  const orders = useStore((s) => s.orders)
  const order = orders.find((o) => o.id === orderId)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)

  if (!order) {
    return (
      <div className="space-y-4">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          <ArrowLeft className="size-4" aria-hidden /> Kembali
        </Link>
        <Card>
          <p className="font-semibold">Pesanan tidak ditemukan.</p>
          <p className="mt-1 text-sm text-muted">Data contoh hilang saat halaman dimuat ulang.</p>
        </Card>
      </div>
    )
  }

  const remaining = order.total - order.paid
  const pay = paymentStatus(order.total, order.paid)
  const transitions = nextStatuses(order.status)

  function changeStatus(status: OrderStatus) {
    if (!order) return
    if (status === 'cancelled' && !window.confirm('Batalkan pesanan ini?')) return
    setOrderStatus(order.id, status)
  }

  function submitPayment(e: FormEvent) {
    e.preventDefault()
    if (!order) return
    setError(null)
    try {
      addPayment(order.id, Number(amount.replace(/\./g, '').replace(',', '.')), method)
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pembayaran.')
    }
  }

  const canPay = remaining > 0 && order.status !== 'cancelled'

  return (
    <div className="space-y-5">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pesanan
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{order.customerName}</h1>
          <p className="mt-1 text-sm text-muted">
            {order.number} · {dateTime.format(new Date(order.createdAt))}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusChip label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
          <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <SectionTitle>Item</SectionTitle>
            <ul className="divide-y divide-line">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{i.name}</span>
                    <span className="block text-xs text-muted">
                      {i.qty} {i.unit} × {formatRupiah(i.price)}
                    </span>
                  </span>
                  <span className="font-semibold">{formatRupiah(i.qty * i.price)}</span>
                </li>
              ))}
            </ul>
            {order.note && <p className="mt-3 rounded-xl bg-canvas p-3 text-sm">Catatan: {order.note}</p>}
          </Card>

          <Card>
            <SectionTitle>Riwayat Pembayaran</SectionTitle>
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted">Belum ada pembayaran.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <span>
                      {paymentMethodLabel[p.method]}
                      <span className="block text-xs text-muted">{dateTime.format(new Date(p.at))}</span>
                    </span>
                    <span className="font-semibold">{formatRupiah(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <SectionTitle>Tagihan</SectionTitle>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total</dt>
                <dd className="font-semibold">{formatRupiah(order.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Dibayar</dt>
                <dd>{formatRupiah(order.paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Sisa</dt>
                <dd>{formatRupiah(remaining)}</dd>
              </div>
            </dl>

            {canPay && (
              <form onSubmit={submitPayment} className="mt-4 space-y-2" noValidate>
                <label className="block text-sm font-semibold" htmlFor="pay-amount">
                  Terima pembayaran
                </label>
                <input
                  id="pay-amount"
                  inputMode="numeric"
                  placeholder={`Maks. ${formatRupiah(remaining)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                />
                <select
                  aria-label="Metode bayar"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className={inputClass}
                >
                  {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button type="submit" className={`${primaryButton} flex-1`}>
                    Catat
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(String(remaining))}
                    className="h-11 rounded-full bg-canvas px-4 text-sm font-semibold hover:bg-line"
                  >
                    Lunasi
                  </button>
                </div>
                {error && (
                  <p role="alert" className="text-sm font-medium text-danger">
                    {error}
                  </p>
                )}
              </form>
            )}
          </Card>

          <Card>
            <SectionTitle>Status</SectionTitle>
            {transitions.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada perubahan status lanjutan.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {transitions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    className={
                      s === 'cancelled'
                        ? 'h-11 rounded-full border border-line text-sm font-semibold text-danger hover:bg-canvas'
                        : primaryButton
                    }
                  >
                    {actionLabel[s]}
                  </button>
                ))}
              </div>
            )}
            {order.status === 'ready' && (
              <a
                href={whatsappReadyUrl({
                  phone: order.customerPhone,
                  customer: order.customerName,
                  number: order.number,
                  remaining,
                  formattedRemaining: formatRupiah(remaining),
                })}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-lime text-sm font-bold text-sidebar"
              >
                <MessageCircle className="size-4" aria-hidden />
                Kabari via WhatsApp
              </a>
            )}
            {order.status === 'ready' && remaining > 0 && (
              <p className="mt-2 text-xs text-muted">Boleh diambil walau belum lunas. Sisa tetap tercatat.</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
