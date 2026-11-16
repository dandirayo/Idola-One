import { describe, expect, it } from 'vitest'
import { billedAmount, progressPercent, validateBatch, validateProject } from './projects'

describe('billedAmount', () => {
  it('tarif per pcs: pcs x tarif dibulatkan ke atas ke Rp1.000', () => {
    expect(billedAmount({ rateType: 'pcs', rate: 3500 }, [{ pcs: 100, kg: 0 }, { pcs: 50, kg: 0 }])).toBe(525000)
    expect(billedAmount({ rateType: 'pcs', rate: 3333 }, [{ pcs: 10, kg: 0 }])).toBe(34000) // 33.330
  })

  it('tarif per kg memakai berat aktual', () => {
    expect(billedAmount({ rateType: 'kg', rate: 7000 }, [{ pcs: 0, kg: 12.5 }, { pcs: 0, kg: 7.5 }])).toBe(140000)
  })

  it('bebas galat desimal pada berat desimal', () => {
    // 34,2 kg x 12.500 = 427.500 tepat, bukan dibulatkan naik
    expect(billedAmount({ rateType: 'kg', rate: 12500 }, [{ pcs: 0, kg: 34.2 }])).toBe(428000)
    expect(billedAmount({ rateType: 'kg', rate: 12500 }, [{ pcs: 0, kg: 40 }])).toBe(500000)
  })

  it('tanpa batch tagihan nol', () => {
    expect(billedAmount({ rateType: 'pcs', rate: 3500 }, [])).toBe(0)
  })
})

describe('progressPercent', () => {
  it('menghitung dari akumulasi pcs dan dibatasi 100', () => {
    expect(progressPercent(200, [{ pcs: 50, kg: 0 }, { pcs: 50, kg: 0 }])).toBe(50)
    expect(progressPercent(100, [{ pcs: 150, kg: 0 }])).toBe(100)
    expect(progressPercent(0, [{ pcs: 10, kg: 0 }])).toBe(0)
    expect(progressPercent(100, [])).toBe(0)
  })
})

describe('validasi', () => {
  it('batch', () => {
    expect(validateBatch({ pcs: 10, kg: 5 })).toBeNull()
    expect(validateBatch({ pcs: 0, kg: 0 })).toMatch(/Isi/)
    expect(validateBatch({ pcs: -1, kg: 1 })).toMatch(/pcs/)
    expect(validateBatch({ pcs: 1.5, kg: 1 })).toMatch(/pcs/)
    expect(validateBatch({ pcs: 1, kg: 1.25 })).toMatch(/0,1/)
  })

  it('proyek', () => {
    expect(validateProject({ name: 'Hotel A', targetPcs: 100, rate: 3500 })).toBeNull()
    expect(validateProject({ name: ' ', targetPcs: 100, rate: 3500 })).toMatch(/Nama/)
    expect(validateProject({ name: 'X', targetPcs: 0, rate: 3500 })).toMatch(/Target/)
    expect(validateProject({ name: 'X', targetPcs: 10, rate: 0 })).toMatch(/Tarif/)
  })
})
