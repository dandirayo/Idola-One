import { describe, expect, it } from 'vitest'
import { addEmployee, getState, setEmployeeActive, updateEmployee, updateShop } from './store'

describe('karyawan', () => {
  it('menolak nama kosong dan gaji tidak valid', () => {
    expect(() => addEmployee('  ', 'Kasir', 100000)).toThrow(/Nama/)
    expect(() => addEmployee('Uji', 'Kasir', -1)).toThrow(/Gaji/)
    expect(() => addEmployee('Uji', 'Kasir', 1000.5)).toThrow(/Gaji/)
  })

  it('jabatan kosong menjadi Karyawan', () => {
    const e = addEmployee('Tono', '  ', 250000)
    expect(e.position).toBe('Karyawan')
    expect(e.active).toBe(true)
  })

  it('memperbarui dan menonaktifkan tanpa menghapus', () => {
    const e = addEmployee('Wati', 'Cuci', 200000)
    updateEmployee(e.id, 'Wati Lestari', 'Setrika', 220000)
    setEmployeeActive(e.id, false)
    const found = getState().employees.find((x) => x.id === e.id)!
    expect(found).toMatchObject({ name: 'Wati Lestari', position: 'Setrika', weeklySalary: 220000, active: false })
  })
})

describe('pengaturan toko', () => {
  it('menolak nama toko kosong dan lebar kertas selain 58 atau 80', () => {
    expect(() => updateShop({ name: '  ' })).toThrow(/Nama toko/)
    // @ts-expect-error nilai di luar tipe sengaja dikirim untuk menguji validasi
    expect(() => updateShop({ paperWidth: 70 })).toThrow(/58 atau 80/)
  })

  it('perubahan yang ditolak tidak mengubah data toko', () => {
    const before = getState().shop
    expect(() => updateShop({ name: '' })).toThrow()
    expect(getState().shop).toBe(before)
  })

  it('menyimpan perubahan yang valid dan merapikan spasi', () => {
    updateShop({ name: '  Idola Laundry Cabang  ', paperWidth: 58 })
    expect(getState().shop.name).toBe('Idola Laundry Cabang')
    expect(getState().shop.paperWidth).toBe(58)
    updateShop({ name: 'Idola Laundry', paperWidth: 80 })
  })
})
