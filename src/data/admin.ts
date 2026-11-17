// Ubah dan hapus oleh owner (admin). Aturan dasar (docs/06-ADMIN-CRUD.md):
//  1. Yang menyentuh uang wajib beralasan (minimal 5 karakter).
//  2. Kas selalu seimbang: baris kas terkait dibalik (dihapus) dalam langkah yang sama.
//  3. Semua tercatat di Audit, termasuk salinan data sebelum dihapus.
//  4. Data master yang sudah dipakai data lain tidak dihapus; alasannya dijelaskan.

import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel } from '@/lib/orders'
import { applyWithTrash } from './trash'
import { getState, makeAudit, requirePositive, uid, update, type AuditEntry, type Expense, type State } from './store'

export const MIN_REASON = 5

/** Kategori pengeluaran yang dibuat otomatis oleh fitur lain: diubah atau dibatalkan dari sumbernya. */
export const AUTO_EXPENSE_CATEGORIES = ['Stok', 'Gaji', 'Insentif', 'Kasbon']

export function requireReason(reason: string): string {
  const clean = reason.trim()
  if (clean.length < MIN_REASON) throw new Error(`Alasan wajib diisi, minimal ${MIN_REASON} karakter.`)
  return clean
}

const audit = (entity: string, id: string, ref: string, action: string, before: string, after: string): AuditEntry =>
  makeAudit(entity, id, ref, action, before, after)

// ---------- Pemeriksaan "dipakai oleh apa" ----------

export interface Usage {
  /** Penyebab hapus ditolak, dalam kalimat siap tampil. Kosong berarti aman dihapus. */
  reasons: string[]
}

export function customerUsage(id: string, s: State = getState()): Usage {
  const reasons: string[] = []
  const orders = s.orders.filter((o) => o.customerId === id).length
  const projects = s.projects.filter((p) => p.customerId === id).length
  if (orders) reasons.push(`punya ${orders} pesanan`)
  if (projects) reasons.push(`punya ${projects} proyek`)
  return { reasons }
}

export function serviceUsage(id: string, s: State = getState()): Usage {
  const used = s.orders.filter((o) => o.items.some((i) => i.serviceId === id)).length
  return { reasons: used ? [`dipakai ${used} pesanan`] : [] }
}

export function employeeUsage(id: string, s: State = getState()): Usage {
  const reasons: string[] = []
  const emp = s.employees.find((e) => e.id === id)
  const add = (n: number, text: string) => {
    if (n) reasons.push(`${n} ${text}`)
  }
  add(s.attendance.filter((a) => a.employeeId === id).length, 'catatan absensi')
  add(s.payrolls.filter((p) => p.employeeId === id).length, 'pembayaran gaji')
  add(s.incentives.filter((i) => i.employeeId === id).length, 'insentif')
  add(emp ? s.requests.filter((r) => r.requester === emp.name).length : 0, 'pengajuan')
  add(s.members.filter((m) => m.employeeId === id).length, 'keanggotaan usaha')
  add(s.shifts.filter((r) => r.employeeId === id).length, 'jadwal shift')
  return { reasons }
}

export function inventoryUsage(id: string, s: State = getState()): Usage {
  const n = s.movements.filter((m) => m.itemId === id).length
  return { reasons: n ? [`punya ${n} riwayat mutasi stok`] : [] }
}

export function businessUsage(id: string, s: State = getState()): Usage {
  const reasons: string[] = []
  const b = s.businesses.find((x) => x.id === id)
  if (b?.kind === 'laundry') reasons.push('usaha laundry utama')
  const sales = s.posSales.filter((x) => x.businessId === id).length
  if (sales) reasons.push(`punya ${sales} penjualan`)
  return { reasons }
}

function guard(usage: Usage, what: string) {
  if (usage.reasons.length > 0) {
    throw new Error(`${what} tidak bisa dihapus: ${usage.reasons.join(', ')}. Nonaktifkan saja.`)
  }
}

// ---------- 5a: data master ----------

export function deleteCustomer(id: string) {
  const c = getState().customers.find((x) => x.id === id)
  if (!c) throw new Error('Pelanggan tidak ditemukan.')
  guard(customerUsage(id), `Pelanggan ${c.name}`)
  applyWithTrash({ kind: 'Pelanggan', label: c.name }, (s) => ({
    ...s,
    customers: s.customers.filter((x) => x.id !== id),
    audit: [audit('Pelanggan', id, c.name, 'Hapus pelanggan', `${c.name} · ${c.phone}`, '-'), ...s.audit],
  }))
}

export function deleteService(id: string) {
  const sv = getState().services.find((x) => x.id === id)
  if (!sv) throw new Error('Layanan tidak ditemukan.')
  guard(serviceUsage(id), `Layanan ${sv.name}`)
  applyWithTrash({ kind: 'Layanan', label: sv.name }, (s) => ({
    ...s,
    services: s.services.filter((x) => x.id !== id),
    audit: [audit('Layanan', id, sv.name, 'Hapus layanan', `${sv.name} · ${formatRupiah(sv.price)}/${sv.unit}`, '-'), ...s.audit],
  }))
}

export function deleteEmployee(id: string) {
  const e = getState().employees.find((x) => x.id === id)
  if (!e) throw new Error('Karyawan tidak ditemukan.')
  guard(employeeUsage(id), `Karyawan ${e.name}`)
  applyWithTrash({ kind: 'Karyawan', label: e.name }, (s) => ({
    ...s,
    employees: s.employees.filter((x) => x.id !== id),
    audit: [audit('Karyawan', id, e.name, 'Hapus karyawan', `${e.name} · ${e.position}`, '-'), ...s.audit],
  }))
}

function validateStockItem(name: string, unit: string, min: number) {
  const n = name.trim()
  const u = unit.trim()
  if (!n) throw new Error('Nama barang wajib diisi.')
  if (!u) throw new Error('Satuan wajib diisi.')
  if (!Number.isFinite(min) || min < 0) throw new Error('Batas minimum tidak boleh negatif.')
  return { name: n, unit: u, min }
}

export function addInventoryItem(name: string, unit: string, min: number): string {
  const v = validateStockItem(name, unit, min)
  if (getState().inventory.some((i) => i.name.toLowerCase() === v.name.toLowerCase())) {
    throw new Error('Nama barang sudah ada.')
  }
  const id = uid('i')
  update((s) => ({
    ...s,
    inventory: [...s.inventory, { id, ...v, stock: 0 }],
    audit: [audit('Stok', id, v.name, 'Tambah barang', '-', `${v.unit} · minimum ${v.min}`), ...s.audit],
  }))
  return id
}

export function updateInventoryItem(id: string, name: string, unit: string, min: number) {
  const item = getState().inventory.find((i) => i.id === id)
  if (!item) throw new Error('Barang tidak ditemukan.')
  const v = validateStockItem(name, unit, min)
  if (getState().inventory.some((i) => i.id !== id && i.name.toLowerCase() === v.name.toLowerCase())) {
    throw new Error('Nama barang sudah ada.')
  }
  update((s) => ({
    ...s,
    inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...v } : i)),
    audit: [
      audit('Stok', id, v.name, 'Ubah barang', `${item.name} · ${item.unit} · min ${item.min}`, `${v.name} · ${v.unit} · min ${v.min}`),
      ...s.audit,
    ],
  }))
}

export function deleteInventoryItem(id: string) {
  const item = getState().inventory.find((i) => i.id === id)
  if (!item) throw new Error('Barang tidak ditemukan.')
  guard(inventoryUsage(id), `Barang ${item.name}`)
  applyWithTrash({ kind: 'Barang stok', label: item.name }, (s) => ({
    ...s,
    inventory: s.inventory.filter((i) => i.id !== id),
    audit: [audit('Stok', id, item.name, 'Hapus barang', `${item.name} · ${item.unit}`, '-'), ...s.audit],
  }))
}

/** Produk POS selalu boleh dihapus: penjualan menyimpan salinan nama dan harga. */
export function deletePosProduct(id: string) {
  const p = getState().posProducts.find((x) => x.id === id)
  if (!p) throw new Error('Produk tidak ditemukan.')
  applyWithTrash({ kind: 'Produk POS', label: p.name }, (s) => ({
    ...s,
    posProducts: s.posProducts.filter((x) => x.id !== id),
    audit: [audit('Produk POS', id, p.name, 'Hapus produk', `${p.name} · ${formatRupiah(p.price)}`, '-'), ...s.audit],
  }))
}

export function updateBusiness(id: string, name: string) {
  const b = getState().businesses.find((x) => x.id === id)
  if (!b) throw new Error('Usaha tidak ditemukan.')
  const clean = name.trim()
  if (!clean) throw new Error('Nama usaha wajib diisi.')
  if (getState().businesses.some((x) => x.id !== id && x.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Nama usaha sudah dipakai.')
  }
  update((s) => ({
    ...s,
    businesses: s.businesses.map((x) => (x.id === id ? { ...x, name: clean } : x)),
    audit: [audit('Usaha', id, clean, 'Ubah nama usaha', b.name, clean), ...s.audit],
  }))
}

export function deleteBusiness(id: string) {
  const b = getState().businesses.find((x) => x.id === id)
  if (!b) throw new Error('Usaha tidak ditemukan.')
  guard(businessUsage(id), `Usaha ${b.name}`)
  applyWithTrash({ kind: 'Usaha', label: b.name }, (s) => ({
    ...s,
    businesses: s.businesses.filter((x) => x.id !== id),
    members: s.members.filter((m) => m.businessId !== id),
    posProducts: s.posProducts.filter((p) => p.businessId !== id),
    posDays: s.posDays.filter((d) => d.businessId !== id),
    audit: [audit('Usaha', id, b.name, 'Hapus usaha', b.name, '-'), ...s.audit],
  }))
}

// ---------- 5b: data uang ----------

/** Pengeluaran membuat baris kas `cash-<id>`; hapus keduanya bersama. */
function dropExpense(s: State, expenseId: string): Pick<State, 'expenses' | 'cash'> {
  return {
    expenses: s.expenses.filter((e) => e.id !== expenseId),
    cash: s.cash.filter((c) => c.id !== `cash-${expenseId}`),
  }
}

/**
 * Hapus pesanan apa pun statusnya. Pembayarannya dibatalkan dan kas masuknya dibalik,
 * hak insentif yang belum dibayar dihapus (yang sudah dibayar tetap, uangnya sudah keluar).
 * Salinan lengkap pesanan disimpan di Audit.
 */
export function deleteOrder(orderId: string, reason: string) {
  const why = requireReason(reason)
  const order = getState().orders.find((o) => o.id === orderId)
  if (!order) throw new Error('Pesanan tidak ditemukan.')
  const paymentCashIds = new Set(order.payments.map((p) => `cash-${p.id}`))
  applyWithTrash({ kind: 'Pesanan', label: order.number, reason: why }, (s) => ({
    ...s,
    orders: s.orders.filter((o) => o.id !== orderId),
    cash: s.cash.filter((c) => !paymentCashIds.has(c.id)),
    incentives: s.incentives.filter((i) => i.orderId !== orderId || i.status === 'paid'),
    audit: [audit('Pesanan', orderId, order.number, 'Hapus pesanan', `${order.customerName} · ${order.items.map((i) => `${i.qty} ${i.unit} ${i.name}`).join(', ')} · total ${formatRupiah(order.total)} · dibayar ${formatRupiah(order.paid)}`, `Dipindah ke Sampah. Alasan: ${why}`), ...s.audit],
  }))
}

/** Batalkan satu pembayaran pesanan: kas masuknya dibalik dan status bayar dihitung ulang. */
export function cancelPayment(orderId: string, paymentId: string, reason: string) {
  const why = requireReason(reason)
  const order = getState().orders.find((o) => o.id === orderId)
  const payment = order?.payments.find((p) => p.id === paymentId)
  if (!order || !payment) throw new Error('Pembayaran tidak ditemukan.')
  applyWithTrash({ kind: 'Pembayaran', label: `${order.number} · ${formatRupiah(payment.amount)}`, reason: why }, (s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === orderId ? { ...o, paid: o.paid - payment.amount, payments: o.payments.filter((p) => p.id !== paymentId) } : o,
    ),
    cash: s.cash.filter((c) => c.id !== `cash-${paymentId}`),
    audit: [
      audit('Pesanan', orderId, order.number, 'Batalkan pembayaran', `${formatRupiah(payment.amount)} · ${paymentMethodLabel[payment.method]}`, `Dibatalkan. Alasan: ${why}`),
      ...s.audit,
    ],
  }))
}

function requireOrdinaryExpense(e: Expense | undefined): Expense {
  if (!e) throw new Error('Pengeluaran tidak ditemukan.')
  if (AUTO_EXPENSE_CATEGORIES.includes(e.category)) {
    throw new Error(`Pengeluaran ${e.category} dibuat otomatis. Ubah atau batalkan dari sumbernya.`)
  }
  return e
}

export interface CashFields {
  description: string
  category: string
  amount: number
  method: Expense['method']
}

export function deleteExpense(expenseId: string, reason: string) {
  const why = requireReason(reason)
  const e = requireOrdinaryExpense(getState().expenses.find((x) => x.id === expenseId))
  applyWithTrash({ kind: 'Pengeluaran', label: e.description, reason: why }, (s) => ({
    ...s,
    ...dropExpense(s, expenseId),
    audit: [audit('Pengeluaran', expenseId, e.description, 'Hapus pengeluaran', `${formatRupiah(e.amount)} · ${e.category}`, `Dipindah ke Sampah. Alasan: ${why}`), ...s.audit],
  }))
}

export function updateExpense(expenseId: string, input: CashFields, reason: string) {
  const why = requireReason(reason)
  const e = requireOrdinaryExpense(getState().expenses.find((x) => x.id === expenseId))
  const description = input.description.trim()
  if (!description) throw new Error('Deskripsi pengeluaran wajib diisi.')
  requirePositive(input.amount, 'Nominal')
  const category = input.category.trim() || 'Operasional'
  if (AUTO_EXPENSE_CATEGORIES.includes(category)) throw new Error(`Kategori ${category} dicadangkan untuk pengeluaran otomatis.`)
  update((s) => ({
    ...s,
    expenses: s.expenses.map((x) => (x.id === expenseId ? { ...x, description, category, amount: input.amount, method: input.method } : x)),
    cash: s.cash.map((c) => (c.id === `cash-${expenseId}` ? { ...c, description, category, amount: input.amount, method: input.method } : c)),
    audit: [
      audit('Pengeluaran', expenseId, description, 'Ubah pengeluaran', `${e.description} · ${formatRupiah(e.amount)} · ${e.category}`, `${description} · ${formatRupiah(input.amount)} · ${category}. Alasan: ${why}`),
      ...s.audit,
    ],
  }))
}

export function deleteManualCash(cashId: string, reason: string) {
  const why = requireReason(reason)
  const c = getState().cash.find((x) => x.id === cashId)
  if (!c?.manual) throw new Error('Hanya kas manual yang bisa dihapus di sini.')
  applyWithTrash({ kind: 'Kas manual', label: c.description, reason: why }, (s) => ({
    ...s,
    cash: s.cash.filter((x) => x.id !== cashId),
    audit: [audit('Kas', cashId, c.description, 'Hapus kas manual', `${c.direction === 'in' ? 'Masuk' : 'Keluar'} ${formatRupiah(c.amount)} · ${c.category}`, `Dipindah ke Sampah. Alasan: ${why}`), ...s.audit],
  }))
}

export function updateManualCash(cashId: string, input: CashFields, reason: string) {
  const why = requireReason(reason)
  const c = getState().cash.find((x) => x.id === cashId)
  if (!c?.manual) throw new Error('Hanya kas manual yang bisa diubah di sini.')
  const description = input.description.trim()
  if (!description) throw new Error('Deskripsi kas wajib diisi.')
  requirePositive(input.amount, 'Nominal')
  const category = input.category.trim() || 'Kas Manual'
  if (category === 'Saldo Awal') throw new Error('Kategori itu dicadangkan untuk saldo pembuka.')
  update((s) => ({
    ...s,
    cash: s.cash.map((x) => (x.id === cashId ? { ...x, description, category, amount: input.amount, method: input.method } : x)),
    audit: [
      audit('Kas', cashId, description, 'Ubah kas manual', `${c.description} · ${formatRupiah(c.amount)}`, `${description} · ${formatRupiah(input.amount)}. Alasan: ${why}`),
      ...s.audit,
    ],
  }))
}

/** Cari pengeluaran sumber: lewat expenseId, atau (data lama) lewat kategori, nominal, dan deskripsi. */
function findSourceExpense(s: State, expenseId: string | undefined, category: string, amount: number, descPart: string) {
  return s.expenses.find((e) => (expenseId ? e.id === expenseId : e.category === category && e.amount === amount && e.description.includes(descPart)))
}

/** Batalkan gaji mingguan: pengeluaran dan kas keluar dibalik, minggu itu bisa dibayar ulang. */
export function cancelPayroll(payrollId: string, reason: string) {
  const why = requireReason(reason)
  const p = getState().payrolls.find((x) => x.id === payrollId)
  if (!p) throw new Error('Pembayaran gaji tidak ditemukan.')
  const src = findSourceExpense(getState(), p.expenseId, 'Gaji', p.amount, `(minggu ${p.weekStart})`)
  applyWithTrash({ kind: 'Gaji', label: `${p.employeeName} · ${p.weekStart}`, reason: why }, (s) => ({
    ...s,
    payrolls: s.payrolls.filter((x) => x.id !== payrollId),
    ...(src ? dropExpense(s, src.id) : {}),
    audit: [audit('Gaji', payrollId, `${p.employeeName} · ${p.weekStart}`, 'Batalkan gaji', formatRupiah(p.amount), `Dibatalkan. Alasan: ${why}`), ...s.audit],
  }))
}

/** Batalkan pembayaran insentif: kas dibalik, status kembali ke hak tercatat. */
export function cancelIncentivePayment(incentiveId: string, reason: string) {
  const why = requireReason(reason)
  const inc = getState().incentives.find((x) => x.id === incentiveId)
  if (!inc) throw new Error('Insentif tidak ditemukan.')
  if (inc.status !== 'paid') throw new Error('Insentif ini belum dibayar.')
  const src = findSourceExpense(getState(), inc.expenseId, 'Insentif', inc.amount, `${inc.itemName} (${inc.orderNumber})`)
  applyWithTrash({ kind: 'Insentif', label: `${inc.itemName} · ${inc.orderNumber}`, reason: why }, (s) => ({
    ...s,
    incentives: s.incentives.map((x) => {
      if (x.id !== incentiveId) return x
      const { paidAt: _paidAt, expenseId: _expenseId, ...rest } = x
      void _paidAt
      void _expenseId
      return { ...rest, status: 'earned' as const }
    }),
    ...(src ? dropExpense(s, src.id) : {}),
    audit: [audit('Gaji', incentiveId, `${inc.itemName} · ${inc.orderNumber}`, 'Batalkan insentif', `Dibayar ${formatRupiah(inc.amount)}`, `Kembali ke hak tercatat. Alasan: ${why}`), ...s.audit],
  }))
}

export function deleteProjectPayment(paymentId: string, reason: string) {
  const why = requireReason(reason)
  const pay = getState().projectPayments.find((x) => x.id === paymentId)
  if (!pay) throw new Error('Pembayaran proyek tidak ditemukan.')
  const project = getState().projects.find((x) => x.id === pay.projectId)
  applyWithTrash({ kind: 'Pembayaran proyek', label: `${project?.name ?? '-'} · ${formatRupiah(pay.amount)}`, reason: why }, (s) => ({
    ...s,
    projectPayments: s.projectPayments.filter((x) => x.id !== paymentId),
    cash: s.cash.filter((c) => c.id !== `cash-${paymentId}`),
    audit: [audit('Proyek', pay.projectId, project?.name ?? '-', 'Hapus pembayaran termin', `${formatRupiah(pay.amount)} · ${paymentMethodLabel[pay.method]}`, `Dipindah ke Sampah. Alasan: ${why}`), ...s.audit],
  }))
}

// ---------- 5c: tim dan proyek ----------

/** Hapus proyek beserta batch dan pembayarannya; kas pembayaran dibalik. */
export function deleteProject(projectId: string, reason: string) {
  const why = requireReason(reason)
  const p = getState().projects.find((x) => x.id === projectId)
  if (!p) throw new Error('Proyek tidak ditemukan.')
  const payIds = new Set(getState().projectPayments.filter((x) => x.projectId === projectId).map((x) => `cash-${x.id}`))
  applyWithTrash({ kind: 'Proyek', label: p.name, reason: why }, (s) => ({
    ...s,
    projects: s.projects.filter((x) => x.id !== projectId),
    projectBatches: s.projectBatches.filter((b) => b.projectId !== projectId),
    projectPayments: s.projectPayments.filter((x) => x.projectId !== projectId),
    cash: s.cash.filter((c) => !payIds.has(c.id)),
    audit: [audit('Proyek', projectId, p.name, 'Hapus proyek', `${p.customerName} · target ${p.targetPcs} pcs · ${formatRupiah(p.rate)}/${p.rateType}`, `Dipindah ke Sampah. Alasan: ${why}`), ...s.audit],
  }))
}

/** Hapus batch. Ditolak bila tagihan baru menjadi lebih kecil dari yang sudah dibayar. */
export function deleteProjectBatch(batchId: string) {
  const s0 = getState()
  const batch = s0.projectBatches.find((b) => b.id === batchId)
  if (!batch) throw new Error('Batch tidak ditemukan.')
  const project = s0.projects.find((p) => p.id === batch.projectId)
  if (!project) throw new Error('Proyek tidak ditemukan.')
  const rest = s0.projectBatches.filter((b) => b.id !== batchId && b.projectId === batch.projectId)
  const billedAfter =
    project.rateType === 'pcs'
      ? rest.reduce((n, b) => n + b.pcs, 0) * project.rate
      : Math.round(rest.reduce((n, b) => n + b.kg, 0) * project.rate)
  const paid = s0.projectPayments.filter((p) => p.projectId === project.id).reduce((n, p) => n + p.amount, 0)
  if (billedAfter < paid) throw new Error('Batch tidak bisa dihapus: tagihan jadi lebih kecil dari yang sudah dibayar.')
  applyWithTrash({ kind: 'Batch proyek', label: `${project.name} · ${batch.date}` }, (s) => ({
    ...s,
    projectBatches: s.projectBatches.filter((b) => b.id !== batchId),
    audit: [audit('Proyek', project.id, project.name, 'Hapus batch', `${batch.date} · ${batch.pcs} pcs · ${batch.kg} kg`, '-'), ...s.audit],
  }))
}

export function deleteAttendance(attendanceId: string, reason: string) {
  const why = requireReason(reason)
  const a = getState().attendance.find((x) => x.id === attendanceId)
  if (!a) throw new Error('Absensi tidak ditemukan.')
  const emp = getState().employees.find((e) => e.id === a.employeeId)
  applyWithTrash({ kind: 'Absensi', label: `${emp?.name ?? '-'} · ${a.date}`, reason: why }, (s) => ({
    ...s,
    attendance: s.attendance.filter((x) => x.id !== attendanceId),
    audit: [
      audit('Absensi', attendanceId, `${emp?.name ?? '-'} · ${a.date}`, 'Hapus absensi', `Masuk ${a.checkIn}${a.checkOut ? ` · pulang ${a.checkOut}` : ''} · telat ${a.lateMinutes} menit`, `Dipindah ke Sampah. Alasan: ${why}`),
      ...s.audit,
    ],
  }))
}

/** Hapus pengajuan yang masih Menunggu, Ditolak, atau Dilaksanakan. Yang Dibayar dibatalkan pembayarannya dulu. */
export function deleteRequest(requestId: string) {
  const r = getState().requests.find((x) => x.id === requestId)
  if (!r) throw new Error('Pengajuan tidak ditemukan.')
  if (r.status === 'paid') throw new Error('Pengajuan yang sudah dibayar tidak dihapus. Batalkan pembayarannya lebih dulu.')
  applyWithTrash({ kind: 'Pengajuan', label: `${r.requester} · ${r.detail}` }, (s) => ({
    ...s,
    requests: s.requests.filter((x) => x.id !== requestId),
    audit: [audit('Pengajuan', requestId, `${r.requester} · ${r.detail}`, 'Hapus pengajuan', `${r.type} · ${r.detail}${r.amount ? ` · ${formatRupiah(r.amount)}` : ''}`, 'Dipindah ke Sampah'), ...s.audit],
  }))
}

/** Batalkan pembayaran pengajuan uang (kasbon): kas dibalik dan status kembali ke Disetujui. */
export function cancelRequestPayment(requestId: string, reason: string) {
  const why = requireReason(reason)
  const r = getState().requests.find((x) => x.id === requestId)
  if (!r) throw new Error('Pengajuan tidak ditemukan.')
  if (r.status !== 'paid') throw new Error('Pengajuan ini belum dibayar.')
  const src = getState().expenses.find(
    (e) => e.category === 'Kasbon' && e.amount === r.amount && e.description.endsWith(`: ${r.requester}`),
  )
  applyWithTrash({ kind: 'Pembayaran pengajuan', label: `${r.requester} · ${formatRupiah(r.amount)}`, reason: why }, (s) => ({
    ...s,
    requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'approved' as const } : x)),
    ...(src ? dropExpense(s, src.id) : {}),
    audit: [audit('Pengajuan', requestId, `${r.requester} · ${r.detail}`, 'Batalkan pembayaran pengajuan', `Dibayar ${formatRupiah(r.amount)}`, `Kembali ke Disetujui. Alasan: ${why}`), ...s.audit],
  }))
}
