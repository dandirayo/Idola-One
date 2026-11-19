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

/** Pilihan periode di layar: periode tetap, rentang tanggal bebas, atau semua (khusus daftar). */
export type PeriodChoice = Period | 'custom' | 'all'

export interface PeriodState {
  choice: PeriodChoice
  /** Tanggal awal dan akhir rentang bebas, format yyyy-mm-dd, keduanya termasuk. */
  from: string
  to: string
}

const parseDay = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

export const toDayInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Rentang tanggal bebas (termasuk kedua ujung). Urutan terbalik ditukar. Tanggal tidak valid: null. */
export function dayRange(from: string, to: string): Range | null {
  const a = parseDay(from)
  const b = parseDay(to)
  if (!a || !b) return null
  const [start, end] = a <= b ? [a, b] : [b, a]
  return { from: start, to: addDays(end, 1) }
}

/** null berarti tanpa batas (semua tanggal). */
export function choiceRange(state: PeriodState, now: Date = new Date()): Range | null {
  if (state.choice === 'all') return null
  if (state.choice === 'custom') return dayRange(state.from, state.to) ?? periodRange('today', now)
  return periodRange(state.choice, now)
}

const shortDay = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export function choiceLabel(state: PeriodState): string {
  if (state.choice === 'all') return 'Semua tanggal'
  if (state.choice === 'custom') {
    const r = dayRange(state.from, state.to)
    if (!r) return 'Rentang tanggal'
    const last = addDays(r.to, -1)
    return r.from.getTime() === last.getTime() ? shortDay.format(r.from) : `${shortDay.format(r.from)} – ${shortDay.format(last)}`
  }
  return periodLabel[state.choice]
}

export function initialPeriod(choice: PeriodChoice, now: Date = new Date()): PeriodState {
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  return { choice, from: toDayInput(first), to: toDayInput(now) }
}

export function inRangeOrAll(iso: string, range: Range | null): boolean {
  return range === null || inRange(iso, range)
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
