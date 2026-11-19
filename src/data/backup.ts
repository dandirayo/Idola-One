// Backup dan pemulihan data pratinjau. Berkas JSON memakai format yang sama dengan
// penyimpanan browser (persist.ts), jadi versi dan bentuknya selalu diperiksa.
// Memulihkan MENGGANTI data sekarang dan tercatat di Audit.

import { hydrateState, serializeState, STORAGE_VERSION } from './persist'
import { getState, makeAudit, update, type State } from './store'
import { toCsv } from '@/lib/reports'

export function backupFilename(now = new Date()): string {
  const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `idola-one-backup-${d}.json`
}

export function backupJson(state: State = getState()): string {
  return serializeState(state)
}

export interface BackupPreview {
  ok: boolean
  error?: string
  counts: { label: string; count: number }[]
}

const LABELS: [keyof State, string][] = [
  ['customers', 'Pelanggan'],
  ['services', 'Layanan'],
  ['orders', 'Pesanan'],
  ['cash', 'Transaksi kas'],
  ['expenses', 'Pengeluaran'],
  ['employees', 'Karyawan'],
  ['inventory', 'Barang stok'],
]

/** Memeriksa berkas sebelum dipakai: JSON valid, versi sama, dan memuat data. */
export function previewBackup(raw: string): BackupPreview {
  try {
    const parsed = JSON.parse(raw) as { version?: number; state?: Record<string, unknown> }
    if (!parsed || typeof parsed !== 'object' || !parsed.state || typeof parsed.state !== 'object') {
      return { ok: false, error: 'Berkas bukan backup Idola One.', counts: [] }
    }
    if (parsed.version !== STORAGE_VERSION) {
      return { ok: false, error: `Versi backup ${String(parsed.version)} tidak cocok dengan aplikasi (versi ${STORAGE_VERSION}).`, counts: [] }
    }
    const counts = LABELS.map(([key, label]) => {
      const v = parsed.state?.[key]
      return { label, count: Array.isArray(v) ? v.length : 0 }
    })
    return { ok: true, counts }
  } catch {
    return { ok: false, error: 'Berkas bukan JSON yang valid.', counts: [] }
  }
}

/** Mengganti seluruh data dengan isi backup. Mengembalikan false bila berkas tidak valid. */
export function restoreBackup(raw: string): boolean {
  const preview = previewBackup(raw)
  if (!preview.ok) return false
  update((s) => {
    const next = hydrateState(raw, s)
    const summary = preview.counts.map((c) => `${c.label} ${c.count}`).join(', ')
    return { ...next, audit: [makeAudit('Backup', '-', 'Backup', 'Pulihkan dari backup', 'Data sebelumnya diganti', summary), ...next.audit] }
  })
  return true
}

export function customersCsv(state: State = getState()): string {
  return toCsv([
    ['Nama', 'WhatsApp', 'Status'],
    ...state.customers.map((c) => [c.name, c.phone, c.active ? 'Aktif' : 'Nonaktif']),
  ])
}

export function servicesCsv(state: State = getState()): string {
  return toCsv([
    ['Nama', 'Kategori', 'Satuan', 'Harga', 'Status'],
    ...state.services.map((s) => [s.name, s.category ?? '', s.unit, s.price, s.active ? 'Aktif' : 'Nonaktif']),
  ])
}
