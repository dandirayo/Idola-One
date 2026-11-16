// POS minuman: produk, hari berjualan, dan penjualan.
// Penjualan POS dipisah dari Buku Kas laundry (jangan mencampur omzet antar usaha).

import { cartTotal, nextSaleNumber, validateCart, type CartLine } from '@/lib/pos'
import type { PaymentMethod } from '@/lib/orders'
import { dateKey } from '@/lib/shifts'
import { getState, uid, update, type PosProduct, type PosSale } from './store'

function requireBeverageBusiness(businessId: string) {
  const b = getState().businesses.find((x) => x.id === businessId)
  if (!b || b.kind !== 'beverage') throw new Error('Usaha minuman tidak ditemukan.')
  if (!b.active) throw new Error('Usaha ini nonaktif.')
  return b
}

function validateProduct(name: string, price: number) {
  const clean = name.trim()
  if (!clean) throw new Error('Nama produk wajib diisi.')
  if (!Number.isInteger(price) || price <= 0) throw new Error('Harga harus bilangan bulat lebih dari nol.')
  return { name: clean, price }
}

export function addPosProduct(businessId: string, name: string, price: number): PosProduct {
  requireBeverageBusiness(businessId)
  const valid = validateProduct(name, price)
  const siblings = getState().posProducts.filter((p) => p.businessId === businessId)
  const sort = siblings.reduce((max, p) => Math.max(max, p.sort), 0) + 1
  const product: PosProduct = { id: uid('pp'), businessId, ...valid, active: true, sort }
  update((s) => ({ ...s, posProducts: [...s.posProducts, product] }))
  return product
}

/** Harga baru tidak mengubah penjualan lama: nama dan harga disalin ke item saat dijual. */
export function updatePosProduct(id: string, name: string, price: number) {
  const valid = validateProduct(name, price)
  if (!getState().posProducts.some((p) => p.id === id)) throw new Error('Produk tidak ditemukan.')
  update((s) => ({ ...s, posProducts: s.posProducts.map((p) => (p.id === id ? { ...p, ...valid } : p)) }))
}

export function setPosProductActive(id: string, active: boolean) {
  update((s) => ({ ...s, posProducts: s.posProducts.map((p) => (p.id === id ? { ...p, active } : p)) }))
}

/** Menukar urutan tampil dengan produk di atas atau di bawahnya pada usaha yang sama. */
export function movePosProduct(id: string, direction: 'up' | 'down') {
  const products = [...getState().posProducts].filter((p) => p.businessId === getState().posProducts.find((x) => x.id === id)?.businessId).sort((a, b) => a.sort - b.sort)
  const idx = products.findIndex((p) => p.id === id)
  const other = products[direction === 'up' ? idx - 1 : idx + 1]
  if (idx < 0 || !other) return
  const a = products[idx]
  update((s) => ({
    ...s,
    posProducts: s.posProducts.map((p) => (p.id === a.id ? { ...p, sort: other.sort } : p.id === other.id ? { ...p, sort: a.sort } : p)),
  }))
}

export function posDayFor(businessId: string, now: Date = new Date()) {
  const key = dateKey(now)
  return getState().posDays.find((d) => d.businessId === businessId && d.date === key)
}

/** Menandai hari ini berjualan atau tidak. Satu catatan per usaha per tanggal. */
export function setPosDay(businessId: string, open: boolean, note: string, now: Date = new Date()) {
  requireBeverageBusiness(businessId)
  const key = dateKey(now)
  update((s) => {
    const exists = s.posDays.some((d) => d.businessId === businessId && d.date === key)
    return {
      ...s,
      posDays: exists
        ? s.posDays.map((d) => (d.businessId === businessId && d.date === key ? { ...d, open, note: note.trim() } : d))
        : [...s.posDays, { businessId, date: key, open, note: note.trim() }],
    }
  })
}

/**
 * Checkout kasir. Nama dan harga selalu diambil dari katalog saat ini (bukan dari
 * isian pemanggil), lalu disalin ke item penjualan. Hari ini harus sudah dibuka.
 */
export function createPosSale(
  businessId: string,
  lines: { productId: string; qty: number }[],
  method: PaymentMethod,
  now: Date = new Date(),
): PosSale {
  requireBeverageBusiness(businessId)
  if (!posDayFor(businessId, now)?.open) throw new Error('Aktifkan jualan hari ini dulu.')
  const s0 = getState()
  const cart: CartLine[] = lines.map((l) => {
    const p = s0.posProducts.find((x) => x.id === l.productId)
    if (!p || p.businessId !== businessId) throw new Error('Produk tidak ditemukan.')
    if (!p.active) throw new Error(`${p.name} sedang nonaktif.`)
    return { productId: p.id, name: p.name, price: p.price, qty: l.qty }
  })
  const err = validateCart(cart)
  if (err) throw new Error(err)
  const sale: PosSale = {
    id: uid('ps'),
    businessId,
    number: nextSaleNumber(s0.posSales, now),
    at: now.toISOString(),
    method,
    total: cartTotal(cart),
    items: cart,
  }
  update((s) => ({ ...s, posSales: [sale, ...s.posSales] }))
  return sale
}
