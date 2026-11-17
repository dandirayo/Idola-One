import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import {
  cancelPayment,
  cancelPayroll,
  deleteCustomer,
  deleteExpense,
  deleteOrder,
  deleteProject,
  deleteRequest,
} from './admin'
import { addProjectBatch, addProjectPayment, createProject } from './projects'
import { payWeeklySalary } from './payroll'
import { addCustomer, addEmployee, addExpense, addPayment, createOrder, getState, setOrderStatus, type Order } from './store'
import { purgeTrash, restoreBlocker, restoreFromTrash, trashSummary } from './trash'
import { serviceByName } from './seed-services'

const svc = (name: string) => serviceByName(name).id

const cash = () => balance(getState().cash)
const rid = () => `0818${Math.floor(Math.random() * 1e8)}`

function newOrder(paid = 0): Order {
  const c = addCustomer(`Sampah ${Math.random()}`, rid())
  return createOrder({
    customerId: c.id,
    items: [{ serviceId: svc('Cuci Setrika Reguler'), name: 'Cuci Setrika', unit: 'kg', qty: 3, price: 8000 }],
    skipMinKg: false,
    note: '',
    initialPayment: paid > 0 ? { amount: paid, method: 'cash' } : null,
  })
}

describe('Sampah: hapus lalu pulihkan', () => {
  it('pesanan kembali lengkap dengan kas pembayarannya', () => {
    const before = cash()
    const o = newOrder(10000)
    addPayment(o.id, 5000, 'transfer')
    const withPay = cash()
    deleteOrder(o.id, 'Salah input')
    expect(cash()).toBe(before)
    const item = getState().trash[0]
    expect(item.kind).toBe('Pesanan')
    expect(trashSummary(item)).toMatch(/1 pesanan.*2 baris kas/)
    restoreFromTrash(item.id)
    expect(cash()).toBe(withPay)
    expect(getState().orders.find((x) => x.id === o.id)?.payments).toHaveLength(2)
    expect(getState().trash.some((t) => t.id === item.id)).toBe(false)
    expect(getState().audit[0].action).toBe('Pulihkan dari Sampah')
  })

  it('batal pembayaran lalu pulihkan mengembalikan kas dan status bayar', () => {
    const o = newOrder(10000)
    const before = cash()
    const p = getState().orders.find((x) => x.id === o.id)!.payments[0]
    cancelPayment(o.id, p.id, 'Salah nominal')
    expect(cash()).toBe(before - 10000)
    restoreFromTrash(getState().trash[0].id)
    expect(cash()).toBe(before)
    expect(getState().orders.find((x) => x.id === o.id)?.paid).toBe(10000)
  })

  it('pengeluaran, gaji, dan proyek ikut kembali bersama kasnya', () => {
    const start = cash()
    addExpense('Sampah uji', 'Operasional', 20000, 'cash')
    const e = getState().expenses.find((x) => x.description === 'Sampah uji')!
    deleteExpense(e.id, 'Salah catat')
    restoreFromTrash(getState().trash[0].id)
    expect(cash()).toBe(start - 20000)

    const emp = addEmployee('Gaji Sampah', 'Cuci', 50000)
    payWeeklySalary(emp.id, '2026-02-02', 50000, 'cash', new Date(2026, 1, 9))
    const afterPay = cash()
    cancelPayroll(getState().payrolls.find((p) => p.employeeId === emp.id)!.id, 'Salah karyawan')
    restoreFromTrash(getState().trash[0].id)
    expect(cash()).toBe(afterPay)

    const pr = createProject({ customerId: 'c1', name: 'Proyek Sampah', targetPcs: 10, rateType: 'pcs', rate: 1000, note: '' })
    addProjectBatch(pr.id, { pcs: 10, kg: 0 })
    addProjectPayment(pr.id, 5000, 'cash')
    const withProject = cash()
    deleteProject(pr.id, 'Proyek batal')
    expect(cash()).toBe(withProject - 5000)
    restoreFromTrash(getState().trash[0].id)
    expect(cash()).toBe(withProject)
    expect(getState().projectBatches.some((b) => b.projectId === pr.id)).toBe(true)
  })

  it('pengajuan dan pelanggan master bisa dipulihkan', () => {
    deleteRequest('r1')
    expect(getState().requests.some((r) => r.id === 'r1')).toBe(false)
    restoreFromTrash(getState().trash[0].id)
    expect(getState().requests.some((r) => r.id === 'r1')).toBe(true)

    const c = addCustomer('Master Sampah', rid())
    deleteCustomer(c.id)
    restoreFromTrash(getState().trash[0].id)
    expect(getState().customers.some((x) => x.id === c.id)).toBe(true)
  })
})

describe('Sampah: penolakan', () => {
  it('menolak bila induk sudah tidak ada atau ID bentrok', () => {
    const c = addCustomer('Induk Sampah', rid())
    const o = createOrder({
      customerId: c.id,
      items: [{ serviceId: svc('Cuci Setrika Reguler'), name: 'Cuci Setrika', unit: 'kg', qty: 3, price: 8000 }],
      skipMinKg: false,
      note: '',
      initialPayment: null,
    })
    deleteOrder(o.id, 'Pesanan uji')
    const orderItem = getState().trash[0]
    deleteCustomer(c.id)
    expect(restoreBlocker(orderItem)).toMatch(/pelanggan induknya/)
    expect(() => restoreFromTrash(orderItem.id)).toThrow(/pelanggan/)
    // pulihkan pelanggan dulu, lalu pesanan bisa
    restoreFromTrash(getState().trash[0].id)
    restoreFromTrash(orderItem.id)
    expect(getState().orders.some((x) => x.id === o.id)).toBe(true)
  })

  it('menolak bila data berubah sejak dibatalkan', () => {
    const o = newOrder(10000)
    const p = getState().orders.find((x) => x.id === o.id)!.payments[0]
    cancelPayment(o.id, p.id, 'Salah nominal')
    const item = getState().trash[0]
    addPayment(o.id, 1000, 'cash') // order berubah lagi
    expect(() => restoreFromTrash(item.id)).toThrow(/sudah berubah/)
  })

  it('hapus permanen dari Sampah tercatat di Audit', () => {
    deleteRequest('r2')
    const item = getState().trash[0]
    purgeTrash(item.id)
    expect(getState().trash.some((t) => t.id === item.id)).toBe(false)
    expect(getState().audit[0].action).toBe('Hapus permanen')
    expect(() => restoreFromTrash(item.id)).toThrow(/tidak ditemukan/)
  })
})

describe('uji properti: kas seimbang setelah hapus dan pulihkan acak', () => {
  it('kas dari pembayaran selalu sama dengan jumlah pembayaran pesanan', () => {
    let seed = 987
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let step = 0; step < 300; step++) {
      const r = rnd()
      const s = getState()
      if (r < 0.3 || s.orders.length < 3) {
        const o = newOrder(rnd() < 0.5 ? 8000 : 0)
        if (rnd() < 0.3) {
          setOrderStatus(o.id, 'processing')
        }
      } else if (r < 0.5) {
        const o = s.orders[Math.floor(rnd() * s.orders.length)]
        if (o.total - o.paid > 0) addPayment(o.id, Math.min(1000, o.total - o.paid), 'cash')
      } else if (r < 0.65) {
        const o = s.orders.find((x) => x.payments.length > 0)
        if (o) cancelPayment(o.id, o.payments[0].id, 'Uji acak')
      } else if (r < 0.8) {
        const o = s.orders[Math.floor(rnd() * s.orders.length)]
        deleteOrder(o.id, 'Uji acak')
      } else if (s.trash.length > 0) {
        const item = s.trash[Math.floor(rnd() * s.trash.length)]
        if (!restoreBlocker(item)) restoreFromTrash(item.id)
      }
      const now = getState()
      const fromPayments = now.orders.flatMap((o) => o.payments).reduce((n, p) => n + p.amount, 0)
      const cashIn = now.cash.filter((c) => c.category === 'Pembayaran').reduce((n, c) => n + c.amount, 0)
      expect(cashIn).toBe(fromPayments)
      for (const o of now.orders) expect(o.paid).toBe(o.payments.reduce((n, p) => n + p.amount, 0))
    }
  })
})
