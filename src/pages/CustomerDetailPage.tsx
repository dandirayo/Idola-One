import { ArrowLeft, MessageCircle, Star } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Card, orderStatusTone, paymentTone, SectionTitle, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import { orderStatusLabel, paymentStatus, paymentStatusLabel } from '@/lib/orders'
import { customerPoints, POINT_STEP } from '@/lib/points'
import { whatsappUrl } from '@/lib/reports'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export function CustomerDetailPage() {
  const { customerId } = useParams()
  const customer = useStore((s) => s.customers).find((c) => c.id === customerId)
  const allOrders = useStore((s) => s.orders)

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          <ArrowLeft className="size-4" aria-hidden /> Pelanggan
        </Link>
        <Card>
          <p className="font-semibold">Pelanggan tidak ditemukan.</p>
        </Card>
      </div>
    )
  }

  const orders = allOrders.filter((o) => o.customerId === customer.id)
  const points = customerPoints(allOrders, customer.id)
  const outstanding = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Math.max(0, o.total - o.paid), 0)

  return (
    <div className="space-y-5">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Pelanggan
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{customer.name}</h1>
          <p className="mt-1 text-sm text-muted">{customer.phone}</p>
        </div>
        <a
          href={whatsappUrl(customer.phone, `Halo ${customer.name}, `)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-sidebar"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Jumlah pesanan</p>
          <p className="mt-1 text-xl font-bold">{orders.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted">Sisa tagihan</p>
          <p className="mt-1 text-xl font-bold">{formatRupiah(outstanding)}</p>
        </Card>
        <Card className="bg-sidebar p-4 text-white">
          <p className="flex items-center gap-1 text-xs font-semibold text-lime">
            <Star className="size-3.5" aria-hidden /> Poin
          </p>
          <p className="mt-1 text-xl font-bold">{points.balance}</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>Riwayat poin</SectionTitle>
          <p className="mb-3 text-xs text-muted">
            1 poin untuk setiap {formatRupiah(POINT_STEP)} pada pesanan yang lunas. Poin dihitung otomatis dari pesanan dan tidak bisa diedit.
          </p>
          {points.events.length === 0 ? (
            <p className="text-sm text-muted">Belum ada poin.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {points.events.map((e) => (
                <li key={e.orderNumber} className="flex justify-between rounded-xl bg-canvas px-3 py-2">
                  <span>
                    {e.orderNumber}
                    <span className="block text-xs text-muted">{dateTime.format(new Date(e.at))}</span>
                  </span>
                  <span className="font-semibold text-success">+{e.points}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle>Pesanan</SectionTitle>
          {orders.length === 0 ? (
            <p className="text-sm text-muted">Belum ada pesanan.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {orders.map((o) => {
                const pay = paymentStatus(o.total, o.paid)
                return (
                  <li key={o.id}>
                    <Link to={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2 hover:bg-line">
                      <span>
                        {o.number}
                        <span className="block text-xs text-muted">{formatRupiah(o.total)}</span>
                      </span>
                      <span className="flex gap-1.5">
                        <StatusChip label={orderStatusLabel[o.status]} tone={orderStatusTone[o.status]} />
                        <StatusChip label={paymentStatusLabel[pay]} tone={paymentTone[pay]} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
