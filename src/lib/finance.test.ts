import { describe, expect, it } from 'vitest'
import { balance, inRange, periodRange, summarize, type CashEntry } from './finance'

// Rabu, 18 November 2026 (lokal)
const now = new Date(2026, 10, 18, 15, 30)

describe('periodRange', () => {
  it('hari ini dan kemarin', () => {
    expect(periodRange('today', now)).toEqual({ from: new Date(2026, 10, 18), to: new Date(2026, 10, 19) })
    expect(periodRange('yesterday', now)).toEqual({ from: new Date(2026, 10, 17), to: new Date(2026, 10, 18) })
  })

  it('minggu ini dimulai Senin dan berakhir Minggu', () => {
    const r = periodRange('week', now)
    expect(r.from).toEqual(new Date(2026, 10, 16)) // Senin
    expect(r.to).toEqual(new Date(2026, 10, 23)) // Senin berikutnya (tidak termasuk)
  })

  it('hari Minggu masih masuk minggu yang dimulai Senin sebelumnya', () => {
    const sunday = new Date(2026, 10, 22, 10)
    expect(periodRange('week', sunday).from).toEqual(new Date(2026, 10, 16))
  })

  it('bulan ini penuh tanggal 1 sampai akhir bulan', () => {
    const r = periodRange('month', now)
    expect(r.from).toEqual(new Date(2026, 10, 1))
    expect(r.to).toEqual(new Date(2026, 11, 1))
  })
})

describe('inRange', () => {
  it('batas awal termasuk, batas akhir tidak', () => {
    const r = periodRange('today', now)
    expect(inRange(new Date(2026, 10, 18, 0, 0).toISOString(), r)).toBe(true)
    expect(inRange(new Date(2026, 10, 19, 0, 0).toISOString(), r)).toBe(false)
  })
})

const entries: CashEntry[] = [
  { id: '1', at: '', direction: 'in', amount: 28000, method: 'cash', category: 'Pembayaran', description: '' },
  { id: '2', at: '', direction: 'in', amount: 50000, method: 'transfer', category: 'Pembayaran', description: '' },
  { id: '3', at: '', direction: 'out', amount: 15000, method: 'cash', category: 'Stok', description: '' },
]

describe('summarize dan balance', () => {
  it('menjumlahkan masuk, keluar, dan per metode', () => {
    const s = summarize(entries)
    expect(s.in).toBe(78000)
    expect(s.out).toBe(15000)
    expect(s.byMethod.cash).toEqual({ in: 28000, out: 15000 })
    expect(s.byMethod.transfer).toEqual({ in: 50000, out: 0 })
    expect(s.byMethod.qris).toEqual({ in: 0, out: 0 })
  })

  it('saldo = masuk dikurangi keluar', () => {
    expect(balance(entries)).toBe(63000)
    expect(balance([])).toBe(0)
  })
})
