// Jadwal shift mingguan dan absensi selfie.
// Waktu absen selalu diambil di sini (meniru "waktu server"), bukan dari isian pengguna.

import { dateKey, lateMinutes, validateSlot, weekdayIndex, type ShiftSlot } from '@/lib/shifts'
import { getState, shiftFor, uid, update, type AttendanceRecord } from './store'

/** Batas ukuran foto (karakter data URL) agar memori tidak membengkak. */
export const MAX_PHOTO_CHARS = 400_000

function validatePhoto(photo: string | undefined | null): string {
  if (!photo || !photo.startsWith('data:image/')) throw new Error('Foto selfie wajib diambil.')
  if (photo.length > MAX_PHOTO_CHARS) throw new Error('Foto terlalu besar. Ambil ulang dengan resolusi lebih kecil.')
  return photo
}

/** Mengatur shift satu karyawan pada satu hari. Slot null berarti libur. */
export function setShift(employeeId: string, weekday: number, slot: ShiftSlot | null) {
  const s0 = getState()
  const employee = s0.employees.find((e) => e.id === employeeId)
  if (!employee) throw new Error('Karyawan tidak ditemukan.')
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error('Hari tidak valid.')
  if (slot) {
    const err = validateSlot(slot)
    if (err) throw new Error(err)
  }
  update((s) => {
    const rest = s.shifts.filter((r) => !(r.employeeId === employeeId && r.weekday === weekday))
    return { ...s, shifts: slot ? [...rest, { employeeId, weekday, start: slot.start, end: slot.end }] : rest }
  })
}

export function todayAttendance(employeeId: string, now: Date = new Date()): AttendanceRecord | undefined {
  const key = dateKey(now)
  return getState().attendance.find((a) => a.employeeId === employeeId && a.date === key)
}

/** Absen masuk. Satu kali per hari, wajib foto, keterlambatan dihitung dari jadwal shift. */
export function checkIn(employeeId: string, photo: string | undefined | null, now: Date = new Date()): AttendanceRecord {
  const employee = getState().employees.find((e) => e.id === employeeId)
  if (!employee) throw new Error('Karyawan tidak ditemukan.')
  if (!employee.active) throw new Error('Akun karyawan nonaktif.')
  const picture = validatePhoto(photo)
  if (todayAttendance(employeeId, now)) throw new Error('Kamu sudah absen masuk hari ini.')

  const record: AttendanceRecord = {
    id: uid('at'),
    employeeId,
    date: dateKey(now),
    checkIn: now.toISOString(),
    lateMinutes: lateMinutes(shiftFor(employeeId, weekdayIndex(now)), now),
    photoIn: picture,
    source: 'selfie',
    note: shiftFor(employeeId, weekdayIndex(now)) ? '' : 'Di luar jadwal (libur)',
  }
  update((s) => ({ ...s, attendance: [record, ...s.attendance] }))
  return record
}

/** Absen pulang. Harus sudah absen masuk, belum absen pulang, dan setelah jam masuk. */
export function checkOut(employeeId: string, photo: string | undefined | null, now: Date = new Date()): AttendanceRecord {
  const picture = validatePhoto(photo)
  const rec = todayAttendance(employeeId, now)
  if (!rec) throw new Error('Kamu belum absen masuk hari ini.')
  if (rec.checkOut) throw new Error('Kamu sudah absen pulang hari ini.')
  if (now.getTime() < new Date(rec.checkIn).getTime()) throw new Error('Jam pulang tidak boleh sebelum jam masuk.')
  const next: AttendanceRecord = { ...rec, checkOut: now.toISOString(), photoOut: picture }
  update((s) => ({ ...s, attendance: s.attendance.map((a) => (a.id === rec.id ? next : a)) }))
  return next
}
