// Jadwal shift mingguan berulang dan aturan keterlambatan (SHF-01, ATT-01).

export interface ShiftSlot {
  start: string // 'HH:mm'
  end: string // 'HH:mm'
}

/** Hari dalam seminggu, Senin = 0 sampai Minggu = 6. */
export const weekdayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'] as const

/** Toleransi keterlambatan dalam menit. Di bawah ini dianggap tepat waktu. */
export const LATE_TOLERANCE_MIN = 10

export const shiftPresets: Record<string, ShiftSlot | null> = {
  libur: null,
  pagi: { start: '08:00', end: '16:00' },
  siang: { start: '13:00', end: '21:00' },
}

export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

export function minutesOf(hhmm: string): number {
  const m = HHMM.exec(hhmm)
  if (!m) throw new Error('Jam harus berformat HH:mm.')
  return Number(m[1]) * 60 + Number(m[2])
}

/** Memvalidasi satu shift. Jam selesai harus setelah jam mulai dalam hari yang sama. */
export function validateSlot(slot: ShiftSlot): string | null {
  if (!HHMM.test(slot.start) || !HHMM.test(slot.end)) return 'Jam harus berformat HH:mm.'
  if (minutesOf(slot.end) <= minutesOf(slot.start)) return 'Jam selesai harus setelah jam mulai.'
  return null
}

/**
 * Menit keterlambatan. Bila masuk lebih dari toleransi setelah jam mulai,
 * keterlambatan dihitung penuh dari jam mulai. Tanpa jadwal (libur), tidak ada keterlambatan.
 */
export function lateMinutes(slot: ShiftSlot | null | undefined, checkIn: Date): number {
  if (!slot) return 0
  const actual = checkIn.getHours() * 60 + checkIn.getMinutes()
  const diff = actual - minutesOf(slot.start)
  return diff > LATE_TOLERANCE_MIN ? diff : 0
}

export function slotLabel(slot: ShiftSlot | null | undefined): string {
  return slot ? `${slot.start}–${slot.end}` : 'Libur'
}

/** Kunci tanggal lokal YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
