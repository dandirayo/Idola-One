import { describe, expect, it } from 'vitest'
import { formatQty, formatRupiah, roundUpToThousand } from './format'

describe('formatQty', () => {
  it('memakai koma desimal dan membuang nol yang tidak perlu', () => {
    expect(formatQty(3.5)).toBe('3,5')
    expect(formatQty(2)).toBe('2')
    expect(formatQty(0.1 + 0.2)).toBe('0,3')
  })
})

describe('formatRupiah', () => {
  it('memakai pemisah ribuan titik', () => {
    expect(formatRupiah(28000)).toBe('Rp 28.000')
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000')
  })
})

describe('roundUpToThousand', () => {
  it('membulatkan ke atas ke kelipatan 1.000', () => {
    expect(roundUpToThousand(27001)).toBe(28000)
    expect(roundUpToThousand(28000)).toBe(28000)
    expect(roundUpToThousand(0)).toBe(0)
  })
})
