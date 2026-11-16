// Aturan bisnis pesanan di sisi tampilan. Nilai di sini hanya PERKIRAAN.
// Setelah backend ada, total, nomor nota, dan status final selalu dari server.

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

/** Berat atau jumlah dalam sepersepuluh (0,1 kg atau 0,1 pcs) sebagai bilangan bulat. */
const toTenths = (qty: number): number => Math.round(qty * 10)

/**
 * Jumlah semua baris dalam sepersepuluh Rupiah (bilangan bulat). Semua hitungan
 * uang memakai bilangan bulat agar tidak terkena galat desimal, misalnya
 * 34,2 x 12.500 pada desimal menghasilkan 427500.00000000006 dan membuat
 * pembulatan ke atas naik Rp1.000 secara keliru.
 *
 * Bila total berat kiloan kurang dari 3 kg dan minimum tidak dilewati,
 * selisihnya ditagihkan pada baris kiloan pertama.
 */
function sumInTenthRupiah(lines: LineInput[], skipMinKg: boolean): number {
  const kgTenths = lines.filter((l) => l.unit === 'kg' && l.qty > 0).reduce((sum, l) => sum + toTenths(l.qty), 0)
  const minTenths = MIN_KG * 10
  const shortfall = !skipMinKg && kgTenths > 0 && kgTenths < minTenths ? minTenths - kgTenths : 0

  let extraApplied = false
  let sum = 0
  for (const l of lines) {
    if (l.qty <= 0) continue
    let tenths = toTenths(l.qty)
    if (l.unit === 'kg' && shortfall > 0 && !extraApplied) {
      tenths += shortfall
      extraApplied = true
    }
    sum += tenths * l.price
  }
  return sum
}

/** Nilai satu baris (jumlah x harga) dalam Rupiah utuh, bebas galat desimal. */
export function lineAmount(qty: number, price: number): number {
  return Math.round((toTenths(qty) * price) / 10)
}

/** Subtotal semua baris dalam Rupiah utuh, sebelum pembulatan ke atas. */
export function subtotal(lines: LineInput[], skipMinKg = false): number {
  return Math.round(sumInTenthRupiah(lines, skipMinKg) / 10)
}

/** Total akhir: dibulatkan ke atas ke kelipatan Rp1.000 (dihitung dari jumlah bilangan bulat). */
export function orderTotal(lines: LineInput[], skipMinKg = false): number {
  return Math.ceil(sumInTenthRupiah(lines, skipMinKg) / 10000) * 1000
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
