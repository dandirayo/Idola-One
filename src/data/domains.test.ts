import { describe, expect, it } from 'vitest'
import { accessibleBusinesses } from '@/lib/access'
import { dateKey } from '@/lib/shifts'
import { checkIn, checkOut, MAX_PHOTO_CHARS, setShift, todayAttendance } from './attendance'
import {
  addBeverageBusiness,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  setBusinessActive,
  setMember,
} from './business'
import { addPosProduct, createPosSale, movePosProduct, posDayFor, setPosDay, setPosProductActive, updatePosProduct } from './pos'
import { getState } from './store'

const photo = 'data:image/jpeg;base64,AAAA'
// Senin, 2 Maret 2026 (lokal). Rina (em1) shift pagi 08:00.
const monday = (h: number, m: number) => new Date(2026, 2, 2, h, m)

describe('usaha dan keanggotaan', () => {
  it('menolak nama kosong atau kembar', () => {
    expect(() => addBeverageBusiness('  ')).toThrow(/Nama/)
    expect(() => addBeverageBusiness('es teh manis')).toThrow(/sudah dipakai/)
  })

  it('usaha baru muncul untuk owner, tetapi karyawan baru terlihat setelah di-assign', () => {
    const b = addBeverageBusiness('Kopi Keliling')
    const s = getState()
    expect(accessibleBusinesses(s.businesses, s.members, 'owner').some((x) => x.id === b.id)).toBe(true)
    expect(accessibleBusinesses(s.businesses, s.members, 'employee', 'em1').some((x) => x.id === b.id)).toBe(false)
    setMember(b.id, 'em1', true)
    const s2 = getState()
    expect(accessibleBusinesses(s2.businesses, s2.members, 'employee', 'em1').some((x) => x.id === b.id)).toBe(true)
    setMember(b.id, 'em1', false)
    const s3 = getState()
    expect(accessibleBusinesses(s3.businesses, s3.members, 'employee', 'em1').some((x) => x.id === b.id)).toBe(false)
  })

  it('usaha nonaktif tidak bisa dipilih siapa pun', () => {
    const b = addBeverageBusiness('Usaha Sementara')
    setBusinessActive(b.id, false)
    const s = getState()
    expect(accessibleBusinesses(s.businesses, s.members, 'owner').some((x) => x.id === b.id)).toBe(false)
  })

  it('perubahan akses tercatat di audit', () => {
    setMember('b2', 'em1', true)
    expect(getState().audit[0]).toMatchObject({ entity: 'Usaha', action: 'Akses karyawan' })
    setMember('b2', 'em1', false)
  })

  it('menolak usaha atau karyawan yang tidak ada', () => {
    expect(() => setMember('tidak-ada', 'em1', true)).toThrow(/Usaha/)
    expect(() => setMember('b2', 'tidak-ada', true)).toThrow(/Karyawan/)
    expect(() => setBusinessActive('tidak-ada', true)).toThrow(/Usaha/)
  })
})

describe('notifikasi', () => {
  it('tandai dibaca, tandai semua, dan hapus', () => {
    markNotificationRead('n1')
    expect(getState().notifications.find((n) => n.id === 'n1')?.read).toBe(true)
    markAllNotificationsRead({ role: 'employee', name: 'Dika' })
    const dika = getState().notifications.filter((n) => n.audience === 'employee' && n.forName === 'Dika')
    expect(dika.every((n) => n.read)).toBe(true)
    deleteNotification('n2')
    expect(getState().notifications.some((n) => n.id === 'n2')).toBe(false)
  })
})

describe('shift', () => {
  it('menyimpan, mengganti, dan mengosongkan shift', () => {
    setShift('em3', 5, { start: '09:00', end: '15:00' }) // Sabtu
    expect(getState().shifts.filter((r) => r.employeeId === 'em3' && r.weekday === 5)).toHaveLength(1)
    setShift('em3', 5, { start: '10:00', end: '16:00' })
    const rows = getState().shifts.filter((r) => r.employeeId === 'em3' && r.weekday === 5)
    expect(rows).toHaveLength(1)
    expect(rows[0].start).toBe('10:00')
    setShift('em3', 5, null)
    expect(getState().shifts.some((r) => r.employeeId === 'em3' && r.weekday === 5)).toBe(false)
  })

  it('menolak jam rusak, hari tidak valid, dan karyawan yang tidak ada', () => {
    expect(() => setShift('em3', 5, { start: '16:00', end: '09:00' })).toThrow(/setelah/)
    expect(() => setShift('em3', 9, { start: '09:00', end: '15:00' })).toThrow(/Hari/)
    expect(() => setShift('tidak-ada', 1, null)).toThrow(/Karyawan/)
  })
})

describe('absensi', () => {
  it('wajib foto selfie', () => {
    expect(() => checkIn('em1', '', monday(8, 0))).toThrow(/Foto/)
    expect(() => checkIn('em1', 'bukan-gambar', monday(8, 0))).toThrow(/Foto/)
    expect(() => checkIn('em1', 'data:image/jpeg;base64,' + 'A'.repeat(MAX_PHOTO_CHARS), monday(8, 0))).toThrow(/terlalu besar/)
  })

  it('absen masuk terlambat dihitung dari jadwal, lalu pulang, dan tidak bisa ganda', () => {
    const rec = checkIn('em1', photo, monday(8, 30))
    expect(rec.lateMinutes).toBe(30)
    expect(rec.date).toBe(dateKey(monday(8, 30)))
    expect(todayAttendance('em1', monday(12, 0))?.id).toBe(rec.id)

    expect(() => checkIn('em1', photo, monday(9, 0))).toThrow(/sudah absen masuk/)
    expect(() => checkOut('em1', '', monday(16, 0))).toThrow(/Foto/)
    expect(() => checkOut('em1', photo, monday(8, 0))).toThrow(/sebelum jam masuk/)

    const out = checkOut('em1', photo, monday(16, 5))
    expect(out.checkOut).toBeDefined()
    expect(() => checkOut('em1', photo, monday(17, 0))).toThrow(/sudah absen pulang/)
  })

  it('tepat waktu dalam toleransi tidak dihitung terlambat', () => {
    expect(checkIn('em3', photo, monday(8, 5)).lateMinutes).toBe(0)
  })

  it('tidak bisa pulang sebelum masuk', () => {
    expect(() => checkOut('em2', photo, monday(21, 0))).toThrow(/belum absen masuk/)
  })

  it('di luar jadwal (libur) boleh absen tetapi diberi catatan dan tidak terlambat', () => {
    const sunday = new Date(2026, 2, 8, 10, 0) // Minggu, Rina libur
    const rec = checkIn('em1', photo, sunday)
    expect(rec.lateMinutes).toBe(0)
    expect(rec.note).toMatch(/Di luar jadwal/)
  })

  it('menolak karyawan yang tidak ada', () => {
    expect(() => checkIn('tidak-ada', photo, monday(8, 0))).toThrow(/Karyawan/)
  })
})

describe('POS minuman', () => {
  it('produk: validasi, urutan, dan nonaktif', () => {
    expect(() => addPosProduct('b2', '  ', 5000)).toThrow(/Nama/)
    expect(() => addPosProduct('b2', 'Es', 0)).toThrow(/Harga/)
    expect(() => addPosProduct('b1', 'Es', 5000)).toThrow(/minuman/) // b1 adalah laundry

    const p = addPosProduct('b2', 'Es Lemon', 8000)
    const order = () => getState().posProducts.filter((x) => x.businessId === 'b2').sort((a, b) => a.sort - b.sort).map((x) => x.id)
    expect(order().at(-1)).toBe(p.id)
    movePosProduct(p.id, 'up')
    expect(order().at(-2)).toBe(p.id)
    movePosProduct(p.id, 'down')
    expect(order().at(-1)).toBe(p.id)
    movePosProduct(p.id, 'down') // sudah paling bawah, tidak terjadi apa-apa
    expect(order().at(-1)).toBe(p.id)

    updatePosProduct(p.id, 'Es Lemon Tea', 9000)
    expect(getState().posProducts.find((x) => x.id === p.id)).toMatchObject({ name: 'Es Lemon Tea', price: 9000 })
    setPosProductActive(p.id, false)
  })

  it('checkout butuh hari berjualan dibuka', () => {
    const day = new Date(2026, 5, 10, 10, 0)
    expect(() => createPosSale('b2', [{ productId: 'pp1', qty: 1 }], 'cash', day)).toThrow(/Aktifkan jualan/)
    setPosDay('b2', true, 'Ramai', day)
    expect(posDayFor('b2', day)).toMatchObject({ open: true, note: 'Ramai' })
    expect(() => createPosSale('b2', [{ productId: 'pp1', qty: 1 }], 'cash', day)).not.toThrow()
    setPosDay('b2', false, '', day)
    expect(() => createPosSale('b2', [{ productId: 'pp1', qty: 1 }], 'cash', day)).toThrow(/Aktifkan jualan/)
    expect(getState().posDays.filter((d) => d.businessId === 'b2' && d.date === dateKey(day))).toHaveLength(1)
  })

  it('harga diambil dari katalog dan disalin ke item, total bulat, nomor berurutan', () => {
    const day = new Date(2026, 5, 11, 10, 0)
    setPosDay('b2', true, '', day)
    const a = createPosSale('b2', [{ productId: 'pp1', qty: 2 }, { productId: 'pp2', qty: 1 }], 'qris', day)
    const b = createPosSale('b2', [{ productId: 'pp3', qty: 1 }], 'cash', day)
    expect(a.total).toBe(17000)
    expect(a.items[0]).toMatchObject({ name: 'Es Teh Manis', price: 5000, qty: 2 })
    expect(a.number).toBe('POS-20260611-0001')
    expect(b.number).toBe('POS-20260611-0002')

    updatePosProduct('pp1', 'Es Teh Manis', 6000) // harga baru tidak mengubah penjualan lama
    expect(getState().posSales.find((x) => x.id === a.id)?.items[0].price).toBe(5000)
    updatePosProduct('pp1', 'Es Teh Manis', 5000)
  })

  it('menolak produk nonaktif, jumlah tidak valid, keranjang kosong, dan produk usaha lain', () => {
    const day = new Date(2026, 5, 12, 10, 0)
    setPosDay('b2', true, '', day)
    const off = addPosProduct('b2', 'Es Mati', 5000)
    setPosProductActive(off.id, false)
    expect(() => createPosSale('b2', [{ productId: off.id, qty: 1 }], 'cash', day)).toThrow(/nonaktif/)
    expect(() => createPosSale('b2', [{ productId: 'pp1', qty: 0 }], 'cash', day)).toThrow(/Jumlah/)
    expect(() => createPosSale('b2', [{ productId: 'pp1', qty: 1.5 }], 'cash', day)).toThrow(/Jumlah/)
    expect(() => createPosSale('b2', [], 'cash', day)).toThrow(/kosong/)
    expect(() => createPosSale('b2', [{ productId: 'tidak-ada', qty: 1 }], 'cash', day)).toThrow(/Produk/)
  })

  it('penjualan POS tidak masuk Buku Kas laundry', () => {
    const before = getState().cash.length
    const day = new Date(2026, 5, 13, 10, 0)
    setPosDay('b2', true, '', day)
    createPosSale('b2', [{ productId: 'pp1', qty: 1 }], 'cash', day)
    expect(getState().cash.length).toBe(before)
  })
})
