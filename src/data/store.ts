// Store data CONTOH di memori untuk pratinjau. Tidak tersimpan dan hilang saat
// halaman dimuat ulang. Antarmuka fungsi di bawah akan diganti klien API
// backend sendiri tanpa mengubah halaman yang memakainya.

import { useSyncExternalStore } from 'react'
import { loadState, scheduleSave } from './persist'
import { catalogServices, serviceByName } from './seed-services'
import type { CashEntry } from '@/lib/finance'
import type { ShopInfo } from '@/lib/receipt'
import type { BusinessKind } from '@/lib/access'
import type { Audience } from '@/lib/notifications'
import { isValidIncentive } from '@/lib/payroll'
import type { CartLine } from '@/lib/pos'
import type { RateType } from '@/lib/projects'
import {
  isMoneyRequest,
  requestTypeLabel,
  type RequestStatus,
  type RequestType,
} from '@/lib/requests'
import { dateKey, lateMinutes, minutesOf, shiftPresets, weekdayIndex, type ShiftSlot } from '@/lib/shifts'
import { formatQty, formatRupiah } from '@/lib/format'
import {
  nextStatuses,
  normalizePhone,
  orderTotal,
  paymentMethodLabel,
  type OrderStatus,
  type PaymentMethod,
  type Unit,
} from '@/lib/orders'

export interface Service {
  id: string
  name: string
  unit: Unit
  price: number
  active: boolean
  /** Kelompok di daftar layanan, misalnya Pakaian atau Kiloan: Cuci Setrika. */
  category?: string
  /** Item satuan yang boleh diberi insentif karyawan (sepatu, helm, tas). */
  incentive?: boolean
  /** Rincian opsional seperti di aplikasi Android. */
  subcategory?: string
  size?: string
  material?: string
  /** Estimasi selesai dalam jam. */
  estimateHours?: number
}

export type ServiceDetails = Pick<Service, 'subcategory' | 'size' | 'material' | 'estimateHours'>

/** Merapikan rincian layanan: teks kosong dibuang, estimasi harus bilangan bulat positif. */
export function cleanServiceDetails(d: ServiceDetails = {}): ServiceDetails {
  const out: ServiceDetails = {}
  for (const k of ['subcategory', 'size', 'material'] as const) {
    const v = d[k]?.trim()
    if (v) out[k] = v
  }
  if (d.estimateHours !== undefined && !Number.isNaN(d.estimateHours)) {
    if (!Number.isInteger(d.estimateHours) || d.estimateHours <= 0) throw new Error('Estimasi selesai harus bilangan bulat jam lebih dari nol.')
    out.estimateHours = d.estimateHours
  }
  return out
}

export interface Customer {
  id: string
  name: string
  phone: string
  active: boolean
}

export interface OrderItem {
  serviceId: string
  name: string
  unit: Unit
  qty: number
  price: number
  /** Insentif per pcs untuk karyawan yang ditugaskan. Dibayar owner setelah pesanan Siap Diambil. */
  incentive?: { perUnit: number; employeeId: string }
}

export interface Payment {
  id: string
  amount: number
  method: PaymentMethod
  at: string
}

export interface Order {
  id: string
  number: string
  customerId: string
  customerName: string
  customerPhone: string
  items: OrderItem[]
  total: number
  paid: number
  status: OrderStatus
  note: string
  createdAt: string
  skipMinKg: boolean
  payments: Payment[]
  /** Nama pembuat pesanan, dicetak sebagai baris Kasir. */
  cashier?: string
}

export interface InventoryItem {
  id: string
  name: string
  unit: string
  stock: number
  min: number
}

export interface StockMovement {
  id: string
  itemId: string
  type: 'IN' | 'OUT' | 'ADJ'
  qty: number // IN dan OUT selalu positif, ADJ boleh negatif
  note: string
  at: string
}

export interface Expense {
  id: string
  description: string
  category: string
  amount: number
  method: PaymentMethod
  at: string
}

export interface Employee {
  id: string
  name: string
  position: string
  weeklySalary: number
  active: boolean
  phone?: string
}

/** Jejak perubahan penting. Hanya ditambah, tidak pernah diubah atau dihapus. */
export interface AuditEntry {
  id: string
  at: string
  actor: string
  entity: string // misalnya Pesanan, Kas, Layanan, Gaji
  entityId: string
  ref: string // rujukan yang mudah dibaca, misalnya nomor nota
  action: string
  before: string
  after: string
}

export interface RequestPayload {
  date: string // YYYY-MM-DD
  checkIn: string // HH:mm
  checkOut?: string // HH:mm
}

export interface EmployeeRequest {
  id: string
  type: RequestType
  requester: string
  detail: string
  amount: number // hanya untuk pengajuan uang, selain itu 0
  status: RequestStatus
  ownerNote: string
  createdAt: string
  payload?: RequestPayload // dipakai pengajuan Lupa Absen
}

export interface Business {
  id: string
  name: string
  kind: BusinessKind
  active: boolean
}

export interface BusinessMember {
  businessId: string
  employeeId: string
  active: boolean
}

export interface AppNotification {
  id: string
  at: string
  title: string
  body: string
  link: string
  audience: Audience
  forName?: string
  read: boolean
}

export interface ShiftRow {
  employeeId: string
  weekday: number // Senin = 0
  start: string
  end: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string // YYYY-MM-DD
  checkIn: string
  checkOut?: string
  lateMinutes: number
  photoIn?: string
  photoOut?: string
  source: 'selfie' | 'manual'
  note: string
}

export interface PosProduct {
  id: string
  businessId: string
  name: string
  price: number
  active: boolean
  sort: number
}

export interface PosSale {
  id: string
  businessId: string
  number: string
  at: string
  method: PaymentMethod
  total: number
  items: CartLine[]
}

export interface PosDay {
  businessId: string
  date: string
  open: boolean
  note: string
}

export interface Project {
  id: string
  customerId: string
  customerName: string
  name: string
  targetPcs: number
  rateType: RateType
  rate: number
  note: string
  status: 'active' | 'done'
  createdAt: string
}

export interface ProjectBatchRow {
  id: string
  projectId: string
  date: string
  pcs: number
  kg: number
}

export interface ProjectPaymentRow {
  id: string
  projectId: string
  amount: number
  method: PaymentMethod
  at: string
}

export interface PayrollRow {
  id: string
  employeeId: string
  employeeName: string
  weekStart: string
  amount: number
  method: PaymentMethod
  at: string
  /** Pengeluaran yang dibuat saat gaji dibayar. */
  expenseId?: string
}

export interface IncentiveRow {
  id: string
  orderId: string
  orderNumber: string
  employeeId: string
  itemName: string
  qty: number
  perUnit: number
  amount: number
  status: 'earned' | 'paid'
  createdAt: string
  paidAt?: string
  /** Pengeluaran yang dibuat saat insentif dibayar. */
  expenseId?: string
}

/** Isi Sampah: baris yang dihapus dan baris yang berubah akibat satu tindakan hapus atau batal. */
export interface TrashItem {
  id: string
  kind: string // jenis yang tampil, misalnya Pesanan atau Pelanggan
  label: string
  deletedAt: string
  actor: string
  reason: string
  removed: Record<string, unknown[]>
  changed: Record<string, { before: unknown; after: unknown }[]>
}

export interface State {
  services: Service[]
  /** Kategori layanan yang dibuat owner dan belum punya layanan. Kategori berisi layanan diturunkan dari layanan. */
  serviceCategories: string[]
  customers: Customer[]
  orders: Order[]
  inventory: InventoryItem[]
  movements: StockMovement[]
  expenses: Expense[]
  requests: EmployeeRequest[]
  employees: Employee[]
  shop: ShopInfo
  audit: AuditEntry[]
  businesses: Business[]
  members: BusinessMember[]
  notifications: AppNotification[]
  shifts: ShiftRow[]
  attendance: AttendanceRecord[]
  posProducts: PosProduct[]
  posSales: PosSale[]
  posDays: PosDay[]
  projects: Project[]
  projectBatches: ProjectBatchRow[]
  projectPayments: ProjectPaymentRow[]
  payrolls: PayrollRow[]
  incentives: IncentiveRow[]
  trash: TrashItem[]
  /** Satu-satunya sumber pergerakan kas. Diisi oleh aksi di bawah, meniru trigger database. */
  cash: CashEntry[]
}

const services: Service[] = catalogServices

const customers: Customer[] = [
  { id: 'c1', name: 'Bu Sinta', phone: '081200000001', active: true },
  { id: 'c2', name: 'Pak Raka', phone: '081200000002', active: true },
  { id: 'c3', name: 'Mbak Dewi', phone: '081200000003', active: true },
  { id: 'c4', name: 'Bu Ratna', phone: '081200000004', active: true },
]

/** Waktu contoh relatif terhadap hari ini (waktu lokal), agar data contoh selalu terlihat "baru". */
function seedAt(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/** Tanggal lokal YYYYMMDD untuk nomor nota. */
function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** Nomor nota berikutnya pada tanggal itu: urutan tertinggi yang ada ditambah satu. */
function nextOrderNumber(orders: { number: string }[], date: Date): string {
  const prefix = `IDL-${ymd(date)}-`
  let max = 0
  for (const o of orders) {
    if (!o.number.startsWith(prefix)) continue
    const seq = Number(o.number.slice(prefix.length))
    if (Number.isInteger(seq) && seq > max) max = seq
  }
  return `${prefix}${pad(max + 1, 4)}`
}

function seedOrder(
  n: number,
  customer: Customer,
  items: OrderItem[],
  status: OrderStatus,
  paid: number,
  createdAt: string,
): Order {
  return {
    id: `o${n}`,
    number: `IDL-${ymd(new Date(createdAt))}-${pad(n, 4)}`,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    items,
    total: orderTotal(items),
    paid,
    status,
    note: '',
    createdAt,
    skipMinKg: false,
    cashier: ['Rina', 'Dika', 'Sari'][n % 3],
    payments: paid > 0 ? [{ id: `p${n}`, amount: paid, method: 'cash', at: createdAt }] : [],
  }
}

const line = (s: Service, qty: number): OrderItem => ({
  serviceId: s.id,
  name: s.name,
  unit: s.unit,
  qty,
  price: s.price,
})

const seedOrders: Order[] = [
  seedOrder(12, customers[0], [line(serviceByName('Cuci Setrika Reguler'), 3.5)], 'received', 28000, seedAt(0, 8, 10)),
  seedOrder(11, customers[1], [line(serviceByName('Jas Cuci Setrika'), 2)], 'processing', 30000, seedAt(0, 7, 40)),
  seedOrder(10, customers[2], [line(serviceByName('Cuci Setrika Reguler'), 5), line(serviceByName('Sprei Besar 180x200 Cuci Setrika'), 1)], 'processing', 0, seedAt(0, 7, 5)),
  seedOrder(9, customers[3], [line(serviceByName('Cuci Setrika Reguler'), 4)], 'ready', 32000, seedAt(1, 16, 20)),
  seedOrder(8, customers[0], [line(serviceByName('Bed Cover Besar'), 2)], 'picked_up', 70000, seedAt(2, 10, 0)),
]

const inventory: InventoryItem[] = [
  { id: 'i1', name: 'Gas LPG 3 kg', unit: 'tabung', stock: 2, min: 2 },
  { id: 'i2', name: 'Plastik 40', unit: 'pcs', stock: 120, min: 100 },
  { id: 'i3', name: 'Plastik 50', unit: 'pcs', stock: 80, min: 100 },
  { id: 'i4', name: 'Sabun Deterjen', unit: 'kg', stock: 12, min: 5 },
  { id: 'i5', name: 'Pewangi', unit: 'liter', stock: 6, min: 3 },
]

const seedExpenses: Expense[] = [
  { id: 'e1', description: 'Listrik token', category: 'Operasional', amount: 100000, method: 'cash', at: seedAt(1, 9, 0) },
  { id: 'e2', description: 'Kasbon: Rina', category: 'Kasbon', amount: 150000, method: 'cash', at: seedAt(2, 11, 0) },
]

const seedRequests: EmployeeRequest[] = [
  { id: 'r1', type: 'stock', requester: 'Rina', detail: 'Plastik 40, 200 pcs', amount: 0, status: 'pending', ownerNote: '', createdAt: seedAt(0, 9, 30) },
  { id: 'r2', type: 'shift_swap', requester: 'Dika', detail: 'Tukar shift Sabtu dengan Rina', amount: 0, status: 'approved', ownerNote: '', createdAt: seedAt(1, 18, 45) },
  { id: 'r3', type: 'cash_advance', requester: 'Rina', detail: 'Kasbon untuk keperluan keluarga', amount: 150000, status: 'paid', ownerNote: 'Potong gaji minggu depan', createdAt: seedAt(2, 8, 0) },
]

function paymentCash(order: Order, p: Payment): CashEntry {
  return {
    id: `cash-${p.id}`,
    at: p.at,
    direction: 'in',
    amount: p.amount,
    method: p.method,
    category: 'Pembayaran',
    description: `${order.customerName} · ${order.number}`,
  }
}

export function expenseCash(e: Expense): CashEntry {
  return {
    id: `cash-${e.id}`,
    at: e.at,
    direction: 'out',
    amount: e.amount,
    method: e.method,
    category: e.category,
    description: e.description,
  }
}

const seedEmployees: Employee[] = [
  { id: 'em1', name: 'Rina', position: 'Kasir', weeklySalary: 350000, active: true },
  { id: 'em2', name: 'Dika', position: 'Cuci', weeklySalary: 300000, active: true },
  { id: 'em3', name: 'Sari', position: 'Setrika', weeklySalary: 300000, active: true },
]

// Data toko contoh. Nomor dan alamat adalah karangan, bukan data Idola.
const seedShop: ShopInfo = {
  name: 'Idola Laundry',
  phone: '0812-0000-0000',
  address: 'Alamat toko (contoh)',
  footer: 'Terima kasih sudah mencuci di Idola Laundry',
  paperWidth: 80,
}

const seedBusinesses: Business[] = [
  { id: 'b1', name: 'Idola Laundry', kind: 'laundry', active: true },
  { id: 'b2', name: 'Es Teh Manis', kind: 'beverage', active: true },
]

const seedMembers: BusinessMember[] = [
  { businessId: 'b1', employeeId: 'em1', active: true },
  { businessId: 'b1', employeeId: 'em2', active: true },
  { businessId: 'b2', employeeId: 'em2', active: true },
  { businessId: 'b2', employeeId: 'em3', active: true },
]

function buildSeedShifts(): ShiftRow[] {
  const rows: ShiftRow[] = []
  const add = (employeeId: string, days: number[], slot: ShiftSlot) => {
    for (const weekday of days) rows.push({ employeeId, weekday, start: slot.start, end: slot.end })
  }
  add('em1', [0, 1, 2, 3, 4, 5], shiftPresets.pagi as ShiftSlot) // Rina: Senin-Sabtu pagi
  add('em2', [1, 2, 3, 4, 5, 6], shiftPresets.siang as ShiftSlot) // Dika: Selasa-Minggu siang
  add('em3', [0, 1, 2, 3, 4], shiftPresets.pagi as ShiftSlot) // Sari: Senin-Jumat pagi
  return rows
}

const seedPosProducts: PosProduct[] = [
  { id: 'pp1', businessId: 'b2', name: 'Es Teh Manis', price: 5000, active: true, sort: 1 },
  { id: 'pp2', businessId: 'b2', name: 'Es Jeruk', price: 7000, active: true, sort: 2 },
  { id: 'pp3', businessId: 'b2', name: 'Es Kopi Susu', price: 12000, active: true, sort: 3 },
  { id: 'pp4', businessId: 'b2', name: 'Es Susu Coklat', price: 10000, active: true, sort: 4 },
]

const seedPosSales: PosSale[] = [
  {
    id: 'ps1',
    businessId: 'b2',
    number: `POS-${ymd(new Date())}-0001`,
    at: seedAt(0, 9, 15),
    method: 'cash',
    total: 17000,
    items: [
      { productId: 'pp1', name: 'Es Teh Manis', price: 5000, qty: 2 },
      { productId: 'pp2', name: 'Es Jeruk', price: 7000, qty: 1 },
    ],
  },
  {
    id: 'ps2',
    businessId: 'b2',
    number: `POS-${ymd(new Date())}-0002`,
    at: seedAt(0, 10, 5),
    method: 'qris',
    total: 12000,
    items: [{ productId: 'pp3', name: 'Es Kopi Susu', price: 12000, qty: 1 }],
  },
]

const seedProjects: Project[] = [
  {
    id: 'pr1',
    customerId: 'c3',
    customerName: 'Mbak Dewi',
    name: 'Hotel Melati: sprei dan handuk',
    targetPcs: 500,
    rateType: 'pcs',
    rate: 3500,
    note: 'Contoh proyek borongan',
    status: 'active',
    createdAt: seedAt(10, 9, 0),
  },
]
const seedProjectBatches: ProjectBatchRow[] = [
  { id: 'pb1', projectId: 'pr1', date: dateKey(new Date(seedAt(3, 9))), pcs: 120, kg: 0 },
  { id: 'pb2', projectId: 'pr1', date: dateKey(new Date(seedAt(1, 9))), pcs: 80, kg: 0 },
]
const seedProjectPayments: ProjectPaymentRow[] = [
  { id: 'ppay1', projectId: 'pr1', amount: 300000, method: 'transfer', at: seedAt(2, 15, 0) },
]

const seedAttendance: AttendanceRecord[] = [
  { id: 'at1', employeeId: 'em1', date: dateKey(new Date(seedAt(1, 8))), checkIn: seedAt(1, 8, 3), checkOut: seedAt(1, 16, 5), lateMinutes: 0, source: 'selfie', note: 'Data contoh, tanpa foto' },
  { id: 'at2', employeeId: 'em2', date: dateKey(new Date(seedAt(1, 13))), checkIn: seedAt(1, 13, 20), checkOut: seedAt(1, 21, 2), lateMinutes: 20, source: 'selfie', note: 'Data contoh, tanpa foto' },
]

const seedNotifications: AppNotification[] = [
  { id: 'n1', at: seedAt(0, 9, 30), title: 'Pengajuan baru: Kebutuhan Stok', body: 'Rina mengajukan Plastik 40, 200 pcs', link: '/requests/review', audience: 'owner', read: false },
  { id: 'n2', at: seedAt(1, 19, 0), title: 'Pengajuan Tukar Shift disetujui', body: 'Tukar shift Sabtu dengan Rina', link: '/requests/me', audience: 'employee', forName: 'Dika', read: true },
]

export function projectPaymentCash(p: ProjectPaymentRow, name: string): CashEntry {
  return {
    id: `cash-${p.id}`,
    at: p.at,
    direction: 'in',
    amount: p.amount,
    method: p.method,
    category: 'Proyek',
    description: `Proyek: ${name}`,
  }
}

const seedState: State = {
  services,
  serviceCategories: [],
  customers,
  orders: seedOrders,
  inventory,
  movements: [],
  expenses: seedExpenses,
  requests: seedRequests,
  employees: seedEmployees,
  shop: seedShop,
  audit: [],
  businesses: seedBusinesses,
  members: seedMembers,
  notifications: seedNotifications,
  shifts: buildSeedShifts(),
  attendance: seedAttendance,
  posProducts: seedPosProducts,
  posSales: seedPosSales,
  posDays: [{ businessId: 'b2', date: dateKey(new Date()), open: true, note: '' }],
  projects: seedProjects,
  projectBatches: seedProjectBatches,
  projectPayments: seedProjectPayments,
  payrolls: [],
  incentives: [],
  trash: [],
  cash: [
    {
      id: 'cash-opening',
      at: seedAt(20, 8, 0),
      direction: 'in',
      amount: 500000,
      method: 'cash',
      category: 'Saldo Awal',
      description: 'Saldo pembuka (contoh)',
    },
    ...seedOrders.flatMap((o) => o.payments.map((p) => paymentCash(o, p))),
    ...seedExpenses.map(expenseCash),
    ...seedProjectPayments.map((p) => projectPaymentCash(p, 'Hotel Melati: sprei dan handuk')),
  ],
}

// Data tersimpan di browser (bila ada) menggantikan data contoh. Lihat persist.ts.
let state: State = loadState(seedState)

const listeners = new Set<() => void>()

function emit(next: State) {
  state = next
  scheduleSave(() => state)
  listeners.forEach((l) => l())
}

/** Dipakai modul data lain untuk mengubah state dalam satu langkah. */
export function update(fn: (s: State) => State) {
  emit(fn(state))
}

let actorName = 'Sistem'
export function getActor(): string {
  return actorName
}
/** Nama pengguna yang sedang bertindak. Dicatat pada jejak audit. */
export function setActor(name: string) {
  actorName = name
}

let counter = 0
export function uid(prefix: string): string {
  counter += 1
  return `${prefix}${Date.now()}-${counter}`
}

export function makeAudit(
  entity: string,
  entityId: string,
  ref: string,
  action: string,
  before: string,
  after: string,
): AuditEntry {
  return { id: uid('a'), at: new Date().toISOString(), actor: actorName, entity, entityId, ref, action, before, after }
}

export function makeNotification(n: Omit<AppNotification, 'id' | 'at' | 'read'>): AppNotification {
  return { id: uid('n'), at: new Date().toISOString(), read: false, ...n }
}

/** Jadwal shift karyawan pada hari tertentu (Senin = 0). Kosong berarti libur. */
export function shiftFor(employeeId: string, weekday: number): ShiftSlot | null {
  const row = state.shifts.find((r) => r.employeeId === employeeId && r.weekday === weekday)
  return row ? { start: row.start, end: row.end } : null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Selector harus mengembalikan referensi yang stabil (bagian dari state, bukan objek baru). */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

/** Untuk pengujian dan pembacaan satu kali di luar komponen. */
export function getState(): State {
  return state
}

export function getOrder(id: string | undefined): Order | undefined {
  return state.orders.find((o) => o.id === id)
}

export interface NewOrderInput {
  customerId: string
  items: OrderItem[]
  skipMinKg: boolean
  note: string
  initialPayment: { amount: number; method: PaymentMethod } | null
}

export function createOrder(input: NewOrderInput): Order {
  const customer = state.customers.find((c) => c.id === input.customerId)
  if (!customer) throw new Error('Pilih pelanggan terlebih dahulu.')
  if (input.items.length === 0) throw new Error('Tambahkan minimal satu layanan.')
  const items: OrderItem[] = input.items.map((it) => {
    if (!it.incentive || it.incentive.perUnit === 0) {
      const { incentive: _drop, ...rest } = it
      void _drop
      return rest
    }
    const service = state.services.find((x) => x.id === it.serviceId)
    if (!service?.incentive || it.unit === 'kg') throw new Error(`${it.name} tidak mendapat insentif.`)
    if (!isValidIncentive(it.incentive.perUnit)) throw new Error('Nilai insentif tidak valid.')
    const emp = state.employees.find((e) => e.id === it.incentive?.employeeId)
    if (!emp?.active) throw new Error('Pilih karyawan penerima insentif yang aktif.')
    return it
  })

  const total = orderTotal(items, input.skipMinKg)
  const nowDate = new Date()
  const now = nowDate.toISOString()
  const stamp = uid('')
  if (input.initialPayment) {
    requirePositive(input.initialPayment.amount, 'Nominal pembayaran')
    if (input.initialPayment.amount > total) throw new Error('Pembayaran awal melebihi total pesanan.')
  }
  const paid = input.initialPayment?.amount ?? 0
  const order: Order = {
    id: `o${stamp}`,
    number: nextOrderNumber(state.orders, nowDate),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    items,
    total,
    paid,
    status: 'received',
    note: input.note,
    createdAt: now,
    skipMinKg: input.skipMinKg,
    cashier: actorName,
    payments:
      paid > 0 && input.initialPayment
        ? [{ id: `p${stamp}`, amount: paid, method: input.initialPayment.method, at: now }]
        : [],
  }
  emit({
    ...state,
    orders: [order, ...state.orders],
    cash: [...state.cash, ...order.payments.map((p) => paymentCash(order, p))],
  })
  return order
}

function validateCustomer(name: string, phone: string, selfId?: string) {
  const clean = name.trim()
  if (!clean) throw new Error('Nama pelanggan wajib diisi.')
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 9) throw new Error('Nomor telepon tidak valid.')
  const normalized = normalizePhone(digits)
  const dup = state.customers.find((c) => c.id !== selfId && normalizePhone(c.phone) === normalized)
  if (dup) throw new Error(`Nomor sudah terdaftar atas nama ${dup.name}.`)
  return { name: clean, phone: digits }
}

export function addCustomer(name: string, phone: string): Customer {
  const valid = validateCustomer(name, phone)
  const customer: Customer = { id: uid('c'), ...valid, active: true }
  emit({ ...state, customers: [...state.customers, customer] })
  return customer
}

/** Pelanggan contoh (bawaan pratinjau) tidak pernah dikirim ke Google Contacts. */
const SEED_CUSTOMER_IDS = new Set(customers.map((c) => c.id))
export function isSeedCustomer(id: string): boolean {
  return SEED_CUSTOMER_IDS.has(id)
}

/** Menambah banyak pelanggan sekaligus (impor Google). Yang tidak valid atau nomornya sudah ada dilewati. */
export function importCustomers(list: { name: string; phone: string }[]): Customer[] {
  const added: Customer[] = []
  const known = new Set(state.customers.map((c) => normalizePhone(c.phone)))
  for (const item of list) {
    const name = item.name.trim()
    const digits = item.phone.replace(/\D/g, '')
    const key = normalizePhone(digits)
    if (!name || digits.length < 9 || known.has(key)) continue
    known.add(key)
    added.push({ id: uid('c'), name, phone: digits, active: true })
  }
  if (added.length) emit({ ...state, customers: [...state.customers, ...added] })
  return added
}

export function updateCustomer(id: string, name: string, phone: string) {
  const valid = validateCustomer(name, phone, id)
  emit({ ...state, customers: state.customers.map((c) => (c.id === id ? { ...c, ...valid } : c)) })
}

/** Nonaktifkan, bukan hapus: riwayat pesanan tetap utuh (hapus lunak). */
export function setCustomerActive(id: string, active: boolean) {
  emit({ ...state, customers: state.customers.map((c) => (c.id === id ? { ...c, active } : c)) })
}

function validateService(name: string, price: number) {
  const clean = name.trim()
  if (!clean) throw new Error('Nama layanan wajib diisi.')
  if (!Number.isInteger(price) || price <= 0) throw new Error('Harga harus bilangan bulat lebih dari nol.')
  return { name: clean, price }
}

export function addService(name: string, unit: Unit, price: number, category?: string, details?: ServiceDetails): Service {
  const valid = validateService(name, price)
  const cat = category?.trim()
  const service: Service = { id: uid('s'), ...valid, unit, active: true, ...(cat ? { category: cat } : {}), ...cleanServiceDetails(details) }
  emit({ ...state, services: [...state.services, service] })
  return service
}

/** Harga baru tidak mengubah pesanan lama: harga disalin ke item saat pesanan dibuat. */
export function updateService(id: string, name: string, price: number, details?: ServiceDetails, category?: string) {
  const valid = validateService(name, price)
  const cat = category === undefined ? undefined : category.trim()
  const extra = details ? cleanServiceDetails(details) : undefined
  const old = state.services.find((x) => x.id === id)
  const audit =
    old && (old.price !== valid.price || old.name !== valid.name)
      ? [
          makeAudit(
            'Layanan',
            id,
            valid.name,
            'Ubah layanan',
            `${old.name} · ${formatRupiah(old.price)}/${old.unit}`,
            `${valid.name} · ${formatRupiah(valid.price)}/${old.unit}`,
          ),
          ...state.audit,
        ]
      : state.audit
  emit({ ...state, services: state.services.map((x) => {
      if (x.id !== id) return x
      const withCat = (v: Service): Service => {
        if (cat === undefined) return v
        const { category: _old, ...noCat } = v
        return cat ? { ...noCat, category: cat } : noCat
      }
      if (!extra) return withCat({ ...x, ...valid })
      const { subcategory: _a, size: _b, material: _c, estimateHours: _d, ...rest } = x
      return withCat({ ...rest, ...valid, ...extra })
    }),
    audit,
  })
}

/** Semua nama kategori: dari layanan dan dari kategori kosong buatan owner. Tanpa duplikat. */
export function allServiceCategories(s: Pick<State, 'services' | 'serviceCategories'>): string[] {
  const names = new Set<string>()
  for (const x of s.services) if (x.category) names.add(x.category)
  for (const c of s.serviceCategories) names.add(c)
  return [...names]
}

function validateCategoryName(name: string, except?: string): string {
  const clean = name.trim()
  if (!clean) throw new Error('Nama kategori wajib diisi.')
  if (clean.toLowerCase() === 'lainnya') throw new Error('Nama "Lainnya" dipakai untuk layanan tanpa kategori.')
  const dup = allServiceCategories(state).find((c) => c.toLowerCase() === clean.toLowerCase() && c !== except)
  if (dup) throw new Error(`Kategori "${dup}" sudah ada.`)
  return clean
}

export function addServiceCategory(name: string) {
  const clean = validateCategoryName(name)
  emit({ ...state, serviceCategories: [...state.serviceCategories, clean] })
}

/** Mengganti nama kategori pada semua layanannya. Harga dan pesanan lama tidak berubah. */
export function renameServiceCategory(from: string, to: string) {
  const clean = validateCategoryName(to, from)
  if (clean === from) return
  const count = state.services.filter((x) => x.category === from).length
  emit({
    ...state,
    services: state.services.map((x) => (x.category === from ? { ...x, category: clean } : x)),
    serviceCategories: state.serviceCategories.map((c) => (c === from ? clean : c)),
    audit: [makeAudit('Kategori layanan', from, clean, 'Ubah nama kategori', from, `${clean} (${count} layanan)`), ...state.audit],
  })
}

/** Hanya kategori kosong yang boleh dihapus; kategori berisi layanan harus dikosongkan dulu. */
export function deleteServiceCategory(name: string) {
  const used = state.services.filter((x) => x.category === name).length
  if (used > 0) throw new Error(`Kategori masih dipakai ${used} layanan. Pindahkan atau hapus layanannya dulu.`)
  emit({ ...state, serviceCategories: state.serviceCategories.filter((c) => c !== name) })
}

export function setServiceActive(id: string, active: boolean) {
  emit({ ...state, services: state.services.map((x) => (x.id === id ? { ...x, active } : x)) })
}

export function setOrderStatus(id: string, status: OrderStatus) {
  const order = getOrder(id)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  if (!nextStatuses(order.status).includes(status)) {
    throw new Error(`Status tidak bisa diubah dari ${order.status} ke ${status}.`)
  }
  let incentives = state.incentives
  let notifications = state.notifications
  if (status === 'ready') {
    notifications = [
      makeNotification({
        title: 'Pesanan siap diambil',
        body: `${order.customerName} · ${order.number}`,
        link: `/orders/${order.id}`,
        audience: 'owner',
      }),
      ...notifications,
    ]
    // Hak insentif tercatat saat Siap Diambil, walau pelanggan belum membayar atau mengambil
    if (!incentives.some((i) => i.orderId === order.id)) {
      const earned: IncentiveRow[] = order.items
        .filter((it) => it.incentive && it.incentive.perUnit > 0)
        .map((it) => ({
          id: uid('inc'),
          orderId: order.id,
          orderNumber: order.number,
          employeeId: it.incentive!.employeeId,
          itemName: it.name,
          qty: it.qty,
          perUnit: it.incentive!.perUnit,
          amount: Math.round(it.qty) * it.incentive!.perUnit,
          status: 'earned' as const,
          createdAt: new Date().toISOString(),
        }))
      incentives = [...earned, ...incentives]
    }
  }
  emit({
    ...state,
    orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)),
    incentives,
    notifications,
  })
}

export function addPayment(id: string, amount: number, method: PaymentMethod) {
  const order = getOrder(id)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  const remaining = order.total - order.paid
  if (amount <= 0) throw new Error('Nominal harus lebih dari nol.')
  if (amount > remaining) throw new Error('Nominal melebihi sisa tagihan.')
  const payment: Payment = { id: uid('p'), amount, method, at: new Date().toISOString() }
  emit({
    ...state,
    orders: state.orders.map((o) =>
      o.id === id ? { ...o, paid: o.paid + amount, payments: [...o.payments, payment] } : o,
    ),
    cash: [...state.cash, paymentCash(order, payment)],
  })
}

function requireItem(itemId: string): InventoryItem {
  const item = state.inventory.find((i) => i.id === itemId)
  if (!item) throw new Error('Pilih barang stok.')
  return item
}

export function requirePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} harus lebih dari nol.`)
}

function move(itemId: string, type: StockMovement['type'], qty: number, note: string): StockMovement {
  return { id: `m${Date.now()}-${state.movements.length}`, itemId, type, qty, note, at: new Date().toISOString() }
}

/**
 * Beli stok: mutasi masuk, pengeluaran kategori Stok, dan kas keluar dalam satu
 * langkah. Bila salah satu gagal, tidak ada yang tersimpan.
 */
export function buyStock(itemId: string, qty: number, amount: number, method: PaymentMethod, note: string) {
  const item = requireItem(itemId)
  requirePositive(qty, 'Jumlah')
  requirePositive(amount, 'Nominal')
  const expense: Expense = {
    id: uid('e'),
    description: `Beli ${item.name} (${qty} ${item.unit})${note ? ` · ${note}` : ''}`,
    category: 'Stok',
    amount,
    method,
    at: new Date().toISOString(),
  }
  emit({
    ...state,
    inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: i.stock + qty } : i)),
    movements: [move(itemId, 'IN', qty, note), ...state.movements],
    expenses: [expense, ...state.expenses],
    cash: [...state.cash, expenseCash(expense)],
  })
}

/** Pakai stok: mutasi keluar dengan pemeriksaan sisa. Tidak membuat pengeluaran kas. */
export function consumeStock(itemId: string, qty: number, note: string) {
  const item = requireItem(itemId)
  requirePositive(qty, 'Jumlah')
  if (qty > item.stock) throw new Error(`Stok tidak cukup. Sisa ${item.stock} ${item.unit}.`)
  const crossesMin = item.stock > item.min && item.stock - qty <= item.min
  emit({
    ...state,
    inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: i.stock - qty } : i)),
    movements: [move(itemId, 'OUT', qty, note), ...state.movements],
    notifications: crossesMin
      ? [
          makeNotification({
            title: `Stok menipis: ${item.name}`,
            body: `Sisa ${formatQty(item.stock - qty)} ${item.unit}, batas minimum ${formatQty(item.min)}`,
            link: '/inventory',
            audience: 'owner',
          }),
          ...state.notifications,
        ]
      : state.notifications,
  })
}

/** Koreksi plus-minus (stok awal atau opname), khusus owner. */
export function adjustStock(itemId: string, delta: number, note: string) {
  const item = requireItem(itemId)
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Isi selisih stok, bukan nol.')
  if (item.stock + delta < 0) throw new Error(`Stok tidak boleh negatif. Sisa ${item.stock} ${item.unit}.`)
  emit({
    ...state,
    inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: i.stock + delta } : i)),
    movements: [move(itemId, 'ADJ', delta, note), ...state.movements],
  })
}

export function addExpense(description: string, category: string, amount: number, method: PaymentMethod) {
  const clean = description.trim()
  if (!clean) throw new Error('Deskripsi pengeluaran wajib diisi.')
  requirePositive(amount, 'Nominal')
  const expense: Expense = {
    id: uid('e'),
    description: clean,
    category: category.trim() || 'Operasional',
    amount,
    method,
    at: new Date().toISOString(),
  }
  emit({ ...state, expenses: [expense, ...state.expenses], cash: [...state.cash, expenseCash(expense)] })
}

function requireRequest(id: string): EmployeeRequest {
  const r = state.requests.find((x) => x.id === id)
  if (!r) throw new Error('Pengajuan tidak ditemukan.')
  return r
}

function patchRequest(id: string, patch: Partial<EmployeeRequest>): EmployeeRequest[] {
  return state.requests.map((r) => (r.id === id ? { ...r, ...patch } : r))
}

export function createRequest(
  type: RequestType,
  requester: string,
  detail: string,
  amount: number,
  payload?: RequestPayload,
): EmployeeRequest {
  const who = requester.trim()
  const text = detail.trim()
  if (!who) throw new Error('Nama pengaju wajib diisi.')
  if (!text) throw new Error('Isi detail pengajuan.')
  if (isMoneyRequest(type)) requirePositive(amount, 'Nominal')
  if (type === 'forgot_attendance') validateForgotPayload(payload)
  const request: EmployeeRequest = {
    id: uid('r'),
    type,
    requester: who,
    detail: text,
    amount: isMoneyRequest(type) ? amount : 0,
    status: 'pending',
    ownerNote: '',
    createdAt: new Date().toISOString(),
    ...(type === 'forgot_attendance' && payload ? { payload } : {}),
  }
  emit({
    ...state,
    requests: [request, ...state.requests],
    notifications: [
      makeNotification({
        title: `Pengajuan baru: ${requestTypeLabel[type]}`,
        body: `${who}: ${text}`,
        link: '/requests/review',
        audience: 'owner',
      }),
      ...state.notifications,
    ],
  })
  return request
}

function validateForgotPayload(payload: RequestPayload | undefined) {
  if (!payload) throw new Error('Isi tanggal dan jam untuk Lupa Absen.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) throw new Error('Tanggal tidak valid.')
  const day = new Date(`${payload.date}T00:00:00`)
  if (Number.isNaN(day.getTime())) throw new Error('Tanggal tidak valid.')
  if (day.getTime() > Date.now()) throw new Error('Tanggal Lupa Absen tidak boleh di masa depan.')
  try {
    const inMin = minutesOf(payload.checkIn)
    if (payload.checkOut && minutesOf(payload.checkOut) <= inMin) throw new Error('Jam pulang harus setelah jam masuk.')
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Jam tidak valid.')
  }
}

function notifyRequester(r: EmployeeRequest, text: string): AppNotification {
  return makeNotification({
    title: `Pengajuan ${requestTypeLabel[r.type]} ${text}`,
    body: r.detail,
    link: '/requests/me',
    audience: 'employee',
    forName: r.requester,
  })
}

/** Keputusan owner. Menolak wajib disertai alasan. */
export function decideRequest(id: string, decision: 'approve' | 'reject', note: string) {
  const r = requireRequest(id)
  if (r.status !== 'pending') throw new Error('Pengajuan ini sudah diputuskan.')
  const clean = note.trim()
  if (decision === 'reject' && !clean) throw new Error('Isi alasan penolakan.')
  emit({
    ...state,
    requests: patchRequest(id, { status: decision === 'approve' ? 'approved' : 'rejected', ownerNote: clean }),
    notifications: [
      notifyRequester(r, decision === 'approve' ? 'disetujui' : 'ditolak'),
      ...state.notifications,
    ],
  })
}

/** Bayar pengajuan uang: status Dibayar, pengeluaran, dan kas keluar dalam satu langkah. */
export function payRequest(id: string, method: PaymentMethod) {
  const r = requireRequest(id)
  if (!isMoneyRequest(r.type)) throw new Error('Pengajuan ini tidak berdampak uang.')
  if (r.status !== 'approved') throw new Error('Setujui pengajuan terlebih dahulu.')
  const expense: Expense = {
    id: uid('e'),
    description: `${r.type === 'cash_advance' ? 'Kasbon' : 'Biaya operasional'}: ${r.requester}`,
    category: r.type === 'cash_advance' ? 'Kasbon' : 'Operasional',
    amount: r.amount,
    method,
    at: new Date().toISOString(),
  }
  emit({
    ...state,
    requests: patchRequest(id, { status: 'paid' }),
    expenses: [expense, ...state.expenses],
    cash: [...state.cash, expenseCash(expense)],
    audit: [
      makeAudit('Pengajuan', id, `${requestTypeLabel[r.type]} ${r.requester}`, 'Bayar pengajuan', 'Disetujui', `Dibayar ${formatRupiah(r.amount)}`),
      ...state.audit,
    ],
    notifications: [notifyRequester(r, 'dibayar'), ...state.notifications],
  })
}

/** Tandai pengajuan non-uang sudah dilaksanakan. Lupa Absen membuat catatan absensi manual. */
export function completeRequest(id: string) {
  const r = requireRequest(id)
  if (isMoneyRequest(r.type)) throw new Error('Pengajuan uang diselesaikan lewat pembayaran.')
  if (r.status !== 'approved') throw new Error('Setujui pengajuan terlebih dahulu.')

  let attendance = state.attendance
  if (r.type === 'forgot_attendance' && r.payload) {
    const emp = state.employees.find((e) => e.name === r.requester)
    if (!emp) throw new Error('Karyawan pengaju tidak ditemukan.')
    if (state.attendance.some((a) => a.employeeId === emp.id && a.date === r.payload!.date)) {
      throw new Error('Sudah ada absensi pada tanggal itu.')
    }
    const [y, m, d] = r.payload.date.split('-').map(Number)
    const at = (hhmm: string) => {
      const [h, mi] = hhmm.split(':').map(Number)
      return new Date(y, m - 1, d, h, mi)
    }
    const inDate = at(r.payload.checkIn)
    const record: AttendanceRecord = {
      id: uid('at'),
      employeeId: emp.id,
      date: r.payload.date,
      checkIn: inDate.toISOString(),
      ...(r.payload.checkOut ? { checkOut: at(r.payload.checkOut).toISOString() } : {}),
      lateMinutes: lateMinutes(shiftFor(emp.id, weekdayIndex(inDate)), inDate),
      source: 'manual',
      note: `Lupa Absen disetujui: ${r.detail}`,
    }
    attendance = [record, ...attendance]
  }
  emit({
    ...state,
    requests: patchRequest(id, { status: 'completed' }),
    attendance,
    notifications: [notifyRequester(r, 'dilaksanakan'), ...state.notifications],
  })
}

function validateEmployee(name: string, position: string, weeklySalary: number) {
  const clean = name.trim()
  if (!clean) throw new Error('Nama karyawan wajib diisi.')
  if (!Number.isInteger(weeklySalary) || weeklySalary < 0) {
    throw new Error('Gaji mingguan harus bilangan bulat, nol atau lebih.')
  }
  return { name: clean, position: position.trim() || 'Karyawan', weeklySalary }
}

export function addEmployee(name: string, position: string, weeklySalary: number): Employee {
  const valid = validateEmployee(name, position, weeklySalary)
  const employee: Employee = { id: uid('em'), ...valid, active: true }
  emit({ ...state, employees: [...state.employees, employee] })
  return employee
}

export function updateEmployee(id: string, name: string, position: string, weeklySalary: number) {
  const valid = validateEmployee(name, position, weeklySalary)
  emit({ ...state, employees: state.employees.map((e) => (e.id === id ? { ...e, ...valid } : e)) })
}

/** Karyawan mengubah profilnya sendiri: nama dan nomor HP. */
export function updateEmployeeProfile(id: string, name: string, phone: string) {
  const clean = name.trim()
  if (!clean) throw new Error('Nama wajib diisi.')
  const digits = phone.replace(/\D/g, '')
  if (digits && digits.length < 9) throw new Error('Nomor telepon tidak valid.')
  emit({ ...state, employees: state.employees.map((e) => (e.id === id ? { ...e, name: clean, phone: digits } : e)) })
}

/** Nonaktifkan, bukan hapus: riwayat absensi dan gaji tetap utuh. */
export function setEmployeeActive(id: string, active: boolean) {
  emit({ ...state, employees: state.employees.map((e) => (e.id === id ? { ...e, active } : e)) })
}

export function updateShop(patch: Partial<ShopInfo>) {
  const next: ShopInfo = { ...state.shop, ...patch }
  next.name = next.name.trim()
  if (!next.name) throw new Error('Nama toko wajib diisi.')
  if (next.paperWidth !== 58 && next.paperWidth !== 80) throw new Error('Lebar kertas harus 58 atau 80 mm.')
  next.phone = next.phone.trim()
  next.address = next.address.trim()
  next.footer = next.footer.trim()
  emit({ ...state, shop: next })
}

export interface PaymentCorrection {
  amount: number
  method: PaymentMethod
  at: string // ISO
}

const auditDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

const describePayment = (amount: number, method: PaymentMethod, at: string) =>
  `${formatRupiah(amount)} · ${paymentMethodLabel[method]} · ${auditDate.format(new Date(at))}`

/**
 * Koreksi pembayaran (khusus owner). Memperbarui pembayaran, total dibayar pada
 * pesanan, dan baris kas yang terkait dalam satu langkah, lalu mencatat audit.
 * Jumlah semua pembayaran tidak boleh melebihi tagihan pesanan.
 */
export function correctPayment(orderId: string, paymentId: string, input: PaymentCorrection) {
  const order = getOrder(orderId)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  const payment = order.payments.find((p) => p.id === paymentId)
  if (!payment) throw new Error('Pembayaran tidak ditemukan.')
  requirePositive(input.amount, 'Nominal')
  const when = new Date(input.at)
  if (Number.isNaN(when.getTime())) throw new Error('Tanggal pembayaran tidak valid.')

  const othersPaid = order.paid - payment.amount
  if (othersPaid + input.amount > order.total) throw new Error('Total pembayaran melebihi tagihan pesanan.')
  const nextAt = when.toISOString()
  const dateChanged = nextAt !== new Date(payment.at).toISOString()
  if (dateChanged && when.getTime() > Date.now() + 60_000) {
    throw new Error('Tanggal pembayaran tidak boleh di masa depan.')
  }
  if (input.amount === payment.amount && input.method === payment.method && nextAt === new Date(payment.at).toISOString()) {
    throw new Error('Tidak ada perubahan.')
  }

  const entry = makeAudit(
    'Pesanan',
    orderId,
    order.number,
    'Koreksi pembayaran',
    describePayment(payment.amount, payment.method, new Date(payment.at).toISOString()),
    describePayment(input.amount, input.method, nextAt),
  )

  emit({
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paid: othersPaid + input.amount,
            payments: o.payments.map((p) =>
              p.id === paymentId ? { ...p, amount: input.amount, method: input.method, at: nextAt } : p,
            ),
          }
        : o,
    ),
    cash: state.cash.map((c) =>
      c.id === `cash-${paymentId}` ? { ...c, amount: input.amount, method: input.method, at: nextAt } : c,
    ),
    audit: [entry, ...state.audit],
  })
}

const RESERVED_CASH_CATEGORIES = ['Saldo Awal']

/**
 * Kas manual oleh owner (masuk atau keluar) di luar pembayaran dan pengeluaran,
 * misalnya setoran modal atau penyesuaian. Tercatat di audit.
 */
export function addManualCash(
  direction: 'in' | 'out',
  description: string,
  category: string,
  amount: number,
  method: PaymentMethod,
) {
  const text = description.trim()
  if (!text) throw new Error('Deskripsi kas wajib diisi.')
  requirePositive(amount, 'Nominal')
  const cat = category.trim() || 'Kas Manual'
  if (RESERVED_CASH_CATEGORIES.includes(cat)) throw new Error('Kategori itu dicadangkan untuk saldo pembuka.')
  const entry: CashEntry = {
    id: uid('cash-manual-'),
    at: new Date().toISOString(),
    direction,
    amount,
    method,
    category: cat,
    description: text,
    manual: true,
  }
  emit({
    ...state,
    cash: [...state.cash, entry],
    audit: [
      makeAudit('Kas', entry.id, text, 'Kas manual', '-', `${direction === 'in' ? 'Masuk' : 'Keluar'} ${formatRupiah(amount)} · ${paymentMethodLabel[method]} · ${cat}`),
      ...state.audit,
    ],
  })
}

const describeItems = (items: OrderItem[], total: number) =>
  `${items.map((i) => `${formatQty(i.qty)} ${i.unit} ${i.name}`).join(', ')} · total ${formatRupiah(total)}`

/**
 * Ubah layanan kiloan pesanan (khusus owner). Harga dan total dihitung ulang
 * dari katalog saat ini. Item satuan tidak berubah. Total baru tidak boleh
 * lebih kecil dari yang sudah dibayar.
 */
export function updateOrderKiloLines(orderId: string, lines: { serviceId: string; qty: number }[]) {
  const order = getOrder(orderId)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  if (order.status === 'cancelled' || order.status === 'picked_up') {
    throw new Error('Pesanan yang sudah diambil atau dibatalkan tidak bisa diubah layanannya.')
  }
  if (lines.length === 0) throw new Error('Isi minimal satu layanan kiloan.')
  const kilo: OrderItem[] = lines.map((l) => {
    const service = state.services.find((x) => x.id === l.serviceId)
    if (!service || service.unit !== 'kg') throw new Error('Pilih layanan kiloan.')
    if (!Number.isFinite(l.qty) || l.qty <= 0) throw new Error('Berat harus lebih dari nol.')
    if (Math.abs(l.qty * 10 - Math.round(l.qty * 10)) > 1e-9) throw new Error('Berat per 0,1 kg.')
    return { serviceId: service.id, name: service.name, unit: 'kg', qty: l.qty, price: service.price }
  })
  const items = [...kilo, ...order.items.filter((i) => i.unit !== 'kg')]
  const total = orderTotal(items, order.skipMinKg)
  if (total < order.paid) {
    throw new Error('Total baru lebih kecil dari yang sudah dibayar. Koreksi pembayaran dulu.')
  }
  emit({
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, items, total } : o)),
    audit: [
      makeAudit('Pesanan', orderId, order.number, 'Ubah layanan kiloan', describeItems(order.items, order.total), describeItems(items, total)),
      ...state.audit,
    ],
  })
}
