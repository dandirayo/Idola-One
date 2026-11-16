// Susunan dokumen cetak (nota, label cucian, bukti pengambilan) sebagai baris teks.
// Lebar kolom mengikuti aplikasi Android: 32 kolom untuk kertas 58 mm dan 48 kolom
// untuk 80 mm. Baris yang sama nanti dapat dikirim sebagai ESC/POS bila jalur
// cetak langsung ke printer dipilih (lihat docs/04-BACKEND.md bagian 6).

import { formatRupiah } from '@/lib/format'
import { paymentStatus, paymentStatusLabel, subtotal, type Unit } from '@/lib/orders'

export type PaperWidth = 58 | 80
export type DocKind = 'receipt' | 'label' | 'pickup'

export const COLUMNS: Record<PaperWidth, number> = { 58: 32, 80: 48 }

export const docKindLabel: Record<DocKind, string> = {
  receipt: 'Nota Pelanggan',
  label: 'Label Cucian',
  pickup: 'Bukti Pengambilan',
}

export interface ShopInfo {
  name: string
  phone: string
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
}

export interface Line {
  text: string
  large?: boolean
  bold?: boolean
  center?: boolean
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

function header(shop: ShopInfo, cols: number): Line[] {
  const largeCols = Math.floor(cols / 1.5)
  return [
    ...plain(shop.name, largeCols, { large: true, bold: true, center: true }),
    ...(shop.phone ? plain(shop.phone, cols, { center: true }) : []),
    ...(shop.address ? plain(shop.address, cols, { center: true }) : []),
  ]
}

const qtyText = (qty: number, unit: Unit) => `${String(qty).replace('.', ',')} ${unit}`

function summaryOf(order: ReceiptOrder): string {
  return order.items.map((i) => `${qtyText(i.qty, i.unit)} ${i.name}`).join(', ')
}

/** Nota pelanggan: rincian item, pembulatan, pembayaran, dan sisa tagihan. */
export function buildReceipt(order: ReceiptOrder, shop: ShopInfo): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const lines: Line[] = [...header(shop, cols), dashes(cols)]
  lines.push({ text: padLine('Nota', order.number, cols) })
  lines.push({ text: padLine('Tanggal', dateTimeFormat.format(new Date(order.createdAt)), cols) })
  lines.push(...plain(`Pelanggan: ${order.customerName}`, cols))
  lines.push(dashes(cols))

  let listed = 0
  for (const item of order.items) {
    const lineTotal = item.qty * item.price
    listed += lineTotal
    lines.push(...plain(item.name, cols, { bold: true }))
    lines.push({ text: padLine(`  ${qtyText(item.qty, item.unit)} x ${formatRupiah(item.price)}`, formatRupiah(lineTotal), cols) })
  }

  const raw = subtotal(order.items, order.skipMinKg)
  lines.push(dashes(cols))
  if (raw > listed) {
    lines.push({ text: padLine('Minimal 3 kg', formatRupiah(raw - listed), cols) })
  }
  lines.push({ text: padLine('Subtotal', formatRupiah(raw), cols) })
  if (order.total > raw) {
    lines.push({ text: padLine('Pembulatan', formatRupiah(order.total - raw), cols) })
  }
  lines.push({ text: padLine('TOTAL', formatRupiah(order.total), cols), bold: true })
  lines.push({ text: padLine('Dibayar', formatRupiah(order.paid), cols) })
  const remaining = Math.max(0, order.total - order.paid)
  lines.push({ text: padLine('Sisa', formatRupiah(remaining), cols), bold: true })
  lines.push({ text: padLine('Status', paymentStatusLabel[paymentStatus(order.total, order.paid)], cols) })

  if (order.note) {
    lines.push(dashes(cols))
    lines.push(...plain(`Catatan: ${order.note}`, cols))
  }
  if (shop.footer) {
    lines.push(dashes(cols))
    lines.push(...plain(shop.footer, cols, { center: true }))
  }
  return lines
}

/** Label cucian: huruf besar agar mudah dibaca di bungkus. */
export function buildLabel(order: ReceiptOrder, shop: ShopInfo): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const largeCols = Math.floor(cols / 1.5)
  const pay = paymentStatusLabel[paymentStatus(order.total, order.paid)]
  const lines: Line[] = [
    ...plain(order.number, largeCols, { large: true, bold: true, center: true }),
    ...plain(order.customerName, largeCols, { large: true, bold: true, center: true }),
    dashes(cols),
    ...plain(summaryOf(order), cols, { bold: true }),
    { text: padLine('Bayar', pay, cols), bold: true },
    { text: padLine('Masuk', dateTimeFormat.format(new Date(order.createdAt)), cols) },
  ]
  if (order.note) lines.push(...plain(`Catatan: ${order.note}`, cols))
  return lines
}

/** Bukti pengambilan. Tetap menampilkan sisa tagihan bila pesanan diambil belum lunas. */
export function buildPickup(order: ReceiptOrder, shop: ShopInfo, now: Date = new Date()): Line[] {
  const cols = COLUMNS[shop.paperWidth]
  const remaining = Math.max(0, order.total - order.paid)
  const lines: Line[] = [
    ...header(shop, cols),
    dashes(cols),
    { text: 'BUKTI PENGAMBILAN', bold: true, center: true },
    dashes(cols),
    { text: padLine('Nota', order.number, cols) },
    ...plain(`Pelanggan: ${order.customerName}`, cols),
    ...plain(summaryOf(order), cols),
    { text: padLine('Diambil', dateTimeFormat.format(now), cols) },
    dashes(cols),
    { text: padLine('Total', formatRupiah(order.total), cols) },
    { text: padLine('Dibayar', formatRupiah(order.paid), cols) },
    { text: padLine('Sisa', formatRupiah(remaining), cols), bold: true },
  ]
  if (remaining > 0) {
    lines.push({ text: 'BELUM LUNAS', bold: true, center: true })
  } else {
    lines.push({ text: 'LUNAS', bold: true, center: true })
  }
  lines.push(dashes(cols), { text: '' }, { text: 'Penerima: ____________' }, { text: '' })
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
