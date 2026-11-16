import { describe, expect, it } from 'vitest'
import { isVisibleTo, safeInternalPath } from './notifications'

describe('safeInternalPath', () => {
  it('menerima route internal termasuk query', () => {
    expect(safeInternalPath('/requests/review')).toBe('/requests/review')
    expect(safeInternalPath('/orders?q=Sinta')).toBe('/orders?q=Sinta')
  })

  it('menolak tautan luar, skema lain, jalur ganda, dan naik direktori', () => {
    for (const bad of [
      'https://contoh.com',
      '//contoh.com',
      'javascript:alert(1)',
      '/../rahasia',
      'orders',
      '/a b',
      '/x<script>',
    ]) {
      expect(safeInternalPath(bad), bad).toBe('/dashboard')
    }
  })

  it('kosong menuju Beranda', () => {
    expect(safeInternalPath('')).toBe('/dashboard')
    expect(safeInternalPath(undefined)).toBe('/dashboard')
    expect(safeInternalPath(null)).toBe('/dashboard')
  })
})

describe('isVisibleTo', () => {
  it('owner hanya melihat notifikasi audiens owner', () => {
    expect(isVisibleTo({ audience: 'owner' }, { role: 'owner', name: 'Dandi' })).toBe(true)
    expect(isVisibleTo({ audience: 'employee' }, { role: 'owner', name: 'Dandi' })).toBe(false)
  })

  it('karyawan melihat yang ditujukan kepadanya atau untuk semua karyawan', () => {
    const rina = { role: 'employee' as const, name: 'Rina' }
    expect(isVisibleTo({ audience: 'employee', forName: 'Rina' }, rina)).toBe(true)
    expect(isVisibleTo({ audience: 'employee' }, rina)).toBe(true)
    expect(isVisibleTo({ audience: 'employee', forName: 'Dika' }, rina)).toBe(false)
    expect(isVisibleTo({ audience: 'owner' }, rina)).toBe(false)
  })
})
