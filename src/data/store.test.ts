import { describe, expect, it } from 'vitest'
import {
  addCustomer,
  addPayment,
  addService,
  addServiceCategory,
  allServiceCategories,
  deleteServiceCategory,
  getState,
  renameServiceCategory,
  createOrder,
  getOrder,
  setCustomerActive,
  updateCustomer,
  updateService,
} from './store'

describe('pelanggan', () => {
  it('menolak nomor yang sudah terdaftar, termasuk beda format', () => {
    expect(() => addCustomer('Orang Lain', '+62 812 0000 0001')).toThrow(/Bu Sinta/)
  })

  it('menolak nama kosong dan nomor pendek', () => {
    expect(() => addCustomer('  ', '081299990000')).toThrow(/Nama/)
    expect(() => addCustomer('Tes', '0812')).toThrow(/Nomor/)
  })

  it('mengizinkan memperbarui dengan nomor miliknya sendiri', () => {
    const c = addCustomer('Pelanggan Uji', '081277770001')
    expect(() => updateCustomer(c.id, 'Pelanggan Uji 2', '081277770001')).not.toThrow()
  })

  it('menonaktifkan tanpa menghapus riwayat pesanan', () => {
    setCustomerActive('c2', false)
    expect(getOrder('o11')?.customerName).toBe('Pak Raka')
    setCustomerActive('c2', true)
  })
})

describe('layanan', () => {
  it('menolak harga nol, negatif, atau desimal', () => {
    expect(() => addService('Uji', 'kg', 0)).toThrow(/Harga/)
    expect(() => addService('Uji', 'kg', -1000)).toThrow(/Harga/)
    expect(() => addService('Uji', 'kg', 1500.5)).toThrow(/Harga/)
  })

  it('mengubah harga tidak mengubah item pesanan yang sudah dibuat', () => {
    const svc = addService('Layanan Snapshot', 'pcs', 10000)
    const order = createOrder({
      customerId: 'c1',
      items: [{ serviceId: svc.id, name: svc.name, unit: 'pcs', qty: 2, price: svc.price }],
      skipMinKg: false,
      note: '',
      initialPayment: null,
    })
    updateService(svc.id, svc.name, 99000)
    expect(getOrder(order.id)?.items[0].price).toBe(10000)
    expect(getOrder(order.id)?.total).toBe(20000)
  })
})

describe('pembayaran', () => {
  it('menolak nominal melebihi sisa tagihan', () => {
    const order = createOrder({
      customerId: 'c1',
      items: [{ serviceId: 's4', name: 'Jas', unit: 'pcs', qty: 1, price: 30000 }],
      skipMinKg: false,
      note: '',
      initialPayment: null,
    })
    expect(() => addPayment(order.id, 30001, 'cash')).toThrow(/melebihi/)
    addPayment(order.id, 30000, 'cash')
    expect(getOrder(order.id)?.paid).toBe(30000)
  })
})

describe('rincian layanan', () => {
  it('menyimpan subkategori, ukuran, bahan, dan estimasi; membuang teks kosong', () => {
    const s = addService('Cuci Tas Uji', 'pcs', 30000, 'Tas', { subcategory: ' Ransel ', size: 'Besar', material: '', estimateHours: 48 })
    expect(s.subcategory).toBe('Ransel')
    expect(s.size).toBe('Besar')
    expect(s.material).toBeUndefined()
    expect(s.estimateHours).toBe(48)
  })
  it('menolak estimasi bukan bilangan bulat positif', () => {
    expect(() => addService('Cuci Tas Uji 2', 'pcs', 30000, 'Tas', { estimateHours: 0 })).toThrow(/Estimasi/)
    expect(() => addService('Cuci Tas Uji 3', 'pcs', 30000, 'Tas', { estimateHours: 1.5 })).toThrow(/Estimasi/)
  })
})

describe('kategori layanan', () => {
  it('menambah kategori kosong, menolak duplikat dan nama Lainnya', () => {
    addServiceCategory('Karpet Uji')
    expect(allServiceCategories(getState())).toContain('Karpet Uji')
    expect(() => addServiceCategory(' karpet uji ')).toThrow(/sudah ada/)
    expect(() => addServiceCategory('Lainnya')).toThrow(/Lainnya/)
    expect(() => addServiceCategory('  ')).toThrow(/wajib/)
  })

  it('mengganti nama kategori pada semua layanannya dan kategori kosong', () => {
    addServiceCategory('Gorden Uji')
    const s = addService('Gorden Besar Uji', 'pcs', 40000, 'Gorden Uji')
    renameServiceCategory('Gorden Uji', 'Tirai Uji')
    expect(getState().services.find((x) => x.id === s.id)?.category).toBe('Tirai Uji')
    expect(getState().serviceCategories).not.toContain('Gorden Uji')
    expect(() => renameServiceCategory('Tirai Uji', 'Karpet Uji')).toThrow(/sudah ada/)
  })

  it('hanya menghapus kategori yang kosong', () => {
    addServiceCategory('Boneka Uji')
    addService('Boneka Besar Uji', 'pcs', 20000, 'Boneka Uji')
    expect(() => deleteServiceCategory('Boneka Uji')).toThrow(/masih dipakai/)
    addServiceCategory('Kosong Uji')
    deleteServiceCategory('Kosong Uji')
    expect(allServiceCategories(getState())).not.toContain('Kosong Uji')
  })

  it('memindahkan layanan ke kategori lain lewat updateService', () => {
    const s = addService('Pindah Uji', 'pcs', 15000, 'Boneka Uji')
    updateService(s.id, 'Pindah Uji', 15000, undefined, 'Karpet Uji')
    expect(getState().services.find((x) => x.id === s.id)?.category).toBe('Karpet Uji')
    updateService(s.id, 'Pindah Uji', 15000, undefined, '')
    expect(getState().services.find((x) => x.id === s.id)?.category).toBeUndefined()
  })
})
