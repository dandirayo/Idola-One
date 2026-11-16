// Proyek laundry besar (B2B): proyek, batch harian, dan pembayaran termin.

import { billedAmount, validateBatch, validateProject, type ProjectBatch, type RateType } from '@/lib/projects'
import { formatRupiah } from '@/lib/format'
import type { PaymentMethod } from '@/lib/orders'
import { dateKey } from '@/lib/shifts'
import {
  getState,
  makeAudit,
  projectPaymentCash,
  requirePositive,
  uid,
  update,
  type Project,
  type ProjectBatchRow,
  type ProjectPaymentRow,
} from './store'

export interface NewProjectInput {
  customerId: string
  name: string
  targetPcs: number
  rateType: RateType
  rate: number
  note: string
}

export function createProject(input: NewProjectInput): Project {
  const customer = getState().customers.find((c) => c.id === input.customerId)
  if (!customer) throw new Error('Pilih pelanggan.')
  const err = validateProject(input)
  if (err) throw new Error(err)
  const project: Project = {
    id: uid('pr'),
    customerId: customer.id,
    customerName: customer.name,
    name: input.name.trim(),
    targetPcs: input.targetPcs,
    rateType: input.rateType,
    rate: input.rate,
    note: input.note.trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
  }
  update((s) => ({
    ...s,
    projects: [project, ...s.projects],
    audit: [makeAudit('Proyek', project.id, project.name, 'Buat proyek', '-', `Target ${project.targetPcs} pcs · ${formatRupiah(project.rate)}/${project.rateType}`), ...s.audit],
  }))
  return project
}

function requireActiveProject(id: string): Project {
  const p = getState().projects.find((x) => x.id === id)
  if (!p) throw new Error('Proyek tidak ditemukan.')
  if (p.status !== 'active') throw new Error('Proyek sudah selesai.')
  return p
}

export function addProjectBatch(projectId: string, batch: ProjectBatch, date: Date = new Date()): ProjectBatchRow {
  requireActiveProject(projectId)
  const err = validateBatch(batch)
  if (err) throw new Error(err)
  if (date.getTime() > Date.now() + 60_000) throw new Error('Tanggal batch tidak boleh di masa depan.')
  const row: ProjectBatchRow = { id: uid('pb'), projectId, date: dateKey(date), pcs: batch.pcs, kg: batch.kg }
  update((s) => ({ ...s, projectBatches: [...s.projectBatches, row] }))
  return row
}

export function projectBilled(projectId: string): number {
  const s = getState()
  const p = s.projects.find((x) => x.id === projectId)
  return p ? billedAmount(p, s.projectBatches.filter((b) => b.projectId === projectId)) : 0
}

export function projectPaid(projectId: string): number {
  return getState().projectPayments.filter((p) => p.projectId === projectId).reduce((sum, p) => sum + p.amount, 0)
}

/**
 * Pembayaran termin. Otomatis menjadi kas masuk. Tidak boleh melebihi tagihan
 * berjalan, jadi catat batch lebih dulu bila pelanggan membayar di muka.
 */
export function addProjectPayment(projectId: string, amount: number, method: PaymentMethod): ProjectPaymentRow {
  const project = requireActiveProject(projectId)
  requirePositive(amount, 'Nominal')
  const remaining = projectBilled(projectId) - projectPaid(projectId)
  if (amount > remaining) throw new Error(`Nominal melebihi sisa tagihan proyek (${formatRupiah(Math.max(0, remaining))}).`)
  const payment: ProjectPaymentRow = { id: uid('ppay'), projectId, amount, method, at: new Date().toISOString() }
  update((s) => ({
    ...s,
    projectPayments: [...s.projectPayments, payment],
    cash: [...s.cash, projectPaymentCash(payment, project.name)],
    audit: [makeAudit('Proyek', projectId, project.name, 'Pembayaran termin', '-', formatRupiah(amount)), ...s.audit],
  }))
  return payment
}

export function setProjectStatus(projectId: string, status: 'active' | 'done') {
  const p = getState().projects.find((x) => x.id === projectId)
  if (!p) throw new Error('Proyek tidak ditemukan.')
  update((s) => ({ ...s, projects: s.projects.map((x) => (x.id === projectId ? { ...x, status } : x)) }))
}
