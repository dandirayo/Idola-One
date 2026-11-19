import { describe, expect, it } from 'vitest'
import { planExport, planImport, stripCs, withCs, type GoogleContact } from './contact-sync'

const g = (name: string, phones: string[], id = name): GoogleContact => ({ resourceName: `people/${id}`, etag: 'e', name, phones })

describe('akhiran CS', () => {
  it('ditambah sekali, tidak dobel', () => {
    expect(withCs('Bu Sinta')).toBe('Bu Sinta CS')
    expect(withCs('Bu Sinta CS')).toBe('Bu Sinta CS')
    expect(withCs('  Bu   Sinta cs ')).toBe('Bu Sinta CS')
  })
  it('dibuang saat impor', () => {
    expect(stripCs('Bu Sinta CS')).toBe('Bu Sinta')
    expect(stripCs('Cassie')).toBe('Cassie')
  })
})

describe('planExport', () => {
  it('membuat kontak baru dengan nama CS bila nomor belum ada di Google', () => {
    const plan = planExport([{ id: 'c1', name: 'Bu Sinta', phone: '0812-3456-7890' }], [])
    expect(plan.create).toEqual([{ customerId: 'c1', name: 'Bu Sinta CS', phone: '0812-3456-7890' }])
  })
  it('nomor sudah ada (format beda): tidak dibuat ulang, nama disamakan', () => {
    const plan = planExport([{ id: 'c1', name: 'Bu Sinta', phone: '081234567890' }], [g('Sinta', ['+62 812-3456-7890'])])
    expect(plan.create).toHaveLength(0)
    expect(plan.rename).toEqual([{ resourceName: 'people/Sinta', etag: 'e', name: 'Bu Sinta CS' }])
  })
  it('nama sudah sama: dilewati; nomor tidak valid atau kembar: dilewati', () => {
    const plan = planExport(
      [
        { id: 'c1', name: 'Bu Sinta', phone: '081234567890' },
        { id: 'c2', name: 'Kembar', phone: '6281234567890' },
        { id: 'c3', name: 'Rusak', phone: '123' },
      ],
      [g('Bu Sinta CS', ['081234567890'])],
    )
    expect(plan.create).toHaveLength(0)
    expect(plan.rename).toHaveLength(0)
    expect(plan.skipped).toBe(3)
  })
  it('sinkron kedua kali tidak membuat kontak ganda', () => {
    const customers = [{ id: 'c1', name: 'Pak Raka', phone: '081299998888' }]
    const first = planExport(customers, [])
    const google = first.create.map((c, i) => g(c.name, [c.phone], String(i)))
    const second = planExport(customers, google)
    expect(second.create).toHaveLength(0)
    expect(second.rename).toHaveLength(0)
  })
})

describe('planImport', () => {
  it('menambah kontak baru tanpa akhiran CS dan melewati nomor yang sudah ada', () => {
    const plan = planImport(
      [g('Bu Sinta CS', ['0812 3456 7890']), g('Pak Raka', ['081299998888']), g('Tanpa Nomor', []), g('', ['081277776666'])],
      [{ id: 'c1', name: 'Raka', phone: '6281299998888' }],
    )
    expect(plan.add).toEqual([{ name: 'Bu Sinta', phone: '081234567890' }])
    expect(plan.skipped).toBe(3)
  })
  it('nomor kembar di Google hanya diambil sekali', () => {
    const plan = planImport([g('A', ['081211112222'], 'a'), g('B', ['+6281211112222'], 'b')], [])
    expect(plan.add).toHaveLength(1)
  })
})
