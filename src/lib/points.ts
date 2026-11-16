// Poin pelanggan: 1 poin per Rp10.000 pada pesanan berpelanggan yang lunas (CUS-04).
// Poin diturunkan dari pesanan, tidak pernah diedit langsung, dan satu pesanan
// paling banyak menghasilkan satu kelompok poin.

import type { OrderStatus } from '@/lib/orders'

export const POINT_STEP = 10000

export interface PointOrder {
  number: string
  customerId: string
  createdAt: string
  status: OrderStatus
  total: number
  paid: number
  payments: { at: string }[]
}

export interface PointEvent {
  orderNumber: string
  at: string
  points: number
}

/** Poin satu pesanan. Hanya pesanan lunas yang tidak dibatalkan. */
export function pointsForOrder(o: Pick<PointOrder, 'status' | 'total' | 'paid'>): number {
  if (o.status === 'cancelled' || o.total <= 0 || o.paid < o.total) return 0
  return Math.floor(o.total / POINT_STEP)
}

/** Saldo dan riwayat poin satu pelanggan, terbaru di atas. */
export function customerPoints(orders: PointOrder[], customerId: string): { balance: number; events: PointEvent[] } {
  const events: PointEvent[] = []
  for (const o of orders) {
    if (o.customerId !== customerId) continue
    const points = pointsForOrder(o)
    if (points <= 0) continue
    const lastPay = o.payments.map((p) => p.at).sort().at(-1)
    events.push({ orderNumber: o.number, at: lastPay ?? o.createdAt, points })
  }
  events.sort((a, b) => b.at.localeCompare(a.at))
  return { balance: events.reduce((sum, e) => sum + e.points, 0), events }
}
