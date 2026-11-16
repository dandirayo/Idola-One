import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import { addPayment, correctPayment, createOrder, getOrder, getState } from './store'

function newOrder(paid: number) {
  return createOrder({
    customerId: 'c1',
    items: [{ serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 2, price: 30000 }], // total 60.000
    skipMinKg: false,
    note: '',
    initialPayment: paid > 0 ? { amount: paid, method: 'cash' } : null,
  })
}

const cashOf = (paymentId: string) => getState().cash.find((c) => c.id === `cash-${paymentId}`)!

describe('koreksi pembayaran', () => {
  it('memperbarui pembayaran, total dibayar, dan kas dalam satu langkah, lalu mencatat audit', () => {
    const o = newOrder(20000)
    const pid = o.payments[0].id
    const balBefore = balance(getState().cash)

    correctPayment(o.id, pid, { amount: 35000, method: 'transfer', at: new Date().toISOString() })

    const after = getOrder(o.id)!
    expect(after.paid).toBe(35000)
    expect(after.payments[0]).toMatchObject({ amount: 35000, method: 'transfer' })
    expect(cashOf(pid)).toMatchObject({ amount: 35000, method: 'transfer' })
    expect(balance(getState().cash)).toBe(balBefore + 15000)

    const audit = getState().audit[0]
    expect(audit.entity).toBe('Pesanan')
    expect(audit.entityId).toBe(o.id)
    expect(audit.ref).toBe(o.number)
    expect(audit.action).toBe('Koreksi pembayaran')
    expect(audit.before).toContain('Rp 20.000')
    expect(audit.before).toContain('Tunai')
    expect(audit.after).toContain('Rp 35.000')
    expect(audit.after).toContain('Transfer')
  })

  it('menghitung batas dengan pembayaran lain pada pesanan yang sama', () => {
    const o = newOrder(20000)
    addPayment(o.id, 30000, 'cash') // total dibayar 50.000 dari 60.000
    const first = getOrder(o.id)!.payments[0].id
    expect(() => correctPayment(o.id, first, { amount: 40000, method: 'cash', at: new Date().toISOString() })).toThrow(
      /melebihi/,
    )
    correctPayment(o.id, first, { amount: 30000, method: 'cash', at: new Date().toISOString() }) // pas Rp60.000
    expect(getOrder(o.id)!.paid).toBe(60000)
  })

  it('menolak nominal tidak valid, tanggal rusak atau masa depan, dan tanpa perubahan', () => {
    const o = newOrder(20000)
    const pid = o.payments[0].id
    const now = new Date().toISOString()
    expect(() => correctPayment(o.id, pid, { amount: 0, method: 'cash', at: now })).toThrow(/Nominal/)
    expect(() => correctPayment(o.id, pid, { amount: 1000, method: 'cash', at: 'bukan-tanggal' })).toThrow(/tidak valid/)
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString()
    expect(() => correctPayment(o.id, pid, { amount: 1000, method: 'cash', at: future })).toThrow(/masa depan/)
    expect(() =>
      correctPayment(o.id, pid, { amount: 20000, method: 'cash', at: getOrder(o.id)!.payments[0].at }),
    ).toThrow(/Tidak ada perubahan/)
  })

  it('koreksi yang ditolak tidak mengubah apa pun dan tidak menambah audit', () => {
    const o = newOrder(20000)
    const before = getState()
    expect(() =>
      correctPayment(o.id, o.payments[0].id, { amount: 999999, method: 'cash', at: new Date().toISOString() }),
    ).toThrow()
    expect(getState()).toBe(before)
  })

  it('menolak pesanan atau pembayaran yang tidak ada', () => {
    const o = newOrder(20000)
    const now = new Date().toISOString()
    expect(() => correctPayment('tidak-ada', 'x', { amount: 1000, method: 'cash', at: now })).toThrow(/Pesanan/)
    expect(() => correctPayment(o.id, 'tidak-ada', { amount: 1000, method: 'cash', at: now })).toThrow(/Pembayaran/)
  })
})
