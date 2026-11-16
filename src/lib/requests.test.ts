import { describe, expect, it } from 'vitest'
import { availableActions, isMoneyRequest, requestStatusLabel } from './requests'

describe('availableActions', () => {
  it('pengajuan menunggu bisa disetujui atau ditolak', () => {
    expect(availableActions('leave', 'pending')).toEqual(['approve', 'reject'])
    expect(availableActions('cash_advance', 'pending')).toEqual(['approve', 'reject'])
  })

  it('pengajuan uang yang disetujui hanya bisa dibayar', () => {
    expect(availableActions('cash_advance', 'approved')).toEqual(['pay'])
  })

  it('pengajuan non-uang yang disetujui hanya bisa ditandai dilaksanakan', () => {
    expect(availableActions('stock', 'approved')).toEqual(['complete'])
    expect(availableActions('overtime', 'approved')).toEqual(['complete'])
  })

  it('status akhir tidak punya aksi lanjutan', () => {
    for (const status of ['rejected', 'paid', 'completed'] as const) {
      expect(availableActions('cash_advance', status)).toEqual([])
    }
  })
})

describe('isMoneyRequest', () => {
  it('hanya kasbon yang berdampak uang', () => {
    expect(isMoneyRequest('cash_advance')).toBe(true)
    expect(isMoneyRequest('stock')).toBe(false)
    expect(isMoneyRequest('leave')).toBe(false)
  })
})

describe('requestStatusLabel', () => {
  it('menampilkan completed sebagai Dilaksanakan, bukan Selesai', () => {
    expect(requestStatusLabel.completed).toBe('Dilaksanakan')
    expect(Object.values(requestStatusLabel)).not.toContain('Selesai')
  })
})
