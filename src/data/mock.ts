// DATA CONTOH untuk pratinjau tampilan. Bukan data pelanggan nyata.

export type OrderStatus = 'received' | 'processing' | 'ready' | 'picked_up'
export type RequestStatus = 'pending' | 'approved' | 'paid'
export type Tone = 'peach' | 'lilac' | 'lime' | 'cream'

export interface RecentOrder {
  id: string
  customer: string
  detail: string
  total: number
  payment: 'Lunas' | 'DP' | 'Belum Bayar'
  kind: string
}

export interface ActiveOrder {
  id: string
  customer: string
  service: string
  status: OrderStatus
  dueIn: string
  progress: number
}

export interface ScheduleItem {
  title: string
  subtitle: string
  tone: Tone
}

export interface RequestItem {
  title: string
  time: string
  status: RequestStatus
  tone: Tone
}

export const recentOrders: RecentOrder[] = [
  { id: 'IDL-20261116-0012', customer: 'Bu Sinta', detail: '3,5 kg · Cuci Setrika', total: 28000, payment: 'Lunas', kind: 'Kiloan' },
  { id: 'IDL-20261116-0011', customer: 'Pak Raka', detail: '2 pcs · Jas', total: 60000, payment: 'DP', kind: 'Satuan' },
  { id: 'IDL-20261116-0010', customer: 'Mbak Dewi', detail: '5 kg + Sprei 180', total: 72000, payment: 'Belum Bayar', kind: 'Gabung' },
]

// Pesanan masuk per hari (Senin sampai Minggu).
export const weeklyOrders = [
  { day: 'Sen', count: 21 },
  { day: 'Sel', count: 27 },
  { day: 'Rab', count: 12 },
  { day: 'Kam', count: 38 },
  { day: 'Jum', count: 23 },
  { day: 'Sab', count: 7 },
  { day: 'Min', count: 22 },
]

export const todaySchedule: ScheduleItem[] = [
  { title: 'Siap diambil', subtitle: '6 pesanan · hubungi via WhatsApp', tone: 'peach' },
  { title: 'Jatuh tempo hari ini', subtitle: '4 pesanan · prioritas setrika', tone: 'lilac' },
  { title: 'Tagihan belum lunas', subtitle: '3 pelanggan · Rp 214.000', tone: 'lime' },
  { title: 'Stok menipis', subtitle: 'Gas LPG 3 kg, Plastik 40', tone: 'cream' },
]

export const activeOrders: ActiveOrder[] = [
  { id: 'IDL-20261116-0009', customer: 'Bu Ratna', service: 'Cuci Setrika 4 kg', status: 'processing', dueIn: '5 jam 30 menit', progress: 55 },
  { id: 'IDL-20261115-0021', customer: 'Pak Anto', service: 'Bed Cover 2 pcs', status: 'ready', dueIn: 'Siap diambil', progress: 100 },
]

export const requests: RequestItem[] = [
  { title: 'Kebutuhan stok: Plastik 40', time: '16 Nov, 09.30', status: 'pending', tone: 'lilac' },
  { title: 'Izin: tukar shift Sabtu', time: '15 Nov, 18.45', status: 'approved', tone: 'lime' },
  { title: 'Kasbon karyawan', time: '14 Nov, 11.00', status: 'paid', tone: 'peach' },
]

export const orderStatusLabel: Record<OrderStatus, string> = {
  received: 'Diterima',
  processing: 'Diproses',
  ready: 'Siap Diambil',
  picked_up: 'Diambil',
}

export const requestStatusLabel: Record<RequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  paid: 'Dibayar',
}
