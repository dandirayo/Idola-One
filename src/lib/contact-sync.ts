// Aturan sinkron pelanggan dengan Google Contacts, sama dengan aplikasi Android:
// - nama di Google diberi akhiran " CS" (Customer), dibuang lagi saat diimpor;
// - pelanggan tanpa nomor valid dilewati;
// - ekspor: nomor yang sudah ada di Google tidak dibuat ulang, hanya namanya disamakan;
// - impor: nomor yang sudah ada di aplikasi dilewati, begitu juga nomor kembar di Google.
// Fungsi di sini murni (tanpa jaringan) agar bisa diuji.

import { normalizePhone } from '@/lib/orders'

export const CS_SUFFIX = ' CS'

export interface ContactCustomer {
  id: string
  name: string
  phone: string
}

export interface GoogleContact {
  resourceName: string
  etag: string
  name: string
  phones: string[]
}

export function withCs(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  return /\sCS$/i.test(clean) ? clean.replace(/\sCS$/i, CS_SUFFIX) : `${clean}${CS_SUFFIX}`
}

export function stripCs(name: string): string {
  return name.trim().replace(/\s+/g, ' ').replace(/\s+CS$/i, '')
}

/** Nomor dianggap valid bila minimal 9 digit (aturan sama dengan form pelanggan). */
export function phoneKey(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 9 ? normalizePhone(digits) : null
}

export interface ExportPlan {
  create: { customerId: string; name: string; phone: string }[]
  rename: { resourceName: string; etag: string; name: string }[]
  skipped: number
}

export function planExport(customers: ContactCustomer[], google: GoogleContact[]): ExportPlan {
  const byPhone = new Map<string, GoogleContact>()
  for (const g of google) for (const p of g.phones) {
    const key = phoneKey(p)
    if (key && !byPhone.has(key)) byPhone.set(key, g)
  }
  const plan: ExportPlan = { create: [], rename: [], skipped: 0 }
  const seen = new Set<string>()
  const renamed = new Set<string>()
  for (const c of customers) {
    const key = phoneKey(c.phone)
    if (!key || seen.has(key)) {
      plan.skipped++
      continue
    }
    seen.add(key)
    const target = withCs(c.name)
    const existing = byPhone.get(key)
    if (!existing) {
      plan.create.push({ customerId: c.id, name: target, phone: c.phone })
    } else if (existing.name !== target && !renamed.has(existing.resourceName)) {
      renamed.add(existing.resourceName)
      plan.rename.push({ resourceName: existing.resourceName, etag: existing.etag, name: target })
    } else {
      plan.skipped++
    }
  }
  return plan
}

export interface ImportPlan {
  add: { name: string; phone: string }[]
  skipped: number
}

export function planImport(google: GoogleContact[], customers: ContactCustomer[]): ImportPlan {
  const known = new Set(customers.map((c) => phoneKey(c.phone)).filter((k): k is string => !!k))
  const plan: ImportPlan = { add: [], skipped: 0 }
  for (const g of google) {
    const name = stripCs(g.name)
    const phone = g.phones.find((p) => phoneKey(p))
    const key = phone ? phoneKey(phone) : null
    if (!name || !phone || !key || known.has(key)) {
      plan.skipped++
      continue
    }
    known.add(key)
    plan.add.push({ name, phone: phone.replace(/\D/g, '') })
  }
  return plan
}
