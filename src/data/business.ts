// Usaha, keanggotaan karyawan, dan notifikasi dalam aplikasi.

import { isVisibleTo, type Audience } from '@/lib/notifications'
import { getState, makeAudit, uid, update, type Business } from './store'

/** Owner menambah usaha minuman. Jenis usaha lain belum tersedia. */
export function addBeverageBusiness(name: string): Business {
  const clean = name.trim()
  if (!clean) throw new Error('Nama usaha wajib diisi.')
  if (getState().businesses.some((b) => b.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Nama usaha sudah dipakai.')
  }
  const business: Business = { id: uid('b'), name: clean, kind: 'beverage', active: true }
  update((s) => ({
    ...s,
    businesses: [...s.businesses, business],
    audit: [makeAudit('Usaha', business.id, clean, 'Tambah usaha', '-', 'Usaha minuman baru'), ...s.audit],
  }))
  return business
}

export function setBusinessActive(id: string, active: boolean) {
  const b = getState().businesses.find((x) => x.id === id)
  if (!b) throw new Error('Usaha tidak ditemukan.')
  if (b.active === active) return
  update((s) => ({
    ...s,
    businesses: s.businesses.map((x) => (x.id === id ? { ...x, active } : x)),
    audit: [makeAudit('Usaha', id, b.name, 'Status usaha', b.active ? 'Aktif' : 'Nonaktif', active ? 'Aktif' : 'Nonaktif'), ...s.audit],
  }))
}

/** Mengaktifkan atau menonaktifkan akses karyawan ke satu usaha. */
export function setMember(businessId: string, employeeId: string, active: boolean) {
  const s0 = getState()
  const business = s0.businesses.find((b) => b.id === businessId)
  const employee = s0.employees.find((e) => e.id === employeeId)
  if (!business) throw new Error('Usaha tidak ditemukan.')
  if (!employee) throw new Error('Karyawan tidak ditemukan.')
  const exists = s0.members.some((m) => m.businessId === businessId && m.employeeId === employeeId)
  update((s) => ({
    ...s,
    members: exists
      ? s.members.map((m) => (m.businessId === businessId && m.employeeId === employeeId ? { ...m, active } : m))
      : [...s.members, { businessId, employeeId, active }],
    audit: [
      makeAudit('Usaha', businessId, business.name, 'Akses karyawan', `${employee.name}: ${active ? 'nonaktif' : 'aktif'}`, `${employee.name}: ${active ? 'aktif' : 'nonaktif'}`),
      ...s.audit,
    ],
  }))
}

export function markNotificationRead(id: string) {
  update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
}

/** Menandai semua notifikasi yang terlihat oleh sesi ini sebagai sudah dibaca. */
export function markAllNotificationsRead(session: { role: Audience; name: string }) {
  update((s) => ({
    ...s,
    notifications: s.notifications.map((n) => (isVisibleTo(n, session) ? { ...n, read: true } : n)),
  }))
}

export function deleteNotification(id: string) {
  update((s) => ({ ...s, notifications: s.notifications.filter((n) => n.id !== id) }))
}
