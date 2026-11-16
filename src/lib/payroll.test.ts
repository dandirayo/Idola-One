import { describe, expect, it } from 'vitest'
import { incentiveAmount, INCENTIVE_OPTIONS, isValidIncentive, weekStartKey } from './payroll'

describe('insentif', () => {
  it('hanya nilai yang ditetapkan yang valid', () => {
    for (const v of INCENTIVE_OPTIONS) expect(isValidIncentive(v)).toBe(true)
    expect(isValidIncentive(5000)).toBe(false)
    expect(isValidIncentive(-10000)).toBe(false)
  })

  it('total = jumlah pcs x nilai per pcs', () => {
    expect(incentiveAmount(3, 15000)).toBe(45000)
    expect(incentiveAmount(2, 0)).toBe(0)
  })
})

describe('weekStartKey', () => {
  it('mengembalikan hari Senin dari minggu yang sama', () => {
    expect(weekStartKey(new Date(2026, 10, 18))).toBe('2026-11-16') // Rabu
    expect(weekStartKey(new Date(2026, 10, 16))).toBe('2026-11-16') // Senin
    expect(weekStartKey(new Date(2026, 10, 22))).toBe('2026-11-16') // Minggu
    expect(weekStartKey(new Date(2026, 10, 23))).toBe('2026-11-23') // Senin berikutnya
  })

  it('melintasi pergantian bulan', () => {
    expect(weekStartKey(new Date(2026, 11, 2))).toBe('2026-11-30') // Rabu 2 Des -> Senin 30 Nov
  })
})
