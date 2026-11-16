// Gaji mingguan dan insentif per item (PAYR-01, PAYR-02, ORD-09).

import { dateKey } from '@/lib/shifts'

/** Nilai insentif per pcs yang boleh dipilih pada item satuan tertentu (sepatu, helm, tas). */
export const INCENTIVE_OPTIONS = [0, 10000, 15000, 20000] as const

export function isValidIncentive(perUnit: number): boolean {
  return (INCENTIVE_OPTIONS as readonly number[]).includes(perUnit)
}

/** Total hak insentif satu item: jumlah pcs dikali nilai per pcs. */
export function incentiveAmount(qty: number, perUnit: number): number {
  return Math.round(qty) * perUnit
}

/** Tanggal Senin (YYYY-MM-DD) dari minggu yang memuat tanggal itu. */
export function weekStartKey(date: Date): string {
  const sinceMonday = (date.getDay() + 6) % 7
  return dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday))
}

export function weekRangeLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(y, m - 1, d + 6)
  const f = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
  return `${f.format(start)} – ${f.format(end)}`
}
