import { describe, expect, it } from 'vitest'
import { balance } from '@/lib/finance'
import { completeRequest, createRequest, decideRequest, getState, payRequest } from './store'

const find = (id: string) => getState().requests.find((r) => r.id === id)!

describe('membuat pengajuan', () => {
  it('menolak nama atau detail kosong', () => {
    expect(() => createRequest('leave', '  ', 'Izin sakit', 0)).toThrow(/Nama/)
    expect(() => createRequest('leave', 'Rina', '  ', 0)).toThrow(/detail/)
  })

  it('kasbon wajib bernominal, pengajuan lain mengabaikan nominal', () => {
    expect(() => createRequest('cash_advance', 'Rina', 'Kasbon', 0)).toThrow(/Nominal/)
    const stock = createRequest('stock', 'Rina', 'Plastik 40', 99999)
    expect(stock.amount).toBe(0)
    expect(stock.status).toBe('pending')
  })
})

describe('keputusan owner', () => {
  it('menolak tanpa alasan gagal dan tidak mengubah status', () => {
    const r = createRequest('leave', 'Dika', 'Izin Senin', 0)
    expect(() => decideRequest(r.id, 'reject', '  ')).toThrow(/alasan/)
    expect(find(r.id).status).toBe('pending')
    decideRequest(r.id, 'reject', 'Jadwal penuh')
    expect(find(r.id).status).toBe('rejected')
    expect(find(r.id).ownerNote).toBe('Jadwal penuh')
  })

  it('pengajuan yang sudah diputuskan tidak bisa diputuskan lagi', () => {
    const r = createRequest('leave', 'Dika', 'Izin Selasa', 0)
    decideRequest(r.id, 'approve', '')
    expect(() => decideRequest(r.id, 'reject', 'berubah pikiran')).toThrow(/sudah diputuskan/)
  })
})

describe('pembayaran kasbon', () => {
  it('hanya bisa dibayar setelah disetujui, lalu menjadi kas keluar', () => {
    const r = createRequest('cash_advance', 'Rina', 'Kasbon darurat', 80000)
    expect(() => payRequest(r.id, 'cash')).toThrow(/Setujui/)

    const before = balance(getState().cash)
    decideRequest(r.id, 'approve', 'OK')
    payRequest(r.id, 'cash')

    expect(find(r.id).status).toBe('paid')
    expect(balance(getState().cash)).toBe(before - 80000)
    expect(getState().expenses[0].category).toBe('Kasbon')
  })

  it('kasbon yang sudah dibayar tidak bisa dibayar dua kali', () => {
    const r = createRequest('cash_advance', 'Rina', 'Kasbon lagi', 50000)
    decideRequest(r.id, 'approve', '')
    payRequest(r.id, 'cash')
    const cashAfterFirst = getState().cash.length
    expect(() => payRequest(r.id, 'cash')).toThrow(/Setujui/)
    expect(getState().cash.length).toBe(cashAfterFirst)
  })
})

describe('pengajuan non-uang', () => {
  it('ditandai dilaksanakan tanpa kas keluar', () => {
    const r = createRequest('stock', 'Rina', 'Sabun 5 kg', 0)
    decideRequest(r.id, 'approve', '')
    const before = balance(getState().cash)
    completeRequest(r.id)
    expect(find(r.id).status).toBe('completed')
    expect(balance(getState().cash)).toBe(before)
  })

  it('pengajuan uang tidak bisa diselesaikan lewat Dilaksanakan', () => {
    const r = createRequest('cash_advance', 'Rina', 'Kasbon', 10000)
    decideRequest(r.id, 'approve', '')
    expect(() => completeRequest(r.id)).toThrow(/pembayaran/)
  })
})
