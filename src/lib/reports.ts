// Perhitungan laporan dari data yang termuat. Setelah backend ada, angka laporan
// harus berasal dari agregat server (RPT-03), bukan dari daftar yang termuat.

import { inRange, summarize, OPENING_CATEGORY, type CashEntry, type Range } from '@/lib/finance'
import { formatRupiah } from '@/lib/format'
import { lineAmount, normalizePhone, type OrderStatus, type PaymentMethod, type Unit } from '@/lib/orders'

export interface ReportOrder {
  number: string
  customerName: string
  createdAt: string
  status: OrderStatus
  total: number
  paid: number
  items: { name: string; unit: Unit; qty: number; price: number }[]
  payments: { id: string; amount: number; method: PaymentMethod; at: string }[]
}

const emptyStatus = (): Record<OrderStatus, number> => ({
  received: 0,
  processing: 0,
  ready: 0,
  picked_up: 0,
  cancelled: 0,
})

export interface ServiceRow {
  name: string
  unit: Unit
  qty: number
  value: number
}

export interface OrderReport {
  count: number // tidak termasuk yang dibatalkan
  value: number
  kg: number
  pcs: number
  outstanding: number
  byStatus: Record<OrderStatus, number>
  byService: ServiceRow[]
}

/** Laporan pesanan yang dibuat pada rentang. Pesanan batal tidak dihitung ke nilai dan volume. */
export function orderReport(orders: ReportOrder[], range: Range): OrderReport {
  const inPeriod = orders.filter((o) => inRange(o.createdAt, range))
  const report: OrderReport = {
    count: 0,
    value: 0,
    kg: 0,
    pcs: 0,
    outstanding: 0,
    byStatus: emptyStatus(),
    byService: [],
  }
  const services = new Map<string, ServiceRow>()

  for (const o of inPeriod) {
    report.byStatus[o.status] += 1
    if (o.status === 'cancelled') continue
    report.count += 1
    report.value += o.total
    report.outstanding += Math.max(0, o.total - o.paid)
    for (const i of o.items) {
      if (i.unit === 'kg') report.kg += i.qty
      else report.pcs += i.qty
      const key = `${i.unit}:${i.name}`
      const row = services.get(key) ?? { name: i.name, unit: i.unit, qty: 0, value: 0 }
      row.qty += i.qty
      row.value += lineAmount(i.qty, i.price)
      services.set(key, row)
    }
  }
  report.byService = [...services.values()].sort((a, b) => b.value - a.value)
  return report
}

export interface CategoryRow {
  category: string
  in: number
  out: number
}

export interface CashReport {
  in: number
  out: number
  net: number
  count: number
  byMethod: ReturnType<typeof summarize>['byMethod']
  byCategory: CategoryRow[]
  /** Transaksi terbesar pada periode, terpisah untuk masuk dan keluar (paling banyak TOP_ENTRIES). */
  topIn: CashEntry[]
  topOut: CashEntry[]
}

export const TOP_ENTRIES = 5

function largest(entries: CashEntry[], direction: 'in' | 'out'): CashEntry[] {
  return entries
    .filter((e) => e.direction === direction)
    .sort((a, b) => b.amount - a.amount || b.at.localeCompare(a.at))
    .slice(0, TOP_ENTRIES)
}

/** Laporan keuangan periode. Saldo pembuka tidak dihitung sebagai pemasukan. */
export function cashReport(entries: CashEntry[], range: Range): CashReport {
  const inPeriod = entries.filter((e) => inRange(e.at, range) && e.category !== OPENING_CATEGORY)
  const s = summarize(inPeriod)
  const categories = new Map<string, CategoryRow>()
  for (const e of inPeriod) {
    const row = categories.get(e.category) ?? { category: e.category, in: 0, out: 0 }
    row[e.direction] += e.amount
    categories.set(e.category, row)
  }
  return {
    in: s.in,
    out: s.out,
    net: s.in - s.out,
    count: inPeriod.length,
    byMethod: s.byMethod,
    byCategory: [...categories.values()].sort((a, b) => b.in + b.out - (a.in + a.out)),
    topIn: largest(inPeriod, 'in'),
    topOut: largest(inPeriod, 'out'),
  }
}

export interface PaymentReport {
  total: number
  count: number
  orders: number
  byMethod: Record<PaymentMethod, number>
  /** Nota dengan pembayaran Tunai dan Transfer pada periode. Sudah termasuk di Tunai dan Transfer. */
  hybrid: number
}

/**
 * Pembayaran pelanggan pada periode (bukan kas manual atau pengeluaran).
 * Total adalah jumlah pembayaran, bukan nilai nota. Hybrid hanya penanda dan
 * tidak dijumlahkan lagi.
 */
export function paymentReport(orders: ReportOrder[], range: Range): PaymentReport {
  const report: PaymentReport = {
    total: 0,
    count: 0,
    orders: 0,
    byMethod: { cash: 0, transfer: 0, qris: 0 },
    hybrid: 0,
  }
  for (const o of orders) {
    const paid = o.payments.filter((p) => inRange(p.at, range))
    if (paid.length === 0) continue
    report.orders += 1
    for (const p of paid) {
      report.total += p.amount
      report.count += 1
      report.byMethod[p.method] += p.amount
    }
    if (paid.some((p) => p.method === 'cash') && paid.some((p) => p.method === 'transfer')) {
      report.hybrid += 1
    }
  }
  return report
}

/**
 * CSV dengan pengutipan standar. Sel teks yang diawali karakter rumus (= + - @)
 * diberi awalan apostrof agar tidak dijalankan sebagai rumus saat dibuka di
 * spreadsheet. Angka ditulis apa adanya.
 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number): string => {
    if (typeof v === 'number') return String(v)
    let t = v
    if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
    return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export function ordersCsv(orders: ReportOrder[]): string {
  const header = ['Nomor', 'Tanggal', 'Pelanggan', 'Status', 'Total', 'Dibayar', 'Sisa']
  const rows = orders.map((o) => [
    o.number,
    o.createdAt,
    o.customerName,
    o.status,
    o.total,
    o.paid,
    Math.max(0, o.total - o.paid),
  ])
  return toCsv([header, ...rows])
}

export function cashCsv(entries: CashEntry[]): string {
  const header = ['Tanggal', 'Arah', 'Kategori', 'Deskripsi', 'Metode', 'Nominal']
  const rows = entries.map((e) => [e.at, e.direction === 'in' ? 'Masuk' : 'Keluar', e.category, e.description, e.method, e.amount])
  return toCsv([header, ...rows])
}

/** Draf pesan WhatsApp untuk laporan pembayaran periode. Hybrid hanya keterangan tambahan. */
export function paymentReportMessage(report: PaymentReport, periodLabel: string, sender: string): string {
  const lines = [
    `Laporan Pembayaran - ${periodLabel}`,
    `Dari: ${sender}`,
    '',
    `Tunai: ${formatRupiah(report.byMethod.cash)}`,
    `Transfer: ${formatRupiah(report.byMethod.transfer)}`,
    `QRIS: ${formatRupiah(report.byMethod.qris)}`,
    `Total: ${formatRupiah(report.total)} (${report.count} pembayaran, ${report.orders} nota)`,
  ]
  if (report.hybrid > 0) {
    lines.push(`Hybrid: ${report.hybrid} nota (sudah termasuk di Tunai dan Transfer)`)
  }
  return lines.join('\n')
}

/** Tautan WhatsApp. Bila nomor penerima tidak ada atau terlalu pendek, pengguna memilih chat sendiri. */
export function whatsappUrl(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, '')
  const target = digits.length >= 9 ? normalizePhone(digits) : ''
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`
}
