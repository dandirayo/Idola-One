import { describe, expect, it } from 'vitest'
import { backupJson, customersCsv, previewBackup, restoreBackup, servicesCsv } from './backup'
import { addCustomer, getState } from './store'

describe('backup bolak-balik', () => {
  it('ekspor lalu pulihkan mengembalikan data persis dan mencatat Audit', () => {
    const raw = backupJson()
    const before = getState()
    const c = addCustomer('Setelah Backup', '081200099999')
    expect(getState().customers.some((x) => x.id === c.id)).toBe(true)

    expect(restoreBackup(raw)).toBe(true)
    const after = getState()
    expect(after.customers).toEqual(before.customers)
    expect(after.orders).toEqual(before.orders)
    expect(after.cash).toEqual(before.cash)
    expect(after.audit[0].action).toBe('Pulihkan dari backup')
  })

  it('menolak berkas rusak, bukan JSON, atau versi lain tanpa mengubah data', () => {
    const snapshot = JSON.stringify(getState().customers)
    for (const bad of ['bukan json', '{}', '{"version":99,"state":{}}', '[]']) {
      expect(previewBackup(bad).ok).toBe(false)
      expect(restoreBackup(bad)).toBe(false)
    }
    expect(JSON.stringify(getState().customers)).toBe(snapshot)
  })

  it('ringkasan menghitung isi berkas', () => {
    const p = previewBackup(backupJson())
    expect(p.ok).toBe(true)
    expect(p.counts.find((c) => c.label === 'Pelanggan')?.count).toBe(getState().customers.length)
  })

  it('CSV pelanggan dan layanan memuat judul dan baris data', () => {
    expect(customersCsv().split('\r\n')[0]).toBe('Nama,WhatsApp,Status')
    expect(servicesCsv().split('\r\n')).toHaveLength(getState().services.length + 1)
  })
})

describe('ubah info pesanan', () => {
  it('mengganti penanggung jawab dan catatan, tercatat di Audit, uang tidak berubah', async () => {
    const { updateOrderInfo } = await import('./admin')
    const o = getState().orders[0]
    const cashBefore = JSON.stringify(getState().cash)
    updateOrderInfo(o.id, 'Dika', 'Pisahkan yang putih')
    const after = getState().orders.find((x) => x.id === o.id)!
    expect(after.cashier).toBe('Dika')
    expect(after.note).toBe('Pisahkan yang putih')
    expect(getState().audit[0].action).toBe('Ubah info pesanan')
    expect(JSON.stringify(getState().cash)).toBe(cashBefore)
    expect(() => updateOrderInfo(o.id, 'Orang Asing', '')).toThrow(/daftar karyawan/)
  })
})
