// Aturan pengajuan karyawan. Mengikuti PRD bagian 8.9 (REQ-01 s.d. REQ-04).

export type RequestType = 'stock' | 'overtime' | 'shift_swap' | 'leave' | 'cash_advance' | 'forgot_attendance' | 'incentive'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'completed'
export type RequestAction = 'approve' | 'reject' | 'pay' | 'complete'

export const requestTypeLabel: Record<RequestType, string> = {
  stock: 'Kebutuhan Stok',
  overtime: 'Lembur',
  shift_swap: 'Tukar Shift',
  leave: 'Izin',
  cash_advance: 'Kasbon',
  incentive: 'Insentif',
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

/** Hanya kasbon yang berdampak uang dan menghasilkan kas keluar saat dibayar. */
export function isMoneyRequest(type: RequestType): boolean {
  return type === 'cash_advance'
}

/** Aksi yang boleh dilakukan owner pada status saat ini. */
export function availableActions(type: RequestType, status: RequestStatus): RequestAction[] {
  if (status === 'pending') return ['approve', 'reject']
  if (status === 'approved') return [isMoneyRequest(type) ? 'pay' : 'complete']
  return []
}

export const requestStatuses: RequestStatus[] = ['pending', 'approved', 'rejected', 'paid', 'completed']
