import { describe, expect, it } from 'vitest'
import { availableActions, buildRequestDetail, isMoneyRequest, requestStatusLabel } from './requests'

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

describe('Biaya Operasional dan detail terstruktur', () => {
  it('biaya operasional berdampak uang dan dibayar', () => {
    expect(isMoneyRequest('expense')).toBe(true)
    expect(availableActions('expense', 'approved')).toEqual(['pay'])
  })

  it('menyusun detail dan menolak isian kurang', () => {
    expect(buildRequestDetail('stock', { item: 'Deterjen', quantity: '2', unit: 'liter' })).toBe('Deterjen, 2 liter')
    expect(() => buildRequestDetail('stock', { item: 'Deterjen', quantity: '0', unit: 'liter' })).toThrow(/Jumlah/)
    expect(() => buildRequestDetail('leave', { leaveType: 'Sakit', startDate: '2026-11-20', endDate: '2026-11-19' })).toThrow(/sebelum/)
    expect(() => buildRequestDetail('overtime', { startDate: '2026-11-20', startTime: '20:00', endTime: '02:00', purpose: 'x' })).toThrow(/Jam selesai/)
    expect(buildRequestDetail('overtime', { startDate: '2026-11-20', startTime: '20:00', endTime: '02:00', nextDay: true, purpose: 'Setrika', note: 'Mendesak' })).toContain('hari berikutnya')
    expect(buildRequestDetail('expense', { expenseKind: 'Dana operasional', purpose: 'Plastik' })).toBe('Dana operasional: Plastik')
    expect(buildRequestDetail('cash_advance', { note: 'Kasbon' })).toBe('Kasbon')
  })
})
