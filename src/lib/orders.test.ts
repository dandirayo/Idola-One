import { describe, expect, it } from 'vitest'
import {
  lineAmount,
  nextStatuses,
  normalizePhone,
  orderTotal,
  paymentStatus,
  subtotal,
  whatsappReadyUrl,
} from './orders'

describe('subtotal dan orderTotal', () => {
  it('menghitung kiloan di atas minimum', () => {
    expect(subtotal([{ unit: 'kg', qty: 4, price: 8000 }])).toBe(32000)
  })

  it('menagih minimum 3 kg untuk kiloan di bawah 3 kg', () => {
    expect(subtotal([{ unit: 'kg', qty: 1.5, price: 8000 }])).toBe(24000)
  })

  it('melewati minimum bila diminta (pelanggan setia)', () => {
    expect(subtotal([{ unit: 'kg', qty: 1.5, price: 8000 }], true)).toBe(12000)
  })

  it('tidak menerapkan minimum pada satuan', () => {
    expect(subtotal([{ unit: 'pcs', qty: 1, price: 30000 }])).toBe(30000)
  })

  it('membulatkan total ke atas ke kelipatan 1.000', () => {
    expect(orderTotal([{ unit: 'kg', qty: 3.5, price: 7250 }])).toBe(26000) // 25.375
  })

  it('mengabaikan baris dengan jumlah nol', () => {
    expect(subtotal([{ unit: 'pcs', qty: 0, price: 30000 }])).toBe(0)
  })
})

/** Pembangkit angka acak deterministik agar uji bisa diulang. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Acuan: seluruh hitungan memakai bilangan bulat (per 0,1 kg dan Rupiah x 10), tanpa desimal. */
function referenceTotal(lines: LineInputLike[], skipMinKg: boolean): number {
  const tenthsKg = lines.filter((l) => l.unit === 'kg').reduce((s, l) => s + Math.round(l.qty * 10), 0)
  const shortfall = !skipMinKg && tenthsKg > 0 && tenthsKg < 30 ? 30 - tenthsKg : 0
  let extra = false
  let sum = 0 // dalam sepersepuluh Rupiah
  for (const l of lines) {
    let t = l.unit === 'kg' ? Math.round(l.qty * 10) : l.qty * 10
    if (l.unit === 'kg' && shortfall > 0 && !extra) {
      t += shortfall
      extra = true
    }
    sum += t * l.price
  }
  return Math.ceil(sum / 10000) * 1000
}

type LineInputLike = { unit: 'kg' | 'pcs'; qty: number; price: number }

describe('regresi galat desimal', () => {
  it('34,2 kg x Rp 12.500 tidak membuat total naik Rp1.000 secara keliru', () => {
    // Pada desimal: 34.2 * 12500 = 427500.00000000006, lalu dibulatkan ke atas menjadi 505.000
    const lines = [
      { unit: 'pcs' as const, qty: 1, price: 9000 },
      { unit: 'kg' as const, qty: 34.2, price: 12500 },
      { unit: 'pcs' as const, qty: 1, price: 35000 },
      { unit: 'kg' as const, qty: 6.5, price: 5000 },
    ]
    expect(subtotal(lines)).toBe(504000)
    expect(orderTotal(lines)).toBe(504000)
  })

  it('lineAmount bebas galat desimal', () => {
    expect(lineAmount(34.2, 12500)).toBe(427500)
    expect(lineAmount(3.3, 8000)).toBe(26400)
    expect(lineAmount(2, 30000)).toBe(60000)
  })
})

describe('orderTotal tahan galat desimal', () => {
  it('sama dengan hitungan bilangan bulat pada 20.000 pesanan acak', () => {
    const rand = mulberry32(20261116)
    const prices = [4000, 5000, 6000, 7000, 7250, 8000, 8500, 9000, 12500, 15000, 30000, 35000]
    for (let n = 0; n < 20000; n++) {
      const count = 1 + Math.floor(rand() * 4)
      const lines: LineInputLike[] = []
      for (let i = 0; i < count; i++) {
        const kg = rand() < 0.6
        lines.push({
          unit: kg ? 'kg' : 'pcs',
          qty: kg ? (1 + Math.floor(rand() * 400)) / 10 : 1 + Math.floor(rand() * 6),
          price: prices[Math.floor(rand() * prices.length)],
        })
      }
      const skip = rand() < 0.2
      const got = orderTotal(lines, skip)
      const want = referenceTotal(lines, skip)
      expect(got, JSON.stringify({ lines, skip })).toBe(want)
    }
  })
})

describe('paymentStatus', () => {
  it('belum bayar, DP, dan lunas', () => {
    expect(paymentStatus(28000, 0)).toBe('unpaid')
    expect(paymentStatus(28000, 14000)).toBe('partial')
    expect(paymentStatus(28000, 28000)).toBe('paid')
  })
})

describe('nextStatuses', () => {
  it('mengikuti alur Diterima, Diproses, Siap, Diambil', () => {
    expect(nextStatuses('received')).toEqual(['processing', 'cancelled'])
    expect(nextStatuses('ready')).toEqual(['picked_up'])
    expect(nextStatuses('picked_up')).toEqual([])
    expect(nextStatuses('cancelled')).toEqual([])
  })
})

describe('normalizePhone', () => {
  it('mengubah 08xx dan +62 ke 62', () => {
    expect(normalizePhone('0812-3456-789')).toBe('628123456789')
    expect(normalizePhone('+62 812 3456 789')).toBe('628123456789')
    expect(normalizePhone('8123456789')).toBe('628123456789')
  })
})

describe('whatsappReadyUrl', () => {
  it('memuat nama, nomor nota, dan sisa tagihan', () => {
    const url = whatsappReadyUrl({
      phone: '08123456789',
      customer: 'Bu Sinta',
      number: 'IDL-1',
      remaining: 14000,
      formattedRemaining: 'Rp 14.000',
    })
    expect(url.startsWith('https://wa.me/628123456789?text=')).toBe(true)
    const text = decodeURIComponent(url.split('text=')[1])
    expect(text).toContain('Bu Sinta')
    expect(text).toContain('IDL-1')
    expect(text).toContain('Rp 14.000')
  })
})
