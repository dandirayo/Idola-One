// Perhitungan POS minuman. Semua uang memakai bilangan bulat Rupiah.

import { inRange, type Range } from '@/lib/finance'
import type { PaymentMethod } from '@/lib/orders'

export interface CartLine {
  productId: string
  name: string
  price: number
  qty: number
}

export interface SaleLike {
  number: string
  at: string
  total: number
  method: PaymentMethod
  items: CartLine[]
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0)
}

/** Memvalidasi keranjang: tidak kosong, jumlah bilangan bulat positif, harga bilangan bulat positif. */
export function validateCart(lines: CartLine[]): string | null {
  if (lines.length === 0) return 'Keranjang masih kosong.'
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty <= 0) return `Jumlah ${l.name} harus bilangan bulat lebih dari nol.`
    if (!Number.isInteger(l.price) || l.price <= 0) return `Harga ${l.name} tidak valid.`
  }
  return null
}

/** Nomor transaksi berikutnya pada tanggal itu: POS-YYYYMMDD-0001, urutan tertinggi ditambah satu. */
export function nextSaleNumber(existing: { number: string }[], date: Date): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  const prefix = `POS-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-`
  let max = 0
  for (const s of existing) {
    if (!s.number.startsWith(prefix)) continue
    const seq = Number(s.number.slice(prefix.length))
    if (Number.isInteger(seq) && seq > max) max = seq
  }
  return `${prefix}${pad(max + 1, 4)}`
}

export interface SalesSummary {
  total: number
  count: number
  byMethod: Record<PaymentMethod, number>
  /** Produk terlaris menurut jumlah terjual. */
  top: { name: string; qty: number }[]
}

export function summarizeSales(sales: SaleLike[], range: Range): SalesSummary {
  const result: SalesSummary = { total: 0, count: 0, byMethod: { cash: 0, transfer: 0, qris: 0 }, top: [] }
  const products = new Map<string, number>()
  for (const s of sales) {
    if (!inRange(s.at, range)) continue
    result.total += s.total
    result.count += 1
    result.byMethod[s.method] += s.total
    for (const l of s.items) products.set(l.name, (products.get(l.name) ?? 0) + l.qty)
  }
  result.top = [...products.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty)
  return result
}
