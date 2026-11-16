import { describe, expect, it } from 'vitest'
import { accessibleBusinesses, canOpen, homeFor, navFor, type BusinessLike, type MemberLike } from './access'

const businesses: BusinessLike[] = [
  { id: 'b1', name: 'Laundry', kind: 'laundry', active: true },
  { id: 'b2', name: 'Es Teh', kind: 'beverage', active: true },
  { id: 'b3', name: 'Lama', kind: 'beverage', active: false },
]
const members: MemberLike[] = [
  { businessId: 'b1', employeeId: 'em1', active: true },
  { businessId: 'b2', employeeId: 'em2', active: true },
  { businessId: 'b1', employeeId: 'em2', active: false },
  { businessId: 'b3', employeeId: 'em3', active: true },
]

describe('accessibleBusinesses', () => {
  it('owner melihat semua usaha aktif, tanpa yang nonaktif', () => {
    expect(accessibleBusinesses(businesses, members, 'owner').map((b) => b.id)).toEqual(['b1', 'b2'])
  })

  it('karyawan hanya usaha dengan keanggotaan aktif', () => {
    expect(accessibleBusinesses(businesses, members, 'employee', 'em1').map((b) => b.id)).toEqual(['b1'])
    expect(accessibleBusinesses(businesses, members, 'employee', 'em2').map((b) => b.id)).toEqual(['b2'])
  })

  it('usaha nonaktif tidak bisa dipilih walau keanggotaan aktif', () => {
    expect(accessibleBusinesses(businesses, members, 'employee', 'em3')).toEqual([])
  })

  it('karyawan tanpa id tidak mendapat akses', () => {
    expect(accessibleBusinesses(businesses, members, 'employee')).toEqual([])
  })
})

describe('canOpen', () => {
  it('owner laundry bisa membuka halaman administrasi', () => {
    for (const p of ['/dashboard', '/orders/new', '/orders/o1', '/reports/payments', '/payroll', '/audit', '/businesses/manage']) {
      expect(canOpen(p, 'owner', 'laundry')).toBe(true)
    }
  })

  it('owner tidak membuka halaman khusus karyawan', () => {
    for (const p of ['/requests/me', '/attendance/me', '/shifts/me']) {
      expect(canOpen(p, 'owner', 'laundry'), p).toBe(false)
    }
    expect(canOpen('/requests/review', 'owner', 'laundry')).toBe(true)
    expect(canOpen('/attendance', 'owner', 'laundry')).toBe(true)
  })

  it('karyawan laundry tidak bisa membuka halaman owner', () => {
    for (const p of ['/cashbook', '/reports', '/employees', '/payroll', '/audit', '/settings/shop', '/projects', '/requests/review', '/attendance', '/shifts']) {
      expect(canOpen(p, 'employee', 'laundry'), p).toBe(false)
    }
  })

  it('karyawan laundry bisa membuka halaman kerjanya', () => {
    for (const p of ['/dashboard', '/orders', '/orders/new', '/customers', '/services', '/inventory', '/reports/payments', '/requests/me', '/requests/new', '/attendance/me', '/shifts/me', '/notifications']) {
      expect(canOpen(p, 'employee', 'laundry'), p).toBe(true)
    }
  })

  it('cocok per segmen, bukan per awalan teks', () => {
    expect(canOpen('/ordersx', 'owner', 'laundry')).toBe(false)
    expect(canOpen('/reports-lain', 'owner', 'laundry')).toBe(false)
    expect(canOpen('/attendance', 'employee', 'laundry')).toBe(false)
  })

  it('abaikan query dan garis miring penutup', () => {
    expect(canOpen('/orders?q=Sinta', 'employee', 'laundry')).toBe(true)
    expect(canOpen('/orders/', 'employee', 'laundry')).toBe(true)
  })

  it('usaha minuman hanya membuka POS dan notifikasi', () => {
    expect(canOpen('/pos/cashier', 'employee', 'beverage')).toBe(true)
    expect(canOpen('/orders', 'owner', 'beverage')).toBe(false)
    expect(canOpen('/cashbook', 'owner', 'beverage')).toBe(false)
  })
})

describe('navFor dan homeFor', () => {
  it('setiap menu yang ditampilkan memang boleh dibuka oleh peran itu', () => {
    for (const role of ['owner', 'employee'] as const) {
      for (const kind of ['laundry', 'beverage'] as const) {
        for (const item of navFor(role, kind)) {
          expect(canOpen(item.to, role, kind), `${role}/${kind}: ${item.to}`).toBe(true)
        }
      }
    }
  })

  it('halaman awal sesuai jenis usaha', () => {
    expect(homeFor('laundry')).toBe('/dashboard')
    expect(homeFor('beverage')).toBe('/pos')
  })
})
