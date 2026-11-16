// Angka Beranda dihitung dari data yang termuat. Setelah backend ada, angka ini
// harus berasal dari agregat server (RPT-03), bukan dari daftar yang termuat.

import { inRange, periodRange, summarize, type CashEntry } from '@/lib/finance'
import type { OrderStatus } from '@/lib/orders'

export interface OrderLike {
  createdAt: string
  status: OrderStatus
  total: number
  paid: number
}

export interface StockLike {
  stock: number
  min: number
}

export const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/** Jumlah pesanan masuk per hari pada minggu kalender (Senin sampai Minggu) yang memuat `now`. */
export function weeklyOrderCounts(orders: OrderLike[], now: Date = new Date()): { day: string; count: number }[] {
  const { from } = periodRange('week', now)
  return dayLabels.map((day, i) => {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)
    const end = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i + 1)
    const count = orders.filter((o) => inRange(o.createdAt, { from: start, to: end })).length
    return { day, count }
  })
}

/** Perubahan jumlah pesanan minggu ini dibanding minggu lalu, dalam persen. Null bila minggu lalu kosong. */
export function weekOverWeekChange(orders: OrderLike[], now: Date = new Date()): number | null {
  const thisWeek = weeklyOrderCounts(orders, now).reduce((sum, d) => sum + d.count, 0)
  const lastWeekDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  const lastWeek = weeklyOrderCounts(orders, lastWeekDate).reduce((sum, d) => sum + d.count, 0)
  if (lastWeek === 0) return null
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
}

export interface Kpis {
  ordersToday: number
  newOrders: number
  incomeThisMonth: number
  unpaidCount: number
  unpaidTotal: number
  lowStock: number
}

export function computeKpis(orders: OrderLike[], cash: CashEntry[], stock: StockLike[], now: Date = new Date()): Kpis {
  const today = periodRange('today', now)
  const month = periodRange('month', now)
  const open = orders.filter((o) => o.status !== 'cancelled')
  const unpaid = open.filter((o) => o.total - o.paid > 0)
  return {
    ordersToday: orders.filter((o) => inRange(o.createdAt, today)).length,
    newOrders: orders.filter((o) => o.status === 'received').length,
    incomeThisMonth: summarize(cash.filter((e) => inRange(e.at, month))).in,
    unpaidCount: unpaid.length,
    unpaidTotal: unpaid.reduce((sum, o) => sum + (o.total - o.paid), 0),
    lowStock: stock.filter((i) => i.stock <= i.min).length,
  }
}

/** Perkiraan kemajuan untuk cincin progres. Bukan data dari server. */
export const orderProgress: Record<OrderStatus, number> = {
  received: 20,
  processing: 55,
  ready: 100,
  picked_up: 100,
  cancelled: 0,
}
