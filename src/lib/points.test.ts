import { describe, expect, it } from 'vitest'
import { customerPoints, pointsForOrder, type PointOrder } from './points'

const order = (extra: Partial<PointOrder> = {}): PointOrder => ({
  number: 'IDL-1',
  customerId: 'c1',
  createdAt: '2026-11-16T08:00:00.000Z',
  status: 'received',
  total: 28000,
  paid: 28000,
  payments: [{ at: '2026-11-16T08:05:00.000Z' }],
  ...extra,
})

describe('pointsForOrder', () => {
  it('1 poin per Rp10.000, dibulatkan ke bawah', () => {
    expect(pointsForOrder({ status: 'received', total: 28000, paid: 28000 })).toBe(2)
    expect(pointsForOrder({ status: 'received', total: 9999, paid: 9999 })).toBe(0)
    expect(pointsForOrder({ status: 'received', total: 100000, paid: 100000 })).toBe(10)
  })

  it('hanya pesanan lunas', () => {
    expect(pointsForOrder({ status: 'received', total: 28000, paid: 27999 })).toBe(0)
    expect(pointsForOrder({ status: 'received', total: 28000, paid: 0 })).toBe(0)
  })

  it('pesanan batal tidak menghasilkan poin', () => {
    expect(pointsForOrder({ status: 'cancelled', total: 50000, paid: 50000 })).toBe(0)
  })
})

describe('customerPoints', () => {
  it('menjumlahkan poin pesanan lunas milik pelanggan itu saja', () => {
    const r = customerPoints(
      [
        order({ number: 'A', total: 30000, paid: 30000 }),
        order({ number: 'B', total: 20000, paid: 20000 }),
        order({ number: 'C', total: 90000, paid: 10000 }), // belum lunas
        order({ number: 'D', customerId: 'c2', total: 100000, paid: 100000 }),
      ],
      'c1',
    )
    expect(r.balance).toBe(5)
    expect(r.events.map((e) => e.orderNumber).sort()).toEqual(['A', 'B'])
  })

  it('poin ikut hilang bila pesanan tidak lagi lunas (misalnya setelah koreksi)', () => {
    expect(customerPoints([order({ total: 30000, paid: 30000 })], 'c1').balance).toBe(3)
    expect(customerPoints([order({ total: 30000, paid: 20000 })], 'c1').balance).toBe(0)
  })

  it('riwayat terbaru di atas dan memakai waktu pembayaran terakhir', () => {
    const r = customerPoints(
      [
        order({ number: 'LAMA', payments: [{ at: '2026-11-01T08:00:00.000Z' }] }),
        order({ number: 'BARU', payments: [{ at: '2026-11-10T08:00:00.000Z' }, { at: '2026-11-12T08:00:00.000Z' }] }),
      ],
      'c1',
    )
    expect(r.events.map((e) => e.orderNumber)).toEqual(['BARU', 'LAMA'])
    expect(r.events[0].at).toBe('2026-11-12T08:00:00.000Z')
  })
})
