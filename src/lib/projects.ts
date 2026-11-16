// Proyek laundry besar (B2B). Hitungan memakai bilangan bulat agar bebas galat desimal.

export type RateType = 'kg' | 'pcs'

export interface ProjectBatch {
  pcs: number
  kg: number
}

export interface ProjectRate {
  rateType: RateType
  rate: number // Rupiah per kg atau per pcs
}

const toTenths = (n: number) => Math.round(n * 10)

/**
 * Tagihan berjalan dari semua batch, dibulatkan ke atas ke kelipatan Rp1.000
 * (sama dengan aturan pesanan biasa). Tarif per kg memakai berat aktual,
 * tarif per pcs memakai jumlah pcs.
 */
export function billedAmount(project: ProjectRate, batches: ProjectBatch[]): number {
  const units = batches.reduce(
    (sum, b) => sum + (project.rateType === 'kg' ? toTenths(b.kg) : b.pcs * 10),
    0,
  )
  return Math.ceil((units * project.rate) / 10000) * 1000
}

/** Kemajuan dalam persen berdasarkan akumulasi pcs terhadap target. Tidak melebihi 100. */
export function progressPercent(targetPcs: number, batches: ProjectBatch[]): number {
  if (targetPcs <= 0) return 0
  const done = batches.reduce((sum, b) => sum + b.pcs, 0)
  return Math.min(100, Math.round((done / targetPcs) * 100))
}

export function validateBatch(b: ProjectBatch): string | null {
  if (!Number.isInteger(b.pcs) || b.pcs < 0) return 'Jumlah pcs harus bilangan bulat, nol atau lebih.'
  if (!Number.isFinite(b.kg) || b.kg < 0) return 'Berat harus nol atau lebih.'
  if (Math.abs(b.kg * 10 - Math.round(b.kg * 10)) > 1e-9) return 'Berat per 0,1 kg.'
  if (b.pcs === 0 && b.kg === 0) return 'Isi jumlah pcs atau berat.'
  return null
}

export function validateProject(p: { name: string; targetPcs: number; rate: number }): string | null {
  if (!p.name.trim()) return 'Nama proyek wajib diisi.'
  if (!Number.isInteger(p.targetPcs) || p.targetPcs <= 0) return 'Target pcs harus bilangan bulat lebih dari nol.'
  if (!Number.isInteger(p.rate) || p.rate <= 0) return 'Tarif harus bilangan bulat lebih dari nol.'
  return null
}
