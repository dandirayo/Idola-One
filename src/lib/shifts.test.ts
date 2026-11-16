import { describe, expect, it } from 'vitest'
import { dateKey, lateMinutes, LATE_TOLERANCE_MIN, minutesOf, slotLabel, validateSlot, weekdayIndex } from './shifts'

const at = (h: number, m: number) => new Date(2026, 10, 18, h, m)
const pagi = { start: '08:00', end: '16:00' }

describe('weekdayIndex', () => {
  it('Senin = 0 dan Minggu = 6', () => {
    expect(weekdayIndex(new Date(2026, 10, 16))).toBe(0) // Senin
    expect(weekdayIndex(new Date(2026, 10, 18))).toBe(2) // Rabu
    expect(weekdayIndex(new Date(2026, 10, 22))).toBe(6) // Minggu
  })
})

describe('lateMinutes', () => {
  it('tepat waktu dan dalam toleransi tidak dianggap terlambat', () => {
    expect(lateMinutes(pagi, at(7, 50))).toBe(0)
    expect(lateMinutes(pagi, at(8, 0))).toBe(0)
    expect(lateMinutes(pagi, at(8, LATE_TOLERANCE_MIN))).toBe(0)
  })

  it('melewati toleransi dihitung penuh dari jam mulai', () => {
    expect(lateMinutes(pagi, at(8, LATE_TOLERANCE_MIN + 1))).toBe(LATE_TOLERANCE_MIN + 1)
    expect(lateMinutes(pagi, at(8, 45))).toBe(45)
  })

  it('tanpa jadwal tidak ada keterlambatan', () => {
    expect(lateMinutes(null, at(23, 0))).toBe(0)
    expect(lateMinutes(undefined, at(23, 0))).toBe(0)
  })
})

describe('validateSlot dan minutesOf', () => {
  it('menerima shift valid', () => {
    expect(validateSlot(pagi)).toBeNull()
  })

  it('menolak format jam rusak dan jam selesai tidak setelah mulai', () => {
    expect(validateSlot({ start: '8:00', end: '16:00' })).toMatch(/HH:mm/)
    expect(validateSlot({ start: '25:00', end: '26:00' })).toMatch(/HH:mm/)
    expect(validateSlot({ start: '16:00', end: '08:00' })).toMatch(/setelah/)
    expect(validateSlot({ start: '08:00', end: '08:00' })).toMatch(/setelah/)
  })

  it('minutesOf menolak format salah', () => {
    expect(minutesOf('01:30')).toBe(90)
    expect(() => minutesOf('1:30')).toThrow()
  })
})

describe('slotLabel dan dateKey', () => {
  it('label shift dan libur', () => {
    expect(slotLabel(pagi)).toBe('08:00–16:00')
    expect(slotLabel(null)).toBe('Libur')
  })

  it('dateKey memakai tanggal lokal dengan nol di depan', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
