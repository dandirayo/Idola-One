import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import {
  addInventoryItem,
  cancelIncentivePayment,
  cancelPayment,
  cancelPayroll,
  cancelRequestPayment,
  customerUsage,
  deleteAttendance,
  deleteBusiness,
  deleteCustomer,
  deleteEmployee,
  deleteExpense,
  deleteInventoryItem,
  deleteManualCash,
  deleteOrder,
  deletePosProduct,
  deleteProject,
  deleteProjectBatch,
  deleteProjectPayment,
  deleteRequest,
  deleteService,
  updateBusiness,
  updateExpense,
  updateInventoryItem,
  updateManualCash,
} from './admin'
import { addPosProduct, createPosSale, setPosDay } from './pos'
import { addProjectBatch, addProjectPayment, createProject } from './projects'
import { payIncentive, payWeeklySalary } from './payroll'
import {
  addCustomer,
  addEmployee,
  addExpense,
  addManualCash,
  addPayment,
  addService,
  buyStock,
  createOrder,
  createRequest,
  decideRequest,
  getState,
  payRequest,
  setOrderStatus,
  type Order,
} from './store'
import { addBeverageBusiness } from './business'
import { serviceByName } from './seed-services'

const svc = (name: string) => serviceByName(name).id

const cash = () => balance(getState().cash)
const lastAudit = () => getState().audit[0]

function newOrder(paid = 0, status?: 'ready'): Order {
  const customer = addCustomer(`Tes ${Math.random()}`, `0813${Math.floor(Math.random() * 1e8)}`)
  const o = createOrder({
    customerId: customer.id,
    items: [{ serviceId: svc('Cuci Setrika Reguler'), name: 'Cuci Setrika', unit: 'kg', qty: 3, price: 8000 }],
    skipMinKg: false,
    note: '',
    initialPayment: paid > 0 ? { amount: paid, method: 'cash' } : null,
  })
  if (status) {
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, status)
  }
  return o
}

describe('alasan wajib', () => {
  it('menolak alasan kosong atau terlalu pendek untuk data uang', () => {
    const o = newOrder(10000)
    expect(() => deleteOrder(o.id, '')).toThrow(/Alasan/)
    expect(() => deleteOrder(o.id, 'abc')).toThrow(/Alasan/)
    expect(getState().orders.some((x) => x.id === o.id)).toBe(true)
  })
})

describe('hapus pesanan', () => {
  it('membalik kas masuk semua pembayaran dan menyimpan salinan di audit', () => {
    const before = cash()
    const o = newOrder(10000)
    addPayment(o.id, 5000, 'transfer')
    expect(cash()).toBe(before + 15000)
    deleteOrder(o.id, 'Salah input pelanggan')
    expect(cash()).toBe(before)
    expect(getState().orders.some((x) => x.id === o.id)).toBe(false)
    expect(lastAudit().action).toBe('Hapus pesanan')
    expect(lastAudit().ref).toBe(o.number)
    expect(lastAudit().before).toContain('total Rp')
    expect(lastAudit().after).toContain('Salah input pelanggan')
  })

  it('boleh menghapus pesanan berstatus Diambil dan lunas', () => {
    const before = cash()
    const o = newOrder(24000)
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, 'ready')
    setOrderStatus(o.id, 'picked_up')
    deleteOrder(o.id, 'Pesanan percobaan')
    expect(cash()).toBe(before)
  })

  it('hak insentif belum dibayar ikut hilang, yang sudah dibayar tetap', () => {
    const customer = addCustomer('Insentif Tes', `0814${Math.floor(Math.random() * 1e8)}`)
    const mk = () =>
      createOrder({
        customerId: customer.id,
        items: [{ serviceId: svc('Sepatu Bagus'), name: 'Sepatu Bagus', unit: 'pasang', qty: 1, price: 40000, incentive: { perUnit: 10000, employeeId: 'em2' } }],
        skipMinKg: false,
        note: '',
        initialPayment: null,
      })
    const a = mk()
    const b = mk()
    for (const o of [a, b]) {
      setOrderStatus(o.id, 'processing')
      setOrderStatus(o.id, 'ready')
    }
    const incB = getState().incentives.find((i) => i.orderId === b.id)!
    payIncentive(incB.id, 'cash')
    deleteOrder(a.id, 'Pesanan dobel')
    deleteOrder(b.id, 'Pesanan dobel')
    expect(getState().incentives.some((i) => i.orderId === a.id)).toBe(false)
    expect(getState().incentives.find((i) => i.id === incB.id)?.status).toBe('paid')
  })
})

describe('batalkan pembayaran', () => {
  it('membalik kas dan menghitung ulang status bayar', () => {
    const o = newOrder(10000)
    const before = cash()
    const p = getState().orders.find((x) => x.id === o.id)!.payments[0]
    cancelPayment(o.id, p.id, 'Salah catat nominal')
    expect(cash()).toBe(before - 10000)
    expect(getState().orders.find((x) => x.id === o.id)!.paid).toBe(0)
    expect(() => cancelPayment(o.id, p.id, 'Salah catat nominal')).toThrow(/tidak ditemukan/)
  })
})

describe('pengeluaran dan kas manual', () => {
  it('hapus dan ubah pengeluaran biasa menyesuaikan kas', () => {
    const before = cash()
    addExpense('Plastik sampah', 'Operasional', 20000, 'cash')
    const e = getState().expenses.find((x) => x.description === 'Plastik sampah')!
    updateExpense(e.id, { description: 'Plastik sampah besar', category: 'Operasional', amount: 30000, method: 'cash' }, 'Harga sebenarnya')
    expect(cash()).toBe(before - 30000)
    deleteExpense(e.id, 'Dobel catat')
    expect(cash()).toBe(before)
  })

  it('pengeluaran otomatis ditolak dan harus lewat sumbernya', () => {
    buyStock('i1', 1, 50000, 'cash', 'tes')
    const e = getState().expenses.find((x) => x.category === 'Stok')!
    expect(() => deleteExpense(e.id, 'Alasan cukup')).toThrow(/otomatis/)
  })

  it('kas manual: ubah dan hapus', () => {
    const before = cash()
    addManualCash('in', 'Setoran modal tes', 'Modal', 100000, 'cash')
    const c = getState().cash.find((x) => x.description === 'Setoran modal tes')!
    updateManualCash(c.id, { description: 'Setoran modal tes', category: 'Modal', amount: 80000, method: 'cash' }, 'Koreksi nominal')
    expect(cash()).toBe(before + 80000)
    deleteManualCash(c.id, 'Dibatalkan owner')
    expect(cash()).toBe(before)
    expect(() => deleteManualCash(getState().cash[0].id, 'Bukan kas manual')).toThrow(/kas manual/)
  })
})

describe('gaji, insentif, kasbon, proyek', () => {
  it('batal gaji membalik kas dan minggu itu bisa dibayar ulang', () => {
    const emp = addEmployee('Gaji Tes', 'Cuci', 100000)
    const monday = '2026-01-05'
    const before = cash()
    payWeeklySalary(emp.id, monday, 100000, 'cash', new Date(2026, 0, 12))
    expect(cash()).toBe(before - 100000)
    const row = getState().payrolls.find((p) => p.employeeId === emp.id)!
    cancelPayroll(row.id, 'Salah karyawan')
    expect(cash()).toBe(before)
    payWeeklySalary(emp.id, monday, 100000, 'cash', new Date(2026, 0, 12))
    expect(cash()).toBe(before - 100000)
  })

  it('batal insentif mengembalikan status dan kas', () => {
    const customer = addCustomer('Inc2', `0815${Math.floor(Math.random() * 1e8)}`)
    const o = createOrder({
      customerId: customer.id,
      items: [{ serviceId: svc('Helm'), name: 'Helm', unit: 'pcs', qty: 2, price: 35000, incentive: { perUnit: 10000, employeeId: 'em2' } }],
      skipMinKg: false,
      note: '',
      initialPayment: null,
    })
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, 'ready')
    const inc = getState().incentives.find((i) => i.orderId === o.id)!
    const before = cash()
    payIncentive(inc.id, 'cash')
    cancelIncentivePayment(inc.id, 'Belum waktunya')
    expect(cash()).toBe(before)
    expect(getState().incentives.find((i) => i.id === inc.id)?.status).toBe('earned')
  })

  it('batal pembayaran kasbon (data contoh) membalik kas', () => {
    const before = cash()
    cancelRequestPayment('r3', 'Kasbon dibatalkan')
    expect(cash()).toBe(before + 150000)
    expect(getState().requests.find((r) => r.id === 'r3')?.status).toBe('approved')
    expect(() => deleteRequest('r1')).not.toThrow()
  })

  it('hapus pembayaran proyek dan proyek membalik kas', () => {
    const before = cash()
    const p = createProject({ customerId: 'c1', name: 'Proyek hapus', targetPcs: 100, rateType: 'pcs', rate: 1000, note: '' })
    const batch = addProjectBatch(p.id, { pcs: 50, kg: 0 })
    const pay = addProjectPayment(p.id, 30000, 'cash')
    expect(cash()).toBe(before + 30000)
    expect(() => deleteProjectBatch(batch.id)).toThrow(/lebih kecil/)
    deleteProjectPayment(pay.id, 'Salah proyek')
    expect(cash()).toBe(before)
    addProjectPayment(p.id, 10000, 'cash')
    deleteProject(p.id, 'Proyek batal')
    expect(cash()).toBe(before)
    expect(getState().projectBatches.some((b) => b.projectId === p.id)).toBe(false)
  })
})

describe('data master', () => {
  it('pelanggan dengan pesanan ditolak dengan penjelasan, tanpa pesanan boleh', () => {
    expect(customerUsage('c1').reasons.join()).toMatch(/pesanan/)
    expect(() => deleteCustomer('c1')).toThrow(/Nonaktifkan/)
    const c = addCustomer('Hapus Aku', `0816${Math.floor(Math.random() * 1e8)}`)
    deleteCustomer(c.id)
    expect(getState().customers.some((x) => x.id === c.id)).toBe(false)
    expect(lastAudit().action).toBe('Hapus pelanggan')
  })

  it('layanan yang dipakai pesanan ditolak, yang baru boleh', () => {
    expect(() => deleteService(svc('Cuci Setrika Reguler'))).toThrow(/dipakai/)
    const s = addService('Layanan Tes', 'kg', 1000)
    deleteService(s.id)
    expect(getState().services.some((x) => x.id === s.id)).toBe(false)
  })

  it('karyawan dengan riwayat ditolak, yang baru boleh', () => {
    expect(() => deleteEmployee('em1')).toThrow(/Nonaktifkan/)
    const e = addEmployee('Sementara', 'Cuci', 0)
    deleteEmployee(e.id)
    expect(getState().employees.some((x) => x.id === e.id)).toBe(false)
  })

  it('barang stok: tambah, ubah, hapus hanya bila belum ada mutasi', () => {
    const id = addInventoryItem('Hanger', 'pcs', 10)
    expect(() => addInventoryItem('hanger', 'pcs', 1)).toThrow(/sudah ada/)
    updateInventoryItem(id, 'Hanger Besi', 'pcs', 20)
    expect(getState().inventory.find((i) => i.id === id)?.min).toBe(20)
    deleteInventoryItem(id)
    expect(getState().inventory.some((i) => i.id === id)).toBe(false)
    expect(() => deleteInventoryItem('i1')).toThrow(/mutasi/)
  })

  it('produk POS dan usaha minuman', () => {
    const b = addBeverageBusiness('Kopi Tes')
    updateBusiness(b.id, 'Kopi Tes Baru')
    expect(getState().businesses.find((x) => x.id === b.id)?.name).toBe('Kopi Tes Baru')
    const p = addPosProduct(b.id, 'Kopi', 8000)
    setPosDay(b.id, true, '')
    createPosSale(b.id, [{ productId: p.id, qty: 1 }], 'cash')
    deletePosProduct(p.id) // boleh: penjualan menyimpan salinan
    expect(() => deleteBusiness(b.id)).toThrow(/penjualan/)
    expect(() => deleteBusiness('b1')).toThrow(/laundry/)
    const b2 = addBeverageBusiness('Kosong Tes')
    deleteBusiness(b2.id)
    expect(getState().businesses.some((x) => x.id === b2.id)).toBe(false)
  })
})

describe('absensi dan pengajuan', () => {
  it('hapus absensi butuh alasan dan tercatat', () => {
    expect(() => deleteAttendance('at1', '')).toThrow(/Alasan/)
    deleteAttendance('at1', 'Absen ganda')
    expect(getState().attendance.some((a) => a.id === 'at1')).toBe(false)
    expect(lastAudit().action).toBe('Hapus absensi')
  })

  it('pengajuan Dibayar tidak dihapus langsung', () => {
    const r = createRequest('cash_advance', 'Rina', 'Kasbon tes', 20000)
    decideRequest(r.id, 'approve', '')
    payRequest(r.id, 'cash')
    expect(() => deleteRequest(r.id)).toThrow(/Batalkan pembayarannya/)
  })
})

describe('uji properti: kas selalu seimbang setelah operasi acak', () => {
  it('jumlah kas dari pesanan sama dengan jumlah pembayaran yang tersisa', () => {
    let seed = 12345
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const live: Order[] = []
    for (let step = 0; step < 300; step++) {
      const r = rnd()
      if (r < 0.35 || live.length === 0) {
        live.push(newOrder(rnd() < 0.5 ? 8000 : 0))
      } else {
        const o = live[Math.floor(rnd() * live.length)]
        const cur = getState().orders.find((x) => x.id === o.id)
        if (!cur) continue
        if (r < 0.6 && cur.total - cur.paid > 0) {
          addPayment(cur.id, Math.min(1000, cur.total - cur.paid), 'cash')
        } else if (r < 0.8 && cur.payments.length > 0) {
          cancelPayment(cur.id, cur.payments[0].id, 'Uji properti')
        } else {
          deleteOrder(cur.id, 'Uji properti')
          live.splice(live.indexOf(o), 1)
        }
      }
      const s = getState()
      const fromPayments = s.orders.flatMap((o) => o.payments).reduce((n, p) => n + p.amount, 0)
      const cashIn = s.cash.filter((c) => c.category === 'Pembayaran').reduce((n, c) => n + c.amount, 0)
      expect(cashIn).toBe(fromPayments)
      for (const o of s.orders) expect(o.paid).toBe(o.payments.reduce((n, p) => n + p.amount, 0))
    }
  })
})
