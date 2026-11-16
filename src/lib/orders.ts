// Aturan bisnis pesanan di sisi tampilan. Nilai di sini hanya PERKIRAAN.
// Setelah backend ada, total, nomor nota, dan status final selalu dari server.

import { roundUpToThousand } from '@/lib/format'

export type Unit = 'kg' | 'pcs'
export type OrderStatus = 'received' | 'processing' | 'ready' | 'picked_up' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid'
export type PaymentMethod = 'cash' | 'transfer' | 'qris'

export interface LineInput {
  unit: Unit
  qty: number
  price: number
}

export const MIN_KG = 3

export const orderStatusLabel: Record<OrderStatus, string> = {
  received: 'Diterima',
  processing: 'Diproses',
  ready: 'Siap Diambil',
  picked_up: 'Diambil',
  cancelled: 'Dibatalkan',
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: 'Belum Bayar',
  partial: 'DP',
  paid: 'Lunas',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
}

/**
 * Subtotal semua baris. Bila total berat kiloan kurang dari 3 kg dan minimum
 * tidak dilewati, selisihnya ditagihkan pada baris kiloan pertama.
 */
export function subtotal(lines: LineInput[], skipMinKg = false): number {
  const kgLines = lines.filter((l) => l.unit === 'kg' && l.qty > 0)
  const totalKg = kgLines.reduce((sum, l) => sum + l.qty, 0)
  const shortfall = !skipMinKg && totalKg > 0 && totalKg < MIN_KG ? MIN_KG - totalKg : 0

  let extraApplied = false
  return lines.reduce((sum, l) => {
    if (l.qty <= 0) return sum
    let qty = l.qty
    if (l.unit === 'kg' && shortfall > 0 && !extraApplied) {
      qty += shortfall
      extraApplied = true
    }
    return sum + qty * l.price
  }, 0)
}

/** Total akhir: subtotal dibulatkan ke atas ke kelipatan Rp1.000. */
export function orderTotal(lines: LineInput[], skipMinKg = false): number {
  return roundUpToThousand(subtotal(lines, skipMinKg))
}

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'unpaid'
  if (paid >= total) return 'paid'
  return 'partial'
}

/** Transisi status yang diizinkan. Pengambilan boleh walau belum lunas. */
export function nextStatuses(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'received':
      return ['processing', 'cancelled']
    case 'processing':
      return ['ready', 'cancelled']
    case 'ready':
      return ['picked_up']
    default:
      return []
  }
}

/** Nomor telepon Indonesia ke format internasional tanpa plus, untuk tautan WhatsApp. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return `62${digits}`
}

export function whatsappReadyUrl(opts: {
  phone: string
  customer: string
  number: string
  remaining: number
  formattedRemaining: string
}): string {
  const tail =
    opts.remaining > 0 ? ` Sisa tagihan ${opts.formattedRemaining}.` : ' Pembayaran sudah lunas.'
  const text = `Halo ${opts.customer}, cucian Anda (nota ${opts.number}) sudah siap diambil.${tail} Terima kasih.`
  return `https://wa.me/${normalizePhone(opts.phone)}?text=${encodeURIComponent(text)}`
}
