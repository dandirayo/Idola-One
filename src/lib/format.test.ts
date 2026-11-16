import { describe, expect, it } from 'vitest'
import { formatRupiah, roundUpToThousand } from './format'

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
