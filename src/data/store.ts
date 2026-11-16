// Store data CONTOH di memori untuk pratinjau. Tidak tersimpan dan hilang saat
// halaman dimuat ulang. Antarmuka fungsi di bawah akan diganti klien API
// backend sendiri tanpa mengubah halaman yang memakainya.

import { useSyncExternalStore } from 'react'
import { orderTotal, type OrderStatus, type PaymentMethod, type Unit } from '@/lib/orders'

export interface Service {
  id: string
  name: string
  unit: Unit
  price: number
}

export interface Customer {
  id: string
  name: string
  phone: string
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

interface State {
  services: Service[]
  customers: Customer[]
  orders: Order[]
}

const services: Service[] = [
  { id: 's1', name: 'Cuci Setrika', unit: 'kg', price: 8000 },
  { id: 's2', name: 'Cuci Kering', unit: 'kg', price: 6000 },
  { id: 's3', name: 'Setrika Saja', unit: 'kg', price: 5000 },
  { id: 's4', name: 'Jas', unit: 'pcs', price: 30000 },
  { id: 's5', name: 'Sprei 180', unit: 'pcs', price: 20000 },
  { id: 's6', name: 'Bed Cover', unit: 'pcs', price: 35000 },
]

const customers: Customer[] = [
  { id: 'c1', name: 'Bu Sinta', phone: '081200000001' },
  { id: 'c2', name: 'Pak Raka', phone: '081200000002' },
  { id: 'c3', name: 'Mbak Dewi', phone: '081200000003' },
  { id: 'c4', name: 'Bu Ratna', phone: '081200000004' },
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

let state: State = {
  services,
  customers,
  orders: [
    seedOrder(12, customers[0], [line(services[0], 3.5)], 'received', 28000, '2026-11-16T08:10:00'),
    seedOrder(11, customers[1], [line(services[3], 2)], 'processing', 30000, '2026-11-16T07:40:00'),
    seedOrder(10, customers[2], [line(services[0], 5), line(services[4], 1)], 'processing', 0, '2026-11-16T07:05:00'),
    seedOrder(9, customers[3], [line(services[0], 4)], 'ready', 32000, '2026-11-15T16:20:00'),
    seedOrder(8, customers[0], [line(services[5], 2)], 'picked_up', 70000, '2026-11-14T10:00:00'),
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
  emit({ ...state, orders: [order, ...state.orders] })
  return order
}

export function addCustomer(name: string, phone: string): Customer {
  const clean = name.trim()
  if (!clean) throw new Error('Nama pelanggan wajib diisi.')
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 9) throw new Error('Nomor telepon tidak valid.')
  const customer: Customer = { id: `c${Date.now()}`, name: clean, phone: digits }
  emit({ ...state, customers: [...state.customers, customer] })
  return customer
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
  })
}
