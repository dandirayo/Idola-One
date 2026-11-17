// Sampah (recycle bin). Setiap tindakan hapus atau batal di admin.ts membandingkan data
// sebelum dan sesudah: baris yang hilang (removed) dan baris yang berubah (changed)
// disimpan sebagai satu item Sampah, sehingga bisa dipulihkan lengkap dengan kas dan
// insentifnya. Notifikasi dan Audit tidak masuk Sampah.

import { getActor, getState, makeAudit, uid, update, type State, type TrashItem } from './store'

type Row = Record<string, unknown>

/** Koleksi yang dilacak dan cara membentuk kunci barisnya. */
const KEYS: Record<string, (r: Row) => string> = {
  services: (r) => String(r.id),
  customers: (r) => String(r.id),
  orders: (r) => String(r.id),
  inventory: (r) => String(r.id),
  expenses: (r) => String(r.id),
  employees: (r) => String(r.id),
  businesses: (r) => String(r.id),
  requests: (r) => String(r.id),
  attendance: (r) => String(r.id),
  posProducts: (r) => String(r.id),
  projects: (r) => String(r.id),
  projectBatches: (r) => String(r.id),
  projectPayments: (r) => String(r.id),
  payrolls: (r) => String(r.id),
  incentives: (r) => String(r.id),
  cash: (r) => String(r.id),
  members: (r) => `${r.businessId}|${r.employeeId}`,
  posDays: (r) => `${r.businessId}|${r.date}`,
}

/** Koleksi yang berurutan terbaru dulu: baris yang dipulihkan disisipkan lalu diurutkan lagi. */
const NEWEST_FIRST: Record<string, string> = {
  orders: 'createdAt',
  expenses: 'at',
  requests: 'createdAt',
  attendance: 'checkIn',
  projects: 'createdAt',
  payrolls: 'at',
  incentives: 'createdAt',
}

/** Induk yang harus ada agar baris bisa dipulihkan. */
const PARENTS: { coll: string; field: string; parent: string; text: string }[] = [
  { coll: 'orders', field: 'customerId', parent: 'customers', text: 'pelanggan' },
  { coll: 'projects', field: 'customerId', parent: 'customers', text: 'pelanggan' },
  { coll: 'projectBatches', field: 'projectId', parent: 'projects', text: 'proyek' },
  { coll: 'projectPayments', field: 'projectId', parent: 'projects', text: 'proyek' },
  { coll: 'incentives', field: 'orderId', parent: 'orders', text: 'pesanan' },
  { coll: 'attendance', field: 'employeeId', parent: 'employees', text: 'karyawan' },
  { coll: 'payrolls', field: 'employeeId', parent: 'employees', text: 'karyawan' },
  { coll: 'members', field: 'businessId', parent: 'businesses', text: 'usaha' },
  { coll: 'members', field: 'employeeId', parent: 'employees', text: 'karyawan' },
  { coll: 'posProducts', field: 'businessId', parent: 'businesses', text: 'usaha' },
  { coll: 'posDays', field: 'businessId', parent: 'businesses', text: 'usaha' },
]

const collectionNoun: Record<string, string> = {
  services: 'layanan',
  customers: 'pelanggan',
  orders: 'pesanan',
  inventory: 'barang stok',
  expenses: 'pengeluaran',
  employees: 'karyawan',
  businesses: 'usaha',
  requests: 'pengajuan',
  attendance: 'absensi',
  posProducts: 'produk POS',
  projects: 'proyek',
  projectBatches: 'batch proyek',
  projectPayments: 'pembayaran proyek',
  payrolls: 'pembayaran gaji',
  incentives: 'insentif',
  cash: 'baris kas',
  members: 'akses usaha',
  posDays: 'catatan hari jualan',
}

/** Perbandingan nilai yang tidak peduli urutan kunci. */
function stable(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val as Row).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  )
}

const rowsOf = (s: State, coll: string): Row[] => (s as unknown as Record<string, Row[]>)[coll] ?? []

export function diffState(before: State, after: State) {
  const removed: TrashItem['removed'] = {}
  const changed: TrashItem['changed'] = {}
  for (const [coll, keyOf] of Object.entries(KEYS)) {
    const now = new Map(rowsOf(after, coll).map((r) => [keyOf(r), r]))
    for (const old of rowsOf(before, coll)) {
      const next = now.get(keyOf(old))
      if (!next) (removed[coll] ??= []).push(old)
      else if (stable(next) !== stable(old)) (changed[coll] ??= []).push({ before: old, after: next })
    }
  }
  return { removed, changed }
}

export interface TrashMeta {
  kind: string
  label: string
  reason?: string
}

/**
 * Menjalankan perubahan state, lalu menyimpan selisihnya ke Sampah.
 * Dipakai oleh semua fungsi hapus dan batal di admin.ts.
 */
export function applyWithTrash(meta: TrashMeta, produce: (s: State) => State) {
  update((s) => {
    const next = produce(s)
    const { removed, changed } = diffState(s, next)
    if (Object.keys(removed).length === 0 && Object.keys(changed).length === 0) return next
    const item: TrashItem = {
      id: uid('tr'),
      kind: meta.kind,
      label: meta.label,
      deletedAt: new Date().toISOString(),
      actor: getActor(),
      reason: meta.reason ?? '',
      removed,
      changed,
    }
    return { ...next, trash: [item, ...next.trash] }
  })
}

/** Ringkasan isi satu item Sampah, misalnya "1 pesanan, 2 baris kas". */
export function trashSummary(item: TrashItem): string {
  const parts = Object.entries(item.removed).map(([coll, rows]) => `${rows.length} ${collectionNoun[coll] ?? coll}`)
  const changed = Object.entries(item.changed).map(([coll, rows]) => `${rows.length} ${collectionNoun[coll] ?? coll} diubah`)
  return [...parts, ...changed].join(', ')
}

function requireItem(id: string): TrashItem {
  const item = getState().trash.find((t) => t.id === id)
  if (!item) throw new Error('Item Sampah tidak ditemukan.')
  return item
}

/** Memeriksa apakah item bisa dipulihkan. Mengembalikan alasan penolakan, atau null bila aman. */
export function restoreBlocker(item: TrashItem, s: State = getState()): string | null {
  for (const [coll, rows] of Object.entries(item.removed)) {
    const keyOf = KEYS[coll]
    const existing = new Set(rowsOf(s, coll).map(keyOf))
    if ((rows as Row[]).some((r) => existing.has(keyOf(r)))) {
      return `Sudah ada ${collectionNoun[coll] ?? coll} dengan ID yang sama, jadi tidak bisa dipulihkan.`
    }
  }
  for (const [coll, pairs] of Object.entries(item.changed)) {
    const keyOf = KEYS[coll]
    const current = new Map(rowsOf(s, coll).map((r) => [keyOf(r), r]))
    for (const { after } of pairs) {
      const now = current.get(keyOf(after as Row))
      if (!now || stable(now) !== stable(after)) {
        return `Data ${collectionNoun[coll] ?? coll} sudah berubah sejak dihapus, jadi tidak bisa dipulihkan otomatis.`
      }
    }
  }
  // Induk harus ada setelah pemulihan (induk yang ikut dipulihkan dihitung)
  const has = (coll: string, id: unknown) =>
    rowsOf(s, coll).some((r) => KEYS[coll](r) === String(id)) ||
    ((item.removed[coll] ?? []) as Row[]).some((r) => KEYS[coll](r) === String(id))
  for (const link of PARENTS) {
    const rows = [...((item.removed[link.coll] ?? []) as Row[]), ...(item.changed[link.coll] ?? []).map((c) => c.before as Row)]
    for (const r of rows) {
      if (!has(link.parent, r[link.field])) {
        return `Tidak bisa dipulihkan: ${link.text} induknya sudah tidak ada. Pulihkan ${link.text} itu lebih dulu.`
      }
    }
  }
  return null
}

/** Memulihkan satu item Sampah: baris kembali, kas dan insentif ikut kembali. Tercatat di Audit. */
export function restoreFromTrash(id: string) {
  const item = requireItem(id)
  const blocker = restoreBlocker(item)
  if (blocker) throw new Error(blocker)
  update((s) => {
    const draft = { ...s } as unknown as Record<string, Row[]>
    for (const [coll, rows] of Object.entries(item.removed)) {
      const merged = [...rowsOf(s, coll), ...(rows as Row[])]
      const sortKey = NEWEST_FIRST[coll]
      if (sortKey) merged.sort((a, b) => String(b[sortKey]).localeCompare(String(a[sortKey])))
      draft[coll] = merged
    }
    for (const [coll, pairs] of Object.entries(item.changed)) {
      const keyOf = KEYS[coll]
      const byKey = new Map(pairs.map((p) => [keyOf(p.before as Row), p.before as Row]))
      draft[coll] = (draft[coll] ?? rowsOf(s, coll)).map((r) => byKey.get(keyOf(r)) ?? r)
    }
    const next = draft as unknown as State
    return {
      ...next,
      trash: s.trash.filter((t) => t.id !== id),
      audit: [makeAudit('Sampah', id, `${item.kind} · ${item.label}`, 'Pulihkan dari Sampah', trashSummary(item), 'Dipulihkan'), ...s.audit],
    }
  })
}

/** Hapus permanen satu item Sampah. Tidak bisa dibatalkan. */
export function purgeTrash(id: string) {
  const item = requireItem(id)
  update((s) => ({
    ...s,
    trash: s.trash.filter((t) => t.id !== id),
    audit: [makeAudit('Sampah', id, `${item.kind} · ${item.label}`, 'Hapus permanen', trashSummary(item), 'Dihapus permanen'), ...s.audit],
  }))
}
