import { describe, expect, it } from 'vitest'
import {
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
