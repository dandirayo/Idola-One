import { describe, expect, it } from 'vitest'
import {
  buildLabel,
  buildPickup,
  buildReceipt,
  buildTestPage,
  COLUMNS,
  padLine,
  wrap,
  type ReceiptOrder,
  type ShopInfo,
} from './receipt'

const shop = (paperWidth: 58 | 80 = 80): ShopInfo => ({
  name: 'Idola Laundry',
  phone: '0812-0000-0000',
  address: 'Jl. Contoh No. 1',
  footer: 'Terima kasih',
  paperWidth,
})

const order = (extra: Partial<ReceiptOrder> = {}): ReceiptOrder => ({
  number: 'IDL-20261116-0012',
  customerName: 'Bu Sinta',
  createdAt: new Date(2026, 10, 16, 8, 10).toISOString(),
  items: [{ name: 'Cuci Setrika', unit: 'kg', qty: 3.5, price: 8000 }],
  total: 28000,
  paid: 10000,
  note: '',
  skipMinKg: false,
  ...extra,
})

const text = (lines: { text: string }[]) => lines.map((l) => l.text).join('\n')

describe('wrap dan padLine', () => {
  it('memecah per kata tanpa melebihi lebar', () => {
    const lines = wrap('Jl. Contoh Raya Nomor 123 Kota Contoh', 16)
    expect(lines.every((l) => l.length <= 16)).toBe(true)
    expect(lines.join(' ')).toBe('Jl. Contoh Raya Nomor 123 Kota Contoh')
  })

  it('memotong kata yang lebih panjang dari lebar kolom', () => {
    expect(wrap('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('padLine selalu tepat selebar kolom bila muat', () => {
    expect(padLine('Total', 'Rp 28.000', 32)).toHaveLength(32)
  })

  it('padLine memotong teks kiri yang terlalu panjang agar kanan tetap utuh', () => {
    const line = padLine('Nama layanan yang sangat sangat panjang sekali', 'Rp 5.000', 32)
    expect(line).toHaveLength(32)
    expect(line.endsWith('Rp 5.000')).toBe(true)
  })
})

describe('buildReceipt', () => {
  it('memuat nomor nota, pelanggan, item, total, dibayar, dan sisa', () => {
    const t = text(buildReceipt(order(), shop()))
    expect(t).toContain('IDL-20261116-0012')
    expect(t).toContain('Bu Sinta')
    expect(t).toContain('Cuci Setrika')
    expect(t).toContain('3,5 kg x Rp 8.000')
    expect(t).toContain('Rp 28.000')
    expect(t).toMatch(/Dibayar\s+Rp 10\.000/)
    expect(t).toMatch(/Sisa\s+Rp 18\.000/)
    expect(t).toContain('DP')
  })

  it('menampilkan pembulatan ke atas dan tagihan minimal 3 kg', () => {
    const t = text(
      buildReceipt(
        order({
          items: [{ name: 'Cuci Setrika', unit: 'kg', qty: 2.5, price: 7250 }],
          total: 22000, // 3 kg x 7.250 = 21.750 dibulatkan ke 22.000
          paid: 0,
        }),
        shop(),
      ),
    )
    expect(t).toMatch(/Minimal 3 kg\s+Rp 3\.625/)
    expect(t).toMatch(/Subtotal\s+Rp 21\.750/)
    expect(t).toMatch(/Pembulatan\s+Rp 250/)
    expect(t).toContain('Belum Bayar')
  })

  it('tidak ada baris yang melebihi lebar kertas 58 mm maupun 80 mm', () => {
    for (const width of [58, 80] as const) {
      const lines = buildReceipt(
        order({ note: 'Jangan dicampur dengan pakaian berwarna gelap ya', customerName: 'Pelanggan Dengan Nama Sangat Panjang Sekali' }),
        shop(width),
      )
      const limit = COLUMNS[width]
      for (const l of lines) {
        const max = l.large ? Math.floor(limit / 1.5) : limit
        expect(l.text.length).toBeLessThanOrEqual(max)
      }
    }
  })
})

describe('buildLabel', () => {
  it('memakai huruf besar untuk nomor dan nama pelanggan', () => {
    const lines = buildLabel(order(), shop())
    expect(lines.filter((l) => l.large).map((l) => l.text)).toEqual(['IDL-20261116-0012', 'Bu Sinta'])
    expect(text(lines)).toMatch(/Bayar\s+DP/)
  })
})

describe('buildPickup', () => {
  it('menandai BELUM LUNAS dan menampilkan sisa bila diambil belum lunas', () => {
    const t = text(buildPickup(order(), shop(), new Date(2026, 10, 17, 10, 0)))
    expect(t).toContain('BUKTI PENGAMBILAN')
    expect(t).toContain('BELUM LUNAS')
    expect(t).toMatch(/Sisa\s+Rp 18\.000/)
    expect(t).toContain('Penerima:')
  })

  it('menandai LUNAS bila sisa nol', () => {
    const t = text(buildPickup(order({ paid: 28000 }), shop()))
    expect(t).toContain('LUNAS')
    expect(t).not.toContain('BELUM LUNAS')
  })
})

describe('lebar baris semua dokumen', () => {
  it('tidak ada baris yang melebihi lebar kertas, untuk setiap jenis dokumen dan lebar', () => {
    for (const width of [58, 80] as const) {
      const s = shop(width)
      const o = order({ note: 'Jangan dicampur dengan pakaian berwarna gelap ya', customerName: 'Pelanggan Dengan Nama Sangat Panjang Sekali' })
      const docs = [buildReceipt(o, s), buildLabel(o, s), buildPickup(o, s), buildTestPage(s)]
      for (const lines of docs) {
        for (const l of lines) {
          const max = l.large ? Math.floor(COLUMNS[width] / 1.5) : COLUMNS[width]
          expect(l.text.length, `"${l.text}" pada ${width} mm`).toBeLessThanOrEqual(max)
        }
      }
    }
  })
})

describe('buildTestPage', () => {
  it('menyertakan penggaris selebar kolom kertas', () => {
    for (const width of [58, 80] as const) {
      const lines = buildTestPage(shop(width))
      expect(lines.some((l) => l.text.length === COLUMNS[width] && /^[0-9]+$/.test(l.text))).toBe(true)
    }
  })
})
