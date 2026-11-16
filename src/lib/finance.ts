// Periode dan ringkasan kas. Nilai di sini untuk tampilan. Setelah backend ada,
// angka laporan dihitung server (agregat), bukan dari data yang termuat di browser.

import type { PaymentMethod } from '@/lib/orders'

export type Period = 'today' | 'yesterday' | 'week' | 'month'

export const periodLabel: Record<Period, string> = {
  today: 'Hari ini',
  yesterday: 'Kemarin',
  week: 'Minggu ini',
  month: 'Bulan ini',
}

export interface Range {
  from: Date // termasuk
  to: Date // tidak termasuk
}

export interface CashEntry {
  id: string
  at: string
  direction: 'in' | 'out'
  amount: number
  method: PaymentMethod
  category: string
  description: string
  /** Kas yang dicatat manual oleh owner, bukan hasil pembayaran atau pengeluaran. */
  manual?: boolean
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/**
 * Rentang periode. "Minggu ini" = Senin sampai Minggu kalender.
 * "Bulan ini" = tanggal 1 sampai akhir bulan (bukan 30 hari berjalan).
 */
export function periodRange(period: Period, now: Date = new Date()): Range {
  const today = startOfDay(now)
  switch (period) {
    case 'today':
      return { from: today, to: addDays(today, 1) }
    case 'yesterday':
      return { from: addDays(today, -1), to: today }
    case 'week': {
      const sinceMonday = (today.getDay() + 6) % 7
      const monday = addDays(today, -sinceMonday)
      return { from: monday, to: addDays(monday, 7) }
    }
    case 'month':
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      }
  }
}

export function inRange(iso: string, range: Range): boolean {
  const t = new Date(iso).getTime()
  return t >= range.from.getTime() && t < range.to.getTime()
}

export interface CashSummary {
  in: number
  out: number
  byMethod: Record<PaymentMethod, { in: number; out: number }>
}

/** Kategori saldo pembuka. Dihitung dalam saldo, tetapi bukan pemasukan operasional. */
export const OPENING_CATEGORY = 'Saldo Awal'

/** Ringkasan operasional periode. Saldo pembuka tidak dihitung sebagai masuk. */
export function summarize(entries: CashEntry[]): CashSummary {
  const result: CashSummary = {
    in: 0,
    out: 0,
    byMethod: {
      cash: { in: 0, out: 0 },
      transfer: { in: 0, out: 0 },
      qris: { in: 0, out: 0 },
    },
  }
  for (const e of entries) {
    if (e.category === OPENING_CATEGORY) continue
    result[e.direction] += e.amount
    result.byMethod[e.method][e.direction] += e.amount
  }
  return result
}

/** Saldo = total masuk dikurangi total keluar sepanjang waktu. */
export function balance(entries: CashEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount), 0)
}
