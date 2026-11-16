import { describe, expect, it } from 'vitest'
import { computeKpis } from '@/lib/dashboard'
import { correctPayment, createOrder, getOrder, getState } from './store'

const jas = { serviceId: 's4', name: 'Jas', unit: 'pcs' as const, qty: 1, price: 30000 }

function make(initialPayment: { amount: number; method: 'cash' | 'transfer' | 'qris' } | null = null) {
  return createOrder({ customerId: 'c1', items: [jas], skipMinKg: false, note: '', initialPayment })
}

const localYmd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

describe('nomor nota', () => {
  it('tidak pernah kembar, walau dibuat berkali-kali', () => {
    for (let i = 0; i < 8; i++) make()
    const numbers = getState().orders.map((o) => o.number)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it('berlanjut dari urutan tertinggi hari ini dan memakai tanggal lokal', () => {
    const before = getState().orders.filter((o) => o.number.includes(`-${localYmd(new Date())}-`))
    const maxSeq = Math.max(0, ...before.map((o) => Number(o.number.slice(-4))))
    const order = make()
    expect(order.number).toBe(`IDL-${localYmd(new Date())}-${String(maxSeq + 1).padStart(4, '0')}`)
  })
})

describe('pembayaran awal', () => {
  it('menolak nominal nol, negatif, atau melebihi total', () => {
    expect(() => make({ amount: 0, method: 'cash' })).toThrow(/Nominal/)
    expect(() => make({ amount: -5000, method: 'cash' })).toThrow(/Nominal/)
    expect(() => make({ amount: 30001, method: 'cash' })).toThrow(/melebihi/)
  })

  it('pembayaran awal yang ditolak tidak membuat pesanan', () => {
    const count = getState().orders.length
    expect(() => make({ amount: -1, method: 'cash' })).toThrow()
    expect(getState().orders.length).toBe(count)
  })

  it('pembayaran awal yang valid tercatat sebagai pembayaran', () => {
    const o = make({ amount: 10000, method: 'qris' })
    expect(o.paid).toBe(10000)
    expect(o.payments).toHaveLength(1)
    expect(o.payments[0].method).toBe('qris')
  })
})

describe('data contoh relatif terhadap hari ini', () => {
  it('pesanan contoh hari ini selalu terhitung "hari ini" di Beranda', () => {
    const s = getState()
    const k = computeKpis(s.orders, s.cash, s.inventory)
    expect(k.ordersToday).toBeGreaterThanOrEqual(3)
  })

  it('koreksi pembayaran contoh yang tidak mengubah tanggal tidak ditolak karena "masa depan"', () => {
    const seeded = getOrder('o12')!
    const p = seeded.payments[0]
    expect(() => correctPayment('o12', p.id, { amount: 20000, method: 'cash', at: p.at })).not.toThrow()
  })
})
