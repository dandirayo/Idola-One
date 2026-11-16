import { describe, expect, it } from 'vitest'
import { periodRange } from './finance'
import { cartTotal, nextSaleNumber, summarizeSales, validateCart, type CartLine, type SaleLike } from './pos'

const line = (extra: Partial<CartLine> = {}): CartLine => ({ productId: 'p1', name: 'Es Teh', price: 5000, qty: 2, ...extra })

describe('cartTotal dan validateCart', () => {
  it('menjumlahkan harga x jumlah', () => {
    expect(cartTotal([line(), line({ productId: 'p2', name: 'Es Jeruk', price: 7000, qty: 3 })])).toBe(31000)
    expect(cartTotal([])).toBe(0)
  })

  it('menolak keranjang kosong, jumlah tidak valid, dan harga tidak valid', () => {
    expect(validateCart([])).toMatch(/kosong/)
    expect(validateCart([line({ qty: 0 })])).toMatch(/Jumlah/)
    expect(validateCart([line({ qty: 1.5 })])).toMatch(/Jumlah/)
    expect(validateCart([line({ price: 0 })])).toMatch(/Harga/)
    expect(validateCart([line()])).toBeNull()
  })
})

describe('nextSaleNumber', () => {
  const day = new Date(2026, 10, 18)

  it('dimulai dari 0001 dan berlanjut dari urutan tertinggi hari itu', () => {
    expect(nextSaleNumber([], day)).toBe('POS-20261118-0001')
    expect(nextSaleNumber([{ number: 'POS-20261118-0007' }, { number: 'POS-20261118-0003' }], day)).toBe('POS-20261118-0008')
  })

  it('mengabaikan nomor tanggal lain', () => {
    expect(nextSaleNumber([{ number: 'POS-20261117-0050' }], day)).toBe('POS-20261118-0001')
  })
})

describe('summarizeSales', () => {
  const now = new Date(2026, 10, 18, 12)
  const today = periodRange('today', now)
  const sale = (extra: Partial<SaleLike>): SaleLike => ({
    number: 'POS-1',
    at: new Date(2026, 10, 18, 9).toISOString(),
    total: 10000,
    method: 'cash',
    items: [line()],
    ...extra,
  })

  it('menjumlahkan omzet, jumlah transaksi, dan per metode pada periode', () => {
    const s = summarizeSales(
      [sale({}), sale({ total: 20000, method: 'qris' }), sale({ at: new Date(2026, 10, 17, 9).toISOString() })],
      today,
    )
    expect(s.total).toBe(30000)
    expect(s.count).toBe(2)
    expect(s.byMethod).toEqual({ cash: 10000, transfer: 0, qris: 20000 })
  })

  it('mengurutkan produk terlaris dari jumlah terbanyak', () => {
    const s = summarizeSales(
      [
        sale({ items: [line({ name: 'Es Teh', qty: 2 }), line({ name: 'Es Jeruk', qty: 5 })] }),
        sale({ items: [line({ name: 'Es Teh', qty: 4 })] }),
      ],
      today,
    )
    expect(s.top).toEqual([
      { name: 'Es Teh', qty: 6 },
      { name: 'Es Jeruk', qty: 5 },
    ])
  })
})
