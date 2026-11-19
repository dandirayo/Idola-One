// Aturan pengajuan karyawan. Mengikuti PRD bagian 8.9 (REQ-01 s.d. REQ-04).

export type RequestType = 'stock' | 'overtime' | 'shift_swap' | 'leave' | 'cash_advance' | 'forgot_attendance' | 'incentive' | 'expense'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'completed'
export type RequestAction = 'approve' | 'reject' | 'pay' | 'complete'

export const requestTypeLabel: Record<RequestType, string> = {
  stock: 'Kebutuhan Stok',
  overtime: 'Lembur',
  shift_swap: 'Tukar Shift',
  leave: 'Izin',
  cash_advance: 'Kasbon',
  incentive: 'Insentif',
  expense: 'Biaya Operasional',
  forgot_attendance: 'Lupa Absen',
}

/**
 * Label status. Nilai `completed` di database untuk pengajuan non-uang
 * ditampilkan sebagai "Dilaksanakan", bukan "Selesai".
 */
export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  paid: 'Dibayar',
  completed: 'Dilaksanakan',
}

export const requestActionLabel: Record<RequestAction, string> = {
  approve: 'Setujui',
  reject: 'Tolak',
  pay: 'Bayar',
  complete: 'Tandai Dilaksanakan',
}

/** Kasbon dan Biaya Operasional berdampak uang dan menghasilkan kas keluar saat dibayar. */
export function isMoneyRequest(type: RequestType): boolean {
  return type === 'cash_advance' || type === 'expense'
}

export const leaveTypes = ['Sakit', 'Cuti', 'Keperluan pribadi', 'Lainnya'] as const
export const expenseKinds = ['Dana operasional', 'Reimbursement (sudah dibayar)'] as const

/** Isian terstruktur per jenis. Semua opsional di sini, kelengkapan diperiksa di buildRequestDetail. */
export interface RequestFields {
  item?: string
  quantity?: string
  unit?: string
  leaveType?: string
  startDate?: string
  endDate?: string
  fromShift?: string
  toShift?: string
  colleague?: string
  startTime?: string
  endTime?: string
  nextDay?: boolean
  purpose?: string
  expenseKind?: string
  note?: string
}

function need(v: string | undefined, label: string): string {
  const t = (v ?? '').trim()
  if (!t) throw new Error(`${label} wajib diisi.`)
  return t
}

/**
 * Menyusun kalimat detail dari isian terstruktur, seperti aplikasi Android.
 * Jenis lain (Kasbon, Insentif, Lupa Absen) memakai catatan bebas.
 */
export function buildRequestDetail(type: RequestType, f: RequestFields): string {
  const extra = (f.note ?? '').trim()
  let main: string
  switch (type) {
    case 'stock': {
      const q = Number((f.quantity ?? '').replace(',', '.'))
      if (!Number.isFinite(q) || q <= 0) throw new Error('Jumlah harus lebih dari nol.')
      main = `${need(f.item, 'Nama barang')}, ${q} ${need(f.unit, 'Satuan')}`
      break
    }
    case 'leave': {
      const a = need(f.startDate, 'Tanggal mulai')
      const b = need(f.endDate, 'Tanggal selesai')
      if (b < a) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      main = `Izin ${need(f.leaveType, 'Jenis izin')}, ${a} sampai ${b}`
      break
    }
    case 'shift_swap':
      main = `Tukar shift ${need(f.startDate, 'Tanggal tukar shift')}: ${need(f.fromShift, 'Shift asal')} ke ${need(f.toShift, 'Shift tujuan')}, pengganti ${need(f.colleague, 'Rekan pengganti')}`
      break
    case 'overtime': {
      const a = need(f.startTime, 'Jam mulai')
      const b = need(f.endTime, 'Jam selesai')
      if (!f.nextDay && b <= a) throw new Error('Jam selesai harus setelah jam mulai, atau centang selesai hari berikutnya.')
      main = `Lembur ${need(f.startDate, 'Tanggal lembur')} ${a}–${b}${f.nextDay ? ' (selesai hari berikutnya)' : ''}: ${need(f.purpose, 'Pekerjaan yang diselesaikan')}`
      break
    }
    case 'expense':
      main = `${need(f.expenseKind, 'Jenis biaya')}: ${need(f.purpose, 'Tujuan penggunaan')}`
      break
    default:
      return need(f.note, 'Detail')
  }
  return extra ? `${main}. ${extra}` : main
}

/** Aksi yang boleh dilakukan owner pada status saat ini. */
export function availableActions(type: RequestType, status: RequestStatus): RequestAction[] {
  if (status === 'pending') return ['approve', 'reject']
  if (status === 'approved') return [isMoneyRequest(type) ? 'pay' : 'complete']
  return []
}

export const requestStatuses: RequestStatus[] = ['pending', 'approved', 'rejected', 'paid', 'completed']
