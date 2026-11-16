import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import { addProjectBatch, addProjectPayment, createProject, projectBilled, projectPaid, setProjectStatus } from './projects'
import { payIncentive, payWeeklySalary } from './payroll'
import {
  addManualCash,
  completeRequest,
  consumeStock,
  createOrder,
  createRequest,
  decideRequest,
  getOrder,
  getState,
  setOrderStatus,
  updateOrderKiloLines,
  updateService,
} from './store'

const cashBalance = () => balance(getState().cash)

describe('proyek B2B', () => {
  it('proyek contoh: tagihan dari batch, terbayar, dan kemajuan', () => {
    expect(projectBilled('pr1')).toBe(700000) // 200 pcs x 3.500
    expect(projectPaid('pr1')).toBe(300000)
  })

  it('validasi pembuatan proyek', () => {
    const base = { customerId: 'c1', name: 'Asrama', targetPcs: 100, rateType: 'pcs' as const, rate: 3000, note: '' }
    expect(() => createProject({ ...base, customerId: 'tidak-ada' })).toThrow(/pelanggan/)
    expect(() => createProject({ ...base, name: ' ' })).toThrow(/Nama/)
    expect(() => createProject({ ...base, targetPcs: 0 })).toThrow(/Target/)
    expect(() => createProject({ ...base, rate: 0 })).toThrow(/Tarif/)
  })

  it('batch menambah tagihan, pembayaran menjadi kas masuk dan tidak boleh melebihi tagihan', () => {
    const p = createProject({ customerId: 'c1', name: 'Asrama Putra', targetPcs: 100, rateType: 'pcs', rate: 3000, note: '' })
    expect(projectBilled(p.id)).toBe(0)
    expect(() => addProjectPayment(p.id, 1000, 'cash')).toThrow(/melebihi/) // belum ada batch

    addProjectBatch(p.id, { pcs: 50, kg: 0 })
    expect(projectBilled(p.id)).toBe(150000)

    const before = cashBalance()
    addProjectPayment(p.id, 100000, 'transfer')
    expect(cashBalance()).toBe(before + 100000)
    expect(getState().cash.at(-1)).toMatchObject({ category: 'Proyek', direction: 'in', amount: 100000 })
    expect(projectPaid(p.id)).toBe(100000)

    expect(() => addProjectPayment(p.id, 60000, 'cash')).toThrow(/melebihi/) // sisa 50.000
    expect(cashBalance()).toBe(before + 100000)
    addProjectPayment(p.id, 50000, 'cash')
    expect(getState().audit.some((a) => a.entity === 'Proyek' && a.action === 'Pembayaran termin')).toBe(true)
  })

  it('batch tidak valid atau di masa depan ditolak; proyek selesai tidak menerima batch', () => {
    const p = createProject({ customerId: 'c1', name: 'Klinik', targetPcs: 10, rateType: 'kg', rate: 7000, note: '' })
    expect(() => addProjectBatch(p.id, { pcs: 0, kg: 0 })).toThrow(/Isi/)
    expect(() => addProjectBatch(p.id, { pcs: 1, kg: 1.25 })).toThrow(/0,1/)
    expect(() => addProjectBatch(p.id, { pcs: 1, kg: 1 }, new Date(Date.now() + 5 * 86_400_000))).toThrow(/masa depan/)
    setProjectStatus(p.id, 'done')
    expect(() => addProjectBatch(p.id, { pcs: 1, kg: 1 })).toThrow(/selesai/)
    expect(() => addProjectPayment(p.id, 1000, 'cash')).toThrow(/selesai/)
  })
})

describe('gaji mingguan', () => {
  const now = new Date(2026, 10, 18, 12) // Rabu; minggu berjalan mulai Senin 2026-11-16

  it('membayar menjadi pengeluaran Gaji dan kas keluar, sekali per karyawan per minggu', () => {
    const before = cashBalance()
    payWeeklySalary('em1', '2026-11-09', 350000, 'cash', now)
    expect(cashBalance()).toBe(before - 350000)
    expect(getState().expenses[0]).toMatchObject({ category: 'Gaji', amount: 350000 })
    expect(() => payWeeklySalary('em1', '2026-11-09', 350000, 'cash', now)).toThrow(/sudah dibayar/)
    expect(cashBalance()).toBe(before - 350000)
    payWeeklySalary('em2', '2026-11-09', 300000, 'cash', now) // karyawan lain, minggu sama: boleh
  })

  it('menolak minggu bukan Senin, minggu yang belum mulai, dan gaji tidak valid', () => {
    expect(() => payWeeklySalary('em1', '2026-11-10', 350000, 'cash', now)).toThrow(/Senin/)
    expect(() => payWeeklySalary('em1', '2026-11-23', 350000, 'cash', now)).toThrow(/belum dimulai/)
    expect(() => payWeeklySalary('em1', 'salah', 350000, 'cash', now)).toThrow(/tidak valid/)
    expect(() => payWeeklySalary('em3', '2026-11-02', 0, 'cash', now)).toThrow(/Gaji/)
    expect(() => payWeeklySalary('em3', '2026-11-02', 100.5, 'cash', now)).toThrow(/Gaji/)
    expect(() => payWeeklySalary('tidak-ada', '2026-11-02', 100000, 'cash', now)).toThrow(/Karyawan/)
  })
})

function sepatuOrder(perUnit: number, employeeId = 'em1', qty = 2) {
  return createOrder({
    customerId: 'c1',
    items: [{ serviceId: 's7', name: 'Sepatu', unit: 'pcs', qty, price: 40000, incentive: { perUnit, employeeId } }],
    skipMinKg: false,
    note: '',
    initialPayment: null,
  })
}

describe('insentif item', () => {
  it('hak insentif tercatat saat Siap Diambil, walau belum dibayar pelanggan, dan tidak ganda', () => {
    const o = sepatuOrder(15000)
    expect(getState().incentives.some((i) => i.orderId === o.id)).toBe(false)
    setOrderStatus(o.id, 'processing')
    expect(getState().incentives.some((i) => i.orderId === o.id)).toBe(false)
    setOrderStatus(o.id, 'ready')
    const rows = getState().incentives.filter((i) => i.orderId === o.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ employeeId: 'em1', qty: 2, perUnit: 15000, amount: 30000, status: 'earned' })
    expect(getOrder(o.id)!.paid).toBe(0) // belum dibayar pelanggan
  })

  it('insentif yang belum dibayar tidak mengurangi kas; dibayar sekali menjadi kas keluar', () => {
    const o = sepatuOrder(10000, 'em2', 3)
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, 'ready')
    const inc = getState().incentives.find((i) => i.orderId === o.id)!
    const before = cashBalance()
    payIncentive(inc.id, 'cash')
    expect(cashBalance()).toBe(before - 30000)
    expect(getState().incentives.find((i) => i.id === inc.id)).toMatchObject({ status: 'paid' })
    expect(getState().expenses[0].category).toBe('Insentif')
    expect(() => payIncentive(inc.id, 'cash')).toThrow(/sudah dibayar/)
    expect(cashBalance()).toBe(before - 30000)
    expect(getState().notifications[0]).toMatchObject({ audience: 'employee', forName: 'Dika', title: 'Insentif dibayar' })
  })

  it('pesanan dibatalkan sebelum Siap Diambil tidak menghasilkan insentif', () => {
    const o = sepatuOrder(20000)
    setOrderStatus(o.id, 'cancelled')
    expect(getState().incentives.some((i) => i.orderId === o.id)).toBe(false)
  })

  it('nilai Rp0 tidak membuat insentif', () => {
    const o = sepatuOrder(0)
    expect(getOrder(o.id)!.items[0].incentive).toBeUndefined()
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, 'ready')
    expect(getState().incentives.some((i) => i.orderId === o.id)).toBe(false)
  })

  it('menolak nilai di luar pilihan, layanan tanpa insentif, dan karyawan nonaktif atau tidak ada', () => {
    expect(() => sepatuOrder(5000)).toThrow(/tidak valid/)
    expect(() => sepatuOrder(10000, 'tidak-ada')).toThrow(/aktif/)
    expect(() =>
      createOrder({
        customerId: 'c1',
        items: [{ serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 1, price: 30000, incentive: { perUnit: 10000, employeeId: 'em1' } }],
        skipMinKg: false,
        note: '',
        initialPayment: null,
      }),
    ).toThrow(/tidak mendapat insentif/)
  })

  it('transisi status yang tidak diizinkan ditolak', () => {
    const o = sepatuOrder(0)
    expect(() => setOrderStatus(o.id, 'picked_up')).toThrow(/tidak bisa diubah/)
    expect(() => setOrderStatus(o.id, 'ready')).toThrow(/tidak bisa diubah/)
    expect(() => setOrderStatus('tidak-ada', 'processing')).toThrow(/tidak ditemukan/)
  })
})

describe('kas manual', () => {
  it('masuk dan keluar mengubah saldo, tercatat di audit, dan ditandai manual', () => {
    const before = cashBalance()
    addManualCash('in', 'Setoran modal', 'Modal', 200000, 'transfer')
    expect(cashBalance()).toBe(before + 200000)
    addManualCash('out', 'Ambil pribadi', '', 50000, 'cash')
    expect(cashBalance()).toBe(before + 150000)
    const last = getState().cash.at(-1)!
    expect(last).toMatchObject({ manual: true, category: 'Kas Manual', direction: 'out' })
    expect(getState().audit[0]).toMatchObject({ entity: 'Kas', action: 'Kas manual' })
  })

  it('validasi: deskripsi, nominal, dan kategori yang dicadangkan', () => {
    expect(() => addManualCash('in', ' ', 'x', 1000, 'cash')).toThrow(/Deskripsi/)
    expect(() => addManualCash('in', 'x', 'x', 0, 'cash')).toThrow(/Nominal/)
    expect(() => addManualCash('in', 'x', 'Saldo Awal', 1000, 'cash')).toThrow(/dicadangkan/)
  })
})

describe('ubah layanan kiloan', () => {
  const kiloOrder = () =>
    createOrder({
      customerId: 'c1',
      items: [
        { serviceId: 's1', name: 'Cuci Setrika', unit: 'kg', qty: 4, price: 8000 },
        { serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 1, price: 30000 },
      ],
      skipMinKg: false,
      note: '',
      initialPayment: { amount: 20000, method: 'cash' },
    })

  it('menghitung ulang total dari katalog, mempertahankan item satuan, dan mencatat audit', () => {
    const o = kiloOrder() // 32.000 + 30.000 = 62.000
    expect(o.total).toBe(62000)
    updateOrderKiloLines(o.id, [{ serviceId: 's2', qty: 5 }]) // Cuci Kering 6.000 x 5 = 30.000 + Jas
    const after = getOrder(o.id)!
    expect(after.total).toBe(60000)
    expect(after.items.map((i) => i.name)).toEqual(['Cuci Kering', 'Jas'])
    expect(after.paid).toBe(20000)
    expect(getState().audit[0]).toMatchObject({ entity: 'Pesanan', action: 'Ubah layanan kiloan' })
  })

  it('tidak boleh membuat total lebih kecil dari yang sudah dibayar', () => {
    const o = kiloOrder()
    expect(() => updateOrderKiloLines(o.id, [{ serviceId: 's3', qty: 3 }])).not.toThrow() // 15.000 + 30.000 = 45.000
    const o2 = createOrder({
      customerId: 'c1',
      items: [{ serviceId: 's1', name: 'Cuci Setrika', unit: 'kg', qty: 4, price: 8000 }],
      skipMinKg: false,
      note: '',
      initialPayment: { amount: 32000, method: 'cash' },
    })
    expect(() => updateOrderKiloLines(o2.id, [{ serviceId: 's3', qty: 3 }])).toThrow(/lebih kecil/)
    expect(getOrder(o2.id)!.total).toBe(32000)
  })

  it('menolak layanan satuan, berat tidak valid, daftar kosong, dan pesanan yang sudah diambil atau batal', () => {
    const o = kiloOrder()
    expect(() => updateOrderKiloLines(o.id, [{ serviceId: 's4', qty: 1 }])).toThrow(/kiloan/)
    expect(() => updateOrderKiloLines(o.id, [{ serviceId: 's1', qty: 0 }])).toThrow(/Berat/)
    expect(() => updateOrderKiloLines(o.id, [{ serviceId: 's1', qty: 1.25 }])).toThrow(/0,1/)
    expect(() => updateOrderKiloLines(o.id, [])).toThrow(/minimal/)
    setOrderStatus(o.id, 'cancelled')
    expect(() => updateOrderKiloLines(o.id, [{ serviceId: 's1', qty: 3 }])).toThrow(/tidak bisa diubah/)
  })
})

describe('notifikasi dan audit dari aksi', () => {
  it('pengajuan baru memberi tahu owner, keputusan memberi tahu pengaju', () => {
    const r = createRequest('leave', 'Sari', 'Izin sakit', 0)
    expect(getState().notifications[0]).toMatchObject({ audience: 'owner', link: '/requests/review', read: false })
    decideRequest(r.id, 'approve', '')
    expect(getState().notifications[0]).toMatchObject({ audience: 'employee', forName: 'Sari', link: '/requests/me' })
    expect(getState().notifications[0].title).toMatch(/disetujui/)
  })

  it('stok yang melewati batas minimum memberi tahu owner sekali', () => {
    // Pewangi i5: stok 6, minimum 3
    const count = () => getState().notifications.filter((n) => n.title.includes('Pewangi')).length
    const before = count()
    consumeStock('i5', 2, '') // 4: belum menipis
    expect(count()).toBe(before)
    consumeStock('i5', 1, '') // 3: sama dengan minimum, melewati batas
    expect(count()).toBe(before + 1)
    consumeStock('i5', 1, '') // sudah di bawah minimum, tidak diberi tahu lagi
    expect(count()).toBe(before + 1)
  })

  it('perubahan harga layanan tercatat di audit, perubahan tanpa beda tidak', () => {
    const before = getState().audit.length
    updateService('s1', 'Cuci Setrika', 8000)
    expect(getState().audit.length).toBe(before)
    updateService('s1', 'Cuci Setrika', 8500)
    expect(getState().audit[0]).toMatchObject({ entity: 'Layanan', action: 'Ubah layanan' })
    updateService('s1', 'Cuci Setrika', 8000)
  })

  it('Pesanan Siap Diambil memberi tahu owner', () => {
    const o = createOrder({
      customerId: 'c1',
      items: [{ serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 1, price: 30000 }],
      skipMinKg: false,
      note: '',
      initialPayment: null,
    })
    setOrderStatus(o.id, 'processing')
    setOrderStatus(o.id, 'ready')
    expect(getState().notifications[0]).toMatchObject({ audience: 'owner', title: 'Pesanan siap diambil', link: `/orders/${o.id}` })
  })
})

describe('Lupa Absen', () => {
  it('validasi isian pengajuan', () => {
    expect(() => createRequest('forgot_attendance', 'Rina', 'Lupa', 0)).toThrow(/tanggal dan jam/)
    expect(() => createRequest('forgot_attendance', 'Rina', 'Lupa', 0, { date: 'salah', checkIn: '08:00' })).toThrow(/Tanggal/)
    expect(() => createRequest('forgot_attendance', 'Rina', 'Lupa', 0, { date: '2999-01-01', checkIn: '08:00' })).toThrow(/masa depan/)
    expect(() => createRequest('forgot_attendance', 'Rina', 'Lupa', 0, { date: '2026-03-03', checkIn: '8:00' })).toThrow(/HH:mm/)
    expect(() => createRequest('forgot_attendance', 'Rina', 'Lupa', 0, { date: '2026-03-03', checkIn: '16:00', checkOut: '08:00' })).toThrow(/setelah/)
  })

  it('setelah disetujui dan dilaksanakan membuat absensi manual dengan keterlambatan dari jadwal', () => {
    // Selasa, 3 Maret 2026: Rina shift pagi 08:00, masuk 08:25 -> terlambat 25
    const r = createRequest('forgot_attendance', 'Rina', 'HP mati', 0, { date: '2026-03-03', checkIn: '08:25', checkOut: '16:00' })
    expect(() => completeRequest(r.id)).toThrow(/Setujui/)
    decideRequest(r.id, 'approve', '')
    completeRequest(r.id)
    const rec = getState().attendance.find((a) => a.employeeId === 'em1' && a.date === '2026-03-03')!
    expect(rec).toMatchObject({ source: 'manual', lateMinutes: 25 })
    expect(rec.checkOut).toBeDefined()
  })

  it('menolak bila tanggal itu sudah punya absensi', () => {
    const r = createRequest('forgot_attendance', 'Rina', 'Lagi', 0, { date: '2026-03-03', checkIn: '09:00' })
    decideRequest(r.id, 'approve', '')
    expect(() => completeRequest(r.id)).toThrow(/Sudah ada absensi/)
  })
})
