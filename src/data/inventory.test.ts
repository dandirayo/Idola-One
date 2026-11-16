import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import { addExpense, addPayment, adjustStock, buyStock, consumeStock, createOrder, getState } from './store'

const item = (id: string) => getState().inventory.find((i) => i.id === id)!

describe('stok', () => {
  it('beli stok menambah stok, membuat pengeluaran Stok, dan kas keluar sekaligus', () => {
    const before = item('i1').stock
    const cashBefore = getState().cash.length
    const balBefore = balance(getState().cash)
    buyStock('i1', 3, 90000, 'cash', 'toko A')
    expect(item('i1').stock).toBe(before + 3)
    expect(getState().expenses[0].category).toBe('Stok')
    expect(getState().cash.length).toBe(cashBefore + 1)
    expect(balance(getState().cash)).toBe(balBefore - 90000)
  })

  it('beli stok yang tidak valid tidak mengubah apa pun', () => {
    const snapshot = getState()
    expect(() => buyStock('i1', 0, 1000, 'cash', '')).toThrow(/Jumlah/)
    expect(() => buyStock('i1', 1, 0, 'cash', '')).toThrow(/Nominal/)
    expect(() => buyStock('tidak-ada', 1, 1000, 'cash', '')).toThrow(/barang/)
    expect(getState()).toBe(snapshot)
  })

  it('pakai stok mengurangi stok tanpa membuat kas keluar', () => {
    const before = item('i4').stock
    const cashBefore = getState().cash.length
    consumeStock('i4', 2, '')
    expect(item('i4').stock).toBe(before - 2)
    expect(getState().cash.length).toBe(cashBefore)
  })

  it('pakai stok melebihi sisa ditolak', () => {
    const before = item('i5').stock
    expect(() => consumeStock('i5', before + 1, '')).toThrow(/tidak cukup/)
    expect(item('i5').stock).toBe(before)
  })

  it('koreksi tidak boleh membuat stok negatif atau selisih nol', () => {
    const before = item('i2').stock
    expect(() => adjustStock('i2', -(before + 1), '')).toThrow(/negatif/)
    expect(() => adjustStock('i2', 0, '')).toThrow(/selisih/)
    adjustStock('i2', -5, 'opname')
    expect(item('i2').stock).toBe(before - 5)
  })
})

describe('kas', () => {
  it('pembayaran awal dan tambahan otomatis menjadi kas masuk', () => {
    const balBefore = balance(getState().cash)
    const order = createOrder({
      customerId: 'c1',
      items: [{ serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 1, price: 30000 }],
      skipMinKg: false,
      note: '',
      initialPayment: { amount: 10000, method: 'transfer' },
    })
    expect(balance(getState().cash)).toBe(balBefore + 10000)
    addPayment(order.id, 20000, 'qris')
    expect(balance(getState().cash)).toBe(balBefore + 30000)
  })

  it('pengeluaran menjadi kas keluar dan menolak data kosong', () => {
    const balBefore = balance(getState().cash)
    addExpense('Beli sabun', 'Operasional', 25000, 'cash')
    expect(balance(getState().cash)).toBe(balBefore - 25000)
    expect(() => addExpense('  ', 'x', 1000, 'cash')).toThrow(/Deskripsi/)
    expect(() => addExpense('Ok', 'x', 0, 'cash')).toThrow(/Nominal/)
  })
})
