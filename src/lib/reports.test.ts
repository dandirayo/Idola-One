import { describe, expect, it } from 'vitest'
import type { CashEntry } from './finance'
import { periodRange } from './finance'
import {
  cashCsv,
  cashReport,
  orderReport,
  ordersCsv,
  paymentReport,
  paymentReportMessage,
  toCsv,
  whatsappUrl,
  type ReportOrder,
} from './reports'

// Rabu, 18 November 2026 (lokal)
const now = new Date(2026, 10, 18, 12)
const today = periodRange('today', now)
const at = (h: number, d = 18) => new Date(2026, 10, d, h).toISOString()

const order = (extra: Partial<ReportOrder> = {}): ReportOrder => ({
  number: 'IDL-1',
  customerName: 'Bu Sinta',
  createdAt: at(9),
  status: 'received',
  total: 28000,
  paid: 0,
  items: [{ name: 'Cuci Setrika', unit: 'kg', qty: 3.5, price: 8000 }],
  payments: [],
  ...extra,
})

describe('orderReport', () => {
  it('menghitung jumlah, nilai, volume, dan sisa tagihan', () => {
    const r = orderReport(
      [
        order({ total: 28000, paid: 10000 }),
        order({ total: 60000, paid: 60000, items: [{ name: 'Jas', unit: 'pcs', qty: 2, price: 30000 }] }),
      ],
      today,
    )
    expect(r.count).toBe(2)
    expect(r.value).toBe(88000)
    expect(r.kg).toBe(3.5)
    expect(r.pcs).toBe(2)
    expect(r.outstanding).toBe(18000)
  })

  it('pesanan batal tidak dihitung ke nilai dan volume, tetapi tampil di rincian status', () => {
    const r = orderReport([order(), order({ status: 'cancelled', total: 50000 })], today)
    expect(r.count).toBe(1)
    expect(r.value).toBe(28000)
    expect(r.byStatus.cancelled).toBe(1)
    expect(r.byStatus.received).toBe(1)
  })

  it('hanya memuat pesanan dalam rentang', () => {
    const r = orderReport([order(), order({ createdAt: at(9, 17) })], today)
    expect(r.count).toBe(1)
  })

  it('mengelompokkan per layanan dan mengurutkan dari nilai terbesar', () => {
    const r = orderReport(
      [
        order({ items: [{ name: 'Jas', unit: 'pcs', qty: 1, price: 30000 }] }),
        order({ items: [{ name: 'Cuci Setrika', unit: 'kg', qty: 2, price: 8000 }] }),
        order({ items: [{ name: 'Cuci Setrika', unit: 'kg', qty: 3, price: 8000 }] }),
      ],
      today,
    )
    expect(r.byService.map((s) => [s.name, s.qty, s.value])).toEqual([
      ['Jas', 1, 30000],
      ['Cuci Setrika', 5, 40000],
    ].sort((a, b) => (b[2] as number) - (a[2] as number)))
  })
})

const entry = (e: Partial<CashEntry>): CashEntry => ({
  id: 'x',
  at: at(10),
  direction: 'in',
  amount: 1000,
  method: 'cash',
  category: 'Pembayaran',
  description: '',
  ...e,
})

describe('cashReport', () => {
  it('menghitung masuk, keluar, bersih, dan per kategori tanpa saldo awal', () => {
    const r = cashReport(
      [
        entry({ amount: 50000, method: 'transfer' }),
        entry({ amount: 20000, direction: 'out', category: 'Stok' }),
        entry({ amount: 500000, category: 'Saldo Awal' }),
        entry({ amount: 99999, at: at(10, 10) }), // di luar rentang
      ],
      today,
    )
    expect(r.in).toBe(50000)
    expect(r.out).toBe(20000)
    expect(r.net).toBe(30000)
    expect(r.count).toBe(2)
    expect(r.byMethod.transfer.in).toBe(50000)
    expect(r.byCategory.find((c) => c.category === 'Stok')).toEqual({ category: 'Stok', in: 0, out: 20000 })
    expect(r.byCategory.some((c) => c.category === 'Saldo Awal')).toBe(false)
  })
})

describe('paymentReport', () => {
  const pay = (id: string, amount: number, method: 'cash' | 'transfer' | 'qris', h = 10) => ({
    id,
    amount,
    method,
    at: at(h),
  })

  it('menjumlahkan pembayaran per metode, bukan nilai nota', () => {
    const r = paymentReport(
      [
        order({ total: 100000, payments: [pay('a', 30000, 'cash')] }),
        order({ total: 80000, payments: [pay('b', 20000, 'qris')] }),
      ],
      today,
    )
    expect(r.total).toBe(50000)
    expect(r.byMethod).toEqual({ cash: 30000, transfer: 0, qris: 20000 })
    expect(r.count).toBe(2)
    expect(r.orders).toBe(2)
  })

  it('Hybrid menandai nota bertunai dan transfer tanpa menjumlahkan dua kali', () => {
    const r = paymentReport(
      [order({ payments: [pay('a', 10000, 'cash'), pay('b', 15000, 'transfer')] })],
      today,
    )
    expect(r.hybrid).toBe(1)
    expect(r.total).toBe(25000)
    expect(r.byMethod.cash + r.byMethod.transfer).toBe(25000)
  })

  it('mengabaikan pembayaran di luar rentang', () => {
    const r = paymentReport([order({ payments: [{ id: 'z', amount: 9000, method: 'cash', at: at(10, 10) }] })], today)
    expect(r.total).toBe(0)
    expect(r.orders).toBe(0)
  })
})

describe('toCsv', () => {
  it('mengutip sel yang mengandung koma, tanda kutip, atau baris baru', () => {
    expect(toCsv([['a,b', 'c"d', 'e\nf', 'ok']])).toBe('"a,b","c""d","e\nf",ok')
  })

  it('mencegah injeksi rumus pada sel teks, tetapi tidak mengubah angka negatif', () => {
    const csv = toCsv([['=SUM(A1:A9)', '+1', '-2', '@x', 'aman', -5]])
    expect(csv).toBe("'=SUM(A1:A9),'+1,'-2,'@x,aman,-5")
  })

  it('memakai pemisah baris CRLF', () => {
    expect(toCsv([['a'], ['b']])).toBe('a\r\nb')
  })
})

describe('ordersCsv dan cashCsv', () => {
  it('memuat header dan baris data', () => {
    const csv = ordersCsv([order({ customerName: '=HYPERLINK("x")', total: 28000, paid: 10000 })])
    const [header, row] = csv.split('\r\n')
    expect(header).toBe('Nomor,Tanggal,Pelanggan,Status,Total,Dibayar,Sisa')
    expect(row).toContain(`"'=HYPERLINK(""x"")"`)
    expect(row.endsWith(',28000,10000,18000')).toBe(true)
  })

  it('cashCsv menandai arah Masuk dan Keluar', () => {
    const csv = cashCsv([entry({ direction: 'out', amount: 5000 })])
    expect(csv.split('\r\n')[1]).toContain(',Keluar,')
  })
})

describe('paymentReportMessage dan whatsappUrl', () => {
  const report = { total: 55000, count: 3, orders: 2, byMethod: { cash: 30000, transfer: 25000, qris: 0 }, hybrid: 1 }

  it('memuat rincian metode, total, dan keterangan Hybrid', () => {
    const text = paymentReportMessage(report, 'Hari ini', 'Rina')
    expect(text).toContain('Hari ini')
    expect(text).toContain('Dari: Rina')
    expect(text).toMatch(/Tunai: Rp 30\.000/)
    expect(text).toMatch(/Transfer: Rp 25\.000/)
    expect(text).toMatch(/Total: Rp 55\.000 \(3 pembayaran, 2 nota\)/)
    expect(text).toContain('Hybrid: 1 nota (sudah termasuk')
  })

  it('tidak menyebut Hybrid bila tidak ada', () => {
    expect(paymentReportMessage({ ...report, hybrid: 0 }, 'Kemarin', 'Rina')).not.toContain('Hybrid')
  })

  it('whatsappUrl memakai nomor penerima bila valid dan membiarkan kosong bila tidak', () => {
    expect(whatsappUrl('0812-0000-0000', 'Halo')).toBe('https://wa.me/6281200000000?text=Halo')
    expect(whatsappUrl('', 'Halo')).toBe('https://wa.me/?text=Halo')
    expect(whatsappUrl('0812', 'Halo')).toBe('https://wa.me/?text=Halo')
  })

  it('mengkodekan karakter khusus pada teks', () => {
    expect(whatsappUrl('', 'a b\nc')).toBe('https://wa.me/?text=a%20b%0Ac')
  })
})
