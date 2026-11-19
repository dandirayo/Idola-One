// Susunan dokumen cetak (nota, label cucian, bukti pengambilan) sebagai baris teks.
// Lebar kolom mengikuti aplikasi Android: 32 kolom untuk kertas 58 mm dan 48 kolom
// untuk 80 mm. Baris yang sama nanti dapat dikirim sebagai ESC/POS bila jalur
// cetak langsung ke printer dipilih (lihat docs/04-BACKEND.md bagian 6).

import { formatQty, formatRupiah } from '@/lib/format'
import { lineAmount, paymentStatus, paymentStatusLabel, subtotal, type Unit } from '@/lib/orders'

export type PaperWidth = 58 | 80
export type DocKind = 'receipt' | 'label' | 'pickup'

export const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 }

export const docKindLabel: Record<DocKind, string> = {
  receipt: 'Nota Pelanggan',
  label: 'Label Cucian',
  pickup: 'Tanda Terima',
}

/** Nama merek di kepala nota, sama dengan aplikasi Android. */
export const BRAND = 'IDOLA LAUNDRY'

export interface ShopInfo {
  name: string
  phone: string
  /** Nomor WhatsApp owner: penerima laporan pembayaran. Kosong: memakai telepon toko. */
  ownerPhone?: string
  address: string
  footer: string
  paperWidth: PaperWidth
}

export interface ReceiptOrder {
  number: string
  customerName: string
  createdAt: string
  items: { name: string; unit: Unit; qty: number; price: number }[]
  total: number
  paid: number
  note: string
  skipMinKg: boolean
  /** Nama pembuat pesanan (baris Kasir). */
  cashier?: string
}

export interface Line {
  text: string
  large?: boolean
  bold?: boolean
  center?: boolean
  /** Baris khusus: logo toko (gambar), hanya di kepala nota. */
  logo?: boolean
}

const dateTimeFormat = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Memecah teks per kata agar tidak melebihi lebar kolom. Kata yang lebih panjang dipotong. */
export function wrap(text: string, cols: number): string[] {
  const out: string[] = []
  let current = ''
  for (const raw of text.trim().split(/\s+/)) {
    let word = raw
    while (word.length > cols) {
      if (current) {
        out.push(current)
        current = ''
      }
      out.push(word.slice(0, cols))
      word = word.slice(cols)
    }
    if (!word) continue
    if (!current) current = word
    else if (current.length + 1 + word.length <= cols) current += ` ${word}`
    else {
      out.push(current)
      current = word
    }
  }
  if (current) out.push(current)
  return out
}

/** Satu baris dengan teks kiri dan kanan. Teks kiri dipotong bila terlalu panjang. */
export function padLine(left: string, right: string, cols: number): string {
  const room = cols - right.length - 1
  const l = left.length > room ? left.slice(0, Math.max(0, room)) : left
  return l + ' '.repeat(Math.max(1, cols - l.length - right.length)) + right
}

const dashes = (cols: number): Line => ({ text: '-'.repeat(cols) })

const plain = (text: string, cols: number, opts: Omit<Line, 'text'> = {}): Line[] =>
  wrap(text, cols).map((t) => ({ text: t, ...opts }))

const largeColsOf = (cols: number) => Math.floor(cols / 1.5)

/** Kepala nota seperti aplikasi Android: logo, merek, nama toko, alamat, dan telepon. */
function header(shop: ShopInfo, cols: number): Line[] {
  const name = shop.name.trim().toUpperCase()
  return [
    { text: '', logo: true, center: true },
    ...plain(BRAND, largeColsOf(cols), { large: true, bold: true, center: true }),
    ...(name && name !== BRAND ? plain(name, cols, { bold: true, center: true }) : []),
    ...(shop.address ? plain(shop.address, cols, { center: true }) : []),
    ...(shop.phone ? plain(shop.phone, cols, { center: true }) : []),
  ]
}

const remainingOf = (order: ReceiptOrder) => Math.max(0, order.total - order.paid)

const qtyText = (qty: number, unit: Unit) => `${formatQty(qty)} ${unit}`

function summaryOf(order: ReceiptOrder): string {
  return order.items.map((i) => `${qtyText(i.qty, i.unit)} ${i.name}`).join(', ')
}

/** Nota pelanggan: rincian item, pembulatan, pembayaran, dan sisa tagihan. */
export function buildReceipt(order: ReceiptOrder, shop: ShopInfo): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const lines: Line[] = [...header(shop, cols), dashes(cols)]
  lines.push({ text: remainingOf(order) === 0 ? 'NOTA LUNAS' : 'NOTA PESANAN', bold: true, center: true })
  lines.push(dashes(cols))
  lines.push({ text: padLine('No. Nota', order.number, cols) })
  lines.push({ text: padLine('Tgl Masuk', dateTimeFormat.format(new Date(order.createdAt)), cols) })
  lines.push(...plain(`Pelanggan: ${order.customerName}`, cols))
  if (order.cashier) lines.push(...plain(`Kasir: ${order.cashier}`, cols))
  lines.push(dashes(cols))

  let listed = 0
  for (const item of order.items) {
    const lineTotal = lineAmount(item.qty, item.price)
    listed += lineTotal
    lines.push(...plain(item.name, cols, { bold: true }))
    lines.push({ text: padLine(`  ${qtyText(item.qty, item.unit)} x ${formatRupiah(item.price)}`, formatRupiah(lineTotal), cols) })
  }

  const raw = subtotal(order.items, order.skipMinKg)
  lines.push(dashes(cols))
  if (raw > listed) {
    lines.push({ text: padLine('Minimal 3 kg', formatRupiah(raw - listed), cols) })
  }
  if (order.total > raw) {
    lines.push({ text: padLine('Subtotal', formatRupiah(raw), cols) })
    lines.push({ text: padLine('Pembulatan', formatRupiah(order.total - raw), cols) })
  }
  lines.push({ text: padLine('TOTAL', formatRupiah(order.total), cols), bold: true })
  lines.push({ text: padLine('Dibayar', formatRupiah(order.paid), cols) })
  lines.push({ text: padLine('Sisa', formatRupiah(remainingOf(order)), cols), bold: true })
  lines.push({ text: padLine('Status Bayar', paymentStatusLabel[paymentStatus(order.total, order.paid)].toUpperCase(), cols) })

  if (order.note) {
    lines.push(dashes(cols))
    lines.push(...plain(`Catatan: ${order.note}`, cols))
  }
  lines.push(dashes(cols))
  lines.push(...plain('Simpan nota ini sebagai bukti pesanan.', cols, { center: true }))
  if (shop.footer) lines.push(...plain(shop.footer, cols, { center: true }))
  return lines
}

/** Label cucian seperti aplikasi Android: huruf besar agar mudah dibaca di bungkus. */
export function buildLabel(order: ReceiptOrder, shop: ShopInfo): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const big = largeColsOf(cols)
  const pay = paymentStatusLabel[paymentStatus(order.total, order.paid)].toUpperCase()
  const lines: Line[] = [
    { text: 'LABEL CUCIAN', large: true, bold: true, center: true },
    dashes(cols),
    ...plain(order.number, shop.paperWidth === 80 ? big : cols, { large: shop.paperWidth === 80, bold: true, center: true }),
    ...plain(order.customerName.toUpperCase(), big, { large: true, bold: true, center: true }),
    dashes(cols),
    { text: 'BERAT / JUMLAH', bold: true },
  ]
  for (const item of order.items) {
    lines.push(...plain(qtyText(item.qty, item.unit), big, { large: true, bold: true }))
    lines.push(...plain(item.name, cols))
  }
  lines.push(dashes(cols))
  lines.push(...plain(`BAYAR: ${pay}`, big, { large: true, bold: true }))
  lines.push({ text: padLine('SISA', formatRupiah(remainingOf(order)), cols), bold: true })
  lines.push({ text: padLine('Masuk', dateTimeFormat.format(new Date(order.createdAt)), cols) })
  if (order.note) {
    lines.push(dashes(cols))
    lines.push({ text: 'CATATAN', bold: true })
    lines.push(...plain(order.note.toUpperCase(), big, { large: true, bold: true }))
  }
  return lines
}

/** Tanda terima pengambilan. Tetap menampilkan sisa tagihan bila pesanan diambil belum lunas. */
export function buildPickup(order: ReceiptOrder, shop: ShopInfo, now: Date = new Date()): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const remaining = Math.max(0, order.total - order.paid)
  const lines: Line[] = [
    ...header(shop, cols),
    dashes(cols),
    { text: 'TANDA TERIMA PENGAMBILAN', bold: true, center: true },
    dashes(cols),
    { text: padLine('No. Nota', order.number, cols) },
    ...plain(`Pelanggan: ${order.customerName}`, cols),
    ...plain(summaryOf(order), cols),
    { text: padLine('Diambil', dateTimeFormat.format(now), cols) },
    dashes(cols),
    { text: padLine('Total', formatRupiah(order.total), cols) },
    { text: padLine('Dibayar', formatRupiah(order.paid), cols) },
    { text: padLine('Sisa', formatRupiah(remaining), cols), bold: true },
    { text: padLine('Status Barang', 'SUDAH DIAMBIL', cols), bold: true },
  ]
  if (remaining > 0) {
    lines.push({ text: 'BELUM LUNAS', bold: true, center: true })
  } else {
    lines.push({ text: 'LUNAS', bold: true, center: true })
  }
  lines.push(dashes(cols), { text: '' }, { text: 'Penerima: ____________' }, { text: '' })
  lines.push(...plain('Bukti barang telah diterima pelanggan.', cols, { center: true }))
  if (shop.footer) lines.push(...plain(shop.footer, cols, { center: true }))
  return lines
}

export function buildDocument(kind: DocKind, order: ReceiptOrder, shop: ShopInfo, now?: Date): Line[] {
  if (kind === 'receipt') return buildReceipt(order, shop)
  if (kind === 'label') return buildLabel(order, shop)
  return buildPickup(order, shop, now)
}

/** Cetak uji: header toko dan penggaris kolom untuk memeriksa lebar kertas. */
export function buildTestPage(shop: ShopInfo): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const ruler = Array.from({ length: cols }, (_, i) => String((i + 1) % 10)).join('')
  return [
    ...header(shop, cols),
    dashes(cols),
    { text: 'CETAK UJI', bold: true, center: true },
    { text: `Kertas ${shop.paperWidth} mm (${cols} kolom)`, center: true },
    { text: ruler },
    { text: padLine('Kiri', 'Kanan', cols) },
    { text: padLine('TOTAL', formatRupiah(123000), cols), bold: true },
    dashes(cols),
    ...plain('Jika garis angka di atas terpotong, ubah lebar kertas di Pengaturan.', cols),
  ]
}
