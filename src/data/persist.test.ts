import { describe, expect, it } from 'vitest'
import { hydrateState, persistenceEnabled, serializeState, STORAGE_VERSION } from './persist'
import { getState } from './store'

describe('penyimpanan browser', () => {
  const seed = getState()

  it('data yang disimpan kembali sama setelah dimuat', () => {
    const changed = { ...seed, customers: seed.customers.slice(0, 1) }
    const back = hydrateState(serializeState(changed), seed)
    expect(back.customers).toHaveLength(1)
    expect(back.orders).toEqual(seed.orders)
  })

  it('kosong, rusak, atau versi beda memakai data contoh', () => {
    expect(hydrateState(null, seed)).toBe(seed)
    expect(hydrateState('{bukan json', seed)).toBe(seed)
    expect(hydrateState(JSON.stringify({ version: STORAGE_VERSION + 1, state: {} }), seed)).toBe(seed)
  })

  it('bagian yang jenisnya tidak cocok diabaikan, bagian baru memakai data contoh', () => {
    const raw = JSON.stringify({ version: STORAGE_VERSION, state: { customers: 'rusak', shop: { ...seed.shop, name: 'Toko Baru' } } })
    const back = hydrateState(raw, seed)
    expect(back.customers).toEqual(seed.customers)
    expect(back.shop.name).toBe('Toko Baru')
    expect(back.trash).toEqual(seed.trash)
  })

  it('tidak aktif di lingkungan tanpa browser (tes)', () => {
    expect(persistenceEnabled()).toBe(false)
  })
})
