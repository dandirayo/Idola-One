import { describe, expect, it } from 'vitest'
import { catalogServices } from '@/data/seed-services'
import { keywords, matches, normalize } from './search'

const findServices = (q: string) => catalogServices.filter((s) => matches(q, [s.name, s.category, s.unit])).map((s) => s.name)

describe('normalize dan keywords', () => {
  it('huruf kecil, tanda baca jadi spasi, spasi dirapatkan', () => {
    expect(normalize('  Bed-Cover   (Besar) ')).toBe('bed cover besar')
  })
  it('"cuci lipat" dianggap "cuci kering lipat"', () => {
    expect(keywords('Cuci Lipat express')).toEqual(['cuci', 'kering', 'lipat', 'express'])
  })
})

describe('cari layanan', () => {
  it('semua kata kunci cukup ada di mana saja', () => {
    expect(findServices('jas setrika')).toContain('Jas Cuci Setrika')
  })
  it('sinonim cuci lipat menemukan Cuci Kering Lipat', () => {
    const found = findServices('cuci lipat')
    expect(found).toContain('Cuci Kering Lipat Reguler')
    expect(found.every((n) => /kering lipat/i.test(n))).toBe(true)
  })
  it('Express dan Kilat dibedakan', () => {
    expect(findServices('cuci setrika kilat')).toEqual(['Cuci Setrika Kilat'])
  })
  it('bisa mencari lewat kategori', () => {
    expect(findServices('boneka').length).toBeGreaterThan(1)
  })
  it('kata kosong cocok dengan semua', () => {
    expect(matches('  ', ['apa saja'])).toBe(true)
  })
})

describe('cari pelanggan lewat nomor', () => {
  const phone = '0812-3456-7890'
  it('0812, 62812, +62812 dianggap sama', () => {
    expect(matches('08123456', ['Bu Sinta'], [phone])).toBe(true)
    expect(matches('628123456', ['Bu Sinta'], [phone])).toBe(true)
    expect(matches('+62 812 3456', ['Bu Sinta'], [phone])).toBe(true)
  })
  it('potongan di tengah nomor juga cocok', () => {
    expect(matches('7890', ['Bu Sinta'], [phone])).toBe(true)
  })
  it('nama dan nomor bisa digabung', () => {
    expect(matches('sinta 0812', ['Bu Sinta'], [phone])).toBe(true)
    expect(matches('budi 0812', ['Bu Sinta'], [phone])).toBe(false)
  })
})
