// Store data CONTOH di memori untuk pratinjau. Tidak tersimpan dan hilang saat
// halaman dimuat ulang. Antarmuka fungsi di bawah akan diganti klien API
// backend sendiri tanpa mengubah halaman yang memakainya.

import { useSyncExternalStore } from 'react'
import type { CashEntry } from '@/lib/finance'
import { isMoneyRequest, type RequestStatus, type RequestType } from '@/lib/requests'
import { normalizePhone, orderTotal, type OrderStatus, type PaymentMethod, type Unit } from '@/lib/orders'

export interface Service {
  id: string
  name: string
  unit: Unit
  price: number
  active: boolean
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

export interface EmployeeRequest {
  id: string
  type: RequestType
  requester: string
  detail: string
  amount: number // hanya untuk pengajuan uang, selain itu 0
  status: RequestStatus
  ownerNote: string
  createdAt: string
}

interface State {
  services: Service[]
  customers: Customer[]
  orders: Order[]
  inventory: InventoryItem[]
  movements: StockMovement[]
  expenses: Expense[]
  requests: EmployeeRequest[]
  /** Satu-satunya sumber pergerakan kas. Diisi oleh aksi di bawah, meniru trigger database. */
  cash: CashEntry[]
}

const services: Service[] = [
  { id: 's1', name: 'Cuci Setrika', unit: 'kg', price: 8000, active: true },
  { id: 's2', name: 'Cuci Kering', unit: 'kg', price: 6000, active: true },
  { id: 's3', name: 'Setrika Saja', unit: 'kg', price: 5000, active: true },
  { id: 's4', name: 'Jas', unit: 'pcs', price: 30000, active: true },
  { id: 's5', name: 'Sprei 180', unit: 'pcs', price: 20000, active: true },
  { id: 's6', name: 'Bed Cover', unit: 'pcs', price: 35000, active: true },
]

const customers: Customer[] = [
  { id: 'c1', name: 'Bu Sinta', phone: '081200000001', active: true },
  { id: 'c2', name: 'Pak Raka', phone: '081200000002', active: true },
  { id: 'c3', name: 'Mbak Dewi', phone: '081200000003', active: true },
  { id: 'c4', name: 'Bu Ratna', phone: '081200000004', active: true },
]

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
    number: `IDL-20261116-${String(n).padStart(4, '0')}`,
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
  seedOrder(12, customers[0], [line(services[0], 3.5)], 'received', 28000, '2026-11-16T08:10:00'),
  seedOrder(11, customers[1], [line(services[3], 2)], 'processing', 30000, '2026-11-16T07:40:00'),
  seedOrder(10, customers[2], [line(services[0], 5), line(services[4], 1)], 'processing', 0, '2026-11-16T07:05:00'),
  seedOrder(9, customers[3], [line(services[0], 4)], 'ready', 32000, '2026-11-15T16:20:00'),
  seedOrder(8, customers[0], [line(services[5], 2)], 'picked_up', 70000, '2026-11-14T10:00:00'),
]

const inventory: InventoryItem[] = [
  { id: 'i1', name: 'Gas LPG 3 kg', unit: 'tabung', stock: 2, min: 2 },
  { id: 'i2', name: 'Plastik 40', unit: 'pcs', stock: 120, min: 100 },
  { id: 'i3', name: 'Plastik 50', unit: 'pcs', stock: 80, min: 100 },
  { id: 'i4', name: 'Sabun Deterjen', unit: 'kg', stock: 12, min: 5 },
  { id: 'i5', name: 'Pewangi', unit: 'liter', stock: 6, min: 3 },
]

const seedExpenses: Expense[] = [
  { id: 'e1', description: 'Listrik token', category: 'Operasional', amount: 100000, method: 'cash', at: '2026-11-15T09:00:00' },
  { id: 'e2', description: 'Kasbon: Rina', category: 'Kasbon', amount: 150000, method: 'cash', at: '2026-11-14T11:00:00' },
]

const seedRequests: EmployeeRequest[] = [
  { id: 'r1', type: 'stock', requester: 'Rina', detail: 'Plastik 40, 200 pcs', amount: 0, status: 'pending', ownerNote: '', createdAt: '2026-11-16T09:30:00' },
  { id: 'r2', type: 'shift_swap', requester: 'Dika', detail: 'Tukar shift Sabtu dengan Rina', amount: 0, status: 'approved', ownerNote: '', createdAt: '2026-11-15T18:45:00' },
  { id: 'r3', type: 'cash_advance', requester: 'Rina', detail: 'Kasbon untuk keperluan keluarga', amount: 150000, status: 'paid', ownerNote: 'Potong gaji minggu depan', createdAt: '2026-11-14T08:00:00' },
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

function expenseCash(e: Expense): CashEntry {
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

let state: State = {
  services,
  customers,
  orders: seedOrders,
  inventory,
  movements: [],
  expenses: seedExpenses,
  requests: seedRequests,
  cash: [
    {
      id: 'cash-opening',
      at: '2026-11-01T08:00:00',
      direction: 'in',
      amount: 500000,
      method: 'cash',
      category: 'Saldo Awal',
      description: 'Saldo pembuka (contoh)',
    },
    ...seedOrders.flatMap((o) => o.payments.map((p) => paymentCash(o, p))),
    ...seedExpenses.map(expenseCash),
  ],
}

const listeners = new Set<() => void>()

function emit(next: State) {
  state = next
  listeners.forEach((l) => l())
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

  const total = orderTotal(input.items, input.skipMinKg)
  const n = state.orders.length + 1
  const now = new Date().toISOString()
  const paid = Math.min(input.initialPayment?.amount ?? 0, total)
  const order: Order = {
    id: `o${n}-${Date.now()}`,
    number: `IDL-${now.slice(0, 10).replaceAll('-', '')}-${String(n).padStart(4, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    items: input.items,
    total,
    paid,
    status: 'received',
    note: input.note,
    createdAt: now,
    skipMinKg: input.skipMinKg,
    payments:
      paid > 0 && input.initialPayment
        ? [{ id: `p${n}-${Date.now()}`, amount: paid, method: input.initialPayment.method, at: now }]
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
  const customer: Customer = { id: `c${Date.now()}`, ...valid, active: true }
  emit({ ...state, customers: [...state.customers, customer] })
  return customer
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

export function addService(name: string, unit: Unit, price: number): Service {
  const valid = validateService(name, price)
  const service: Service = { id: `s${Date.now()}`, ...valid, unit, active: true }
  emit({ ...state, services: [...state.services, service] })
  return service
}

/** Harga baru tidak mengubah pesanan lama: harga disalin ke item saat pesanan dibuat. */
export function updateService(id: string, name: string, price: number) {
  const valid = validateService(name, price)
  emit({ ...state, services: state.services.map((x) => (x.id === id ? { ...x, ...valid } : x)) })
}

export function setServiceActive(id: string, active: boolean) {
  emit({ ...state, services: state.services.map((x) => (x.id === id ? { ...x, active } : x)) })
}

export function setOrderStatus(id: string, status: OrderStatus) {
  emit({ ...state, orders: state.orders.map((o) => (o.id === id ? { ...o, status } : o)) })
}

export function addPayment(id: string, amount: number, method: PaymentMethod) {
  const order = getOrder(id)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  const remaining = order.total - order.paid
  if (amount <= 0) throw new Error('Nominal harus lebih dari nol.')
  if (amount > remaining) throw new Error('Nominal melebihi sisa tagihan.')
  const payment: Payment = { id: `p${Date.now()}`, amount, method, at: new Date().toISOString() }
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

function requirePositive(value: number, label: string) {
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
    id: `e${Date.now()}`,
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
  emit({
    ...state,
    inventory: state.inventory.map((i) => (i.id === itemId ? { ...i, stock: i.stock - qty } : i)),
    movements: [move(itemId, 'OUT', qty, note), ...state.movements],
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
    id: `e${Date.now()}`,
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

export function createRequest(type: RequestType, requester: string, detail: string, amount: number): EmployeeRequest {
  const who = requester.trim()
  const text = detail.trim()
  if (!who) throw new Error('Nama pengaju wajib diisi.')
  if (!text) throw new Error('Isi detail pengajuan.')
  if (isMoneyRequest(type)) requirePositive(amount, 'Nominal')
  const request: EmployeeRequest = {
    id: `r${Date.now()}`,
    type,
    requester: who,
    detail: text,
    amount: isMoneyRequest(type) ? amount : 0,
    status: 'pending',
    ownerNote: '',
    createdAt: new Date().toISOString(),
  }
  emit({ ...state, requests: [request, ...state.requests] })
  return request
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
  })
}

/** Bayar pengajuan uang: status Dibayar, pengeluaran, dan kas keluar dalam satu langkah. */
export function payRequest(id: string, method: PaymentMethod) {
  const r = requireRequest(id)
  if (!isMoneyRequest(r.type)) throw new Error('Pengajuan ini tidak berdampak uang.')
  if (r.status !== 'approved') throw new Error('Setujui pengajuan terlebih dahulu.')
  const expense: Expense = {
    id: `e${Date.now()}`,
    description: `${r.type === 'cash_advance' ? 'Kasbon' : 'Pengajuan'}: ${r.requester}`,
    category: 'Kasbon',
    amount: r.amount,
    method,
    at: new Date().toISOString(),
  }
  emit({
    ...state,
    requests: patchRequest(id, { status: 'paid' }),
    expenses: [expense, ...state.expenses],
    cash: [...state.cash, expenseCash(expense)],
  })
}

/** Tandai pengajuan non-uang sudah dilaksanakan. */
export function completeRequest(id: string) {
  const r = requireRequest(id)
  if (isMoneyRequest(r.type)) throw new Error('Pengajuan uang diselesaikan lewat pembayaran.')
  if (r.status !== 'approved') throw new Error('Setujui pengajuan terlebih dahulu.')
  emit({ ...state, requests: patchRequest(id, { status: 'completed' }) })
}
