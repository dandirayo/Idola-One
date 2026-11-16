import { describe, expect, it } from 'vitest'
import type { CashEntry } from './finance'
import { computeKpis, weekOverWeekChange, weeklyOrderCounts, type OrderLike } from './dashboard'

// Rabu, 18 November 2026 (lokal). Minggu ini: Senin 16 sampai Minggu 22 November.
const now = new Date(2026, 10, 18, 12)

const order = (y: number, m: number, d: number, extra: Partial<OrderLike> = {}): OrderLike => ({
  createdAt: new Date(y, m, d, 9).toISOString(),
  status: 'received',
  total: 30000,
  paid: 0,
  ...extra,
})

describe('weeklyOrderCounts', () => {
  it('mengelompokkan per hari Senin sampai Minggu', () => {
    const orders = [order(2026, 10, 16), order(2026, 10, 16), order(2026, 10, 18), order(2026, 10, 22)]
    const counts = weeklyOrderCounts(orders, now)
    expect(counts.map((c) => c.day)).toEqual(['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'])
    expect(counts.map((c) => c.count)).toEqual([2, 0, 1, 0, 0, 0, 1])
  })

  it('mengabaikan pesanan di luar minggu itu', () => {
    const counts = weeklyOrderCounts([order(2026, 10, 15), order(2026, 10, 23)], now)
    expect(counts.reduce((s, c) => s + c.count, 0)).toBe(0)
  })
})

describe('weekOverWeekChange', () => {
  it('menghitung persen perubahan terhadap minggu lalu', () => {
    const orders = [order(2026, 10, 16), order(2026, 10, 17), order(2026, 10, 18), order(2026, 10, 10), order(2026, 10, 11)]
    // minggu ini 3, minggu lalu 2 => +50%
    expect(weekOverWeekChange(orders, now)).toBe(50)
  })

  it('null bila minggu lalu tidak ada pesanan', () => {
    expect(weekOverWeekChange([order(2026, 10, 16)], now)).toBeNull()
  })
})

describe('computeKpis', () => {
  const cash: CashEntry[] = [
    { id: 'a', at: new Date(2026, 10, 2, 9).toISOString(), direction: 'in', amount: 50000, method: 'cash', category: 'Pembayaran', description: '' },
    { id: 'b', at: new Date(2026, 9, 30, 9).toISOString(), direction: 'in', amount: 99999, method: 'cash', category: 'Pembayaran', description: '' },
    { id: 'o', at: new Date(2026, 10, 1, 8).toISOString(), direction: 'in', amount: 500000, method: 'cash', category: 'Saldo Awal', description: '' },
    { id: 'c', at: new Date(2026, 10, 3, 9).toISOString(), direction: 'out', amount: 20000, method: 'cash', category: 'Stok', description: '' },
  ]

  it('menghitung KPI utama', () => {
    const orders = [
      order(2026, 10, 18, { status: 'received', total: 30000, paid: 10000 }),
      order(2026, 10, 18, { status: 'ready', total: 20000, paid: 20000 }),
      order(2026, 10, 17, { status: 'cancelled', total: 40000, paid: 0 }),
    ]
    const k = computeKpis(orders, cash, [{ stock: 1, min: 2 }, { stock: 10, min: 2 }], now)
    expect(k.ordersToday).toBe(2)
    expect(k.newOrders).toBe(1)
    expect(k.incomeThisMonth).toBe(50000) // hanya bulan November, tanpa saldo awal dan pengeluaran
    expect(k.unpaidCount).toBe(1) // pesanan batal tidak ditagih
    expect(k.unpaidTotal).toBe(20000)
    expect(k.lowStock).toBe(1)
  })
})
