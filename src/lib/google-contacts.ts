// Sinkron pelanggan ke Google Contacts lewat Google Identity Services (token di browser)
// dan People API. Tanpa paket npm: skrip resmi Google dimuat saat owner menekan
// "Hubungkan Google". Token hanya di memori (hilang saat halaman ditutup), tidak di
// localStorage. Panduan Client ID: docs/07-GOOGLE-CONTACTS.md.

import { useSyncExternalStore } from 'react'
import { planExport, planImport, phoneKey, type ContactCustomer, type GoogleContact } from '@/lib/contact-sync'

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || ''
const SCOPES = 'https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/userinfo.email'
const PEOPLE = 'https://people.googleapis.com/v1'
const BATCH = 200
/** Sinkron otomatis paling sering sekali per 2 menit, sama dengan aplikasi Android. */
export const AUTO_SYNC_MS = 2 * 60 * 1000

export interface SyncResult {
  imported: number
  created: number
  renamed: number
  skipped: number
}

export interface GoogleStatus {
  configured: boolean
  connected: boolean
  account: string | null
  busy: boolean
  lastSync: string | null
  lastResult: SyncResult | null
  error: string | null
}

let status: GoogleStatus = {
  configured: CLIENT_ID !== '',
  connected: false,
  account: null,
  busy: false,
  lastSync: null,
  lastResult: null,
  error: null,
}
const listeners = new Set<() => void>()
function set(patch: Partial<GoogleStatus>) {
  status = { ...status, ...patch }
  for (const l of listeners) l()
}

export function useGoogleStatus(): GoogleStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

// ---- Google Identity Services ----------------------------------------------

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type: string; message?: string }) => void
      }) => TokenClient
      revoke: (token: string, done?: () => void) => void
    }
  }
}

let token: { value: string; expiresAt: number } | null = null
let gisPromise: Promise<Gis> | null = null
/** Nomor (format 62) yang diketahui sudah ada di Google, dari daftar terakhir. */
let knownPhones = new Set<string>()

function loadGis(): Promise<Gis> {
  const w = window as unknown as { google?: Gis }
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google)
  gisPromise ??= new Promise<Gis>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error('Skrip Google tidak termuat.')))
    s.onerror = () => {
      gisPromise = null
      reject(new Error('Tidak bisa memuat skrip Google. Periksa koneksi internet.'))
    }
    document.head.appendChild(s)
  })
  return gisPromise
}

function hasToken() {
  return token !== null && token.expiresAt > Date.now() + 30_000
}

/** Membuka jendela login Google. Harus dipanggil dari klik pengguna (popup). */
export async function connectGoogle(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Client ID Google belum diatur (VITE_GOOGLE_CLIENT_ID).')
  set({ busy: true, error: null })
  try {
    const gis = await loadGis()
    const resp = await new Promise<TokenResponse>((resolve, reject) => {
      const client = gis.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: resolve,
        error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'Jendela login Google ditutup.' : 'Login Google gagal.')),
      })
      client.requestAccessToken({ prompt: status.account ? '' : 'select_account' })
    })
    if (!resp.access_token) throw new Error(resp.error_description || 'Izin Google ditolak.')
    token = { value: resp.access_token, expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 }
    let account: string | null = null
    try {
      const me = await api<{ email?: string }>('https://www.googleapis.com/oauth2/v3/userinfo')
      account = me.email ?? null
    } catch {
      // email tidak wajib
    }
    set({ connected: true, account, busy: false })
  } catch (e) {
    set({ busy: false, error: e instanceof Error ? e.message : 'Login Google gagal.' })
    throw e
  }
}

export function disconnectGoogle() {
  const t = token?.value
  token = null
  knownPhones = new Set()
  set({ connected: false, account: null, lastResult: null })
  if (t) void loadGis().then((g) => g.accounts.oauth2.revoke(t))
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!hasToken()) {
    token = null
    set({ connected: false })
    throw new Error('Sesi Google berakhir. Tekan Hubungkan Google lagi.')
  }
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token!.value}`, 'Content-Type': 'application/json', ...init.headers },
  })
  if (res.status === 401) {
    token = null
    set({ connected: false })
    throw new Error('Sesi Google berakhir. Tekan Hubungkan Google lagi.')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(`Google menolak permintaan (${res.status}). ${body?.error?.message ?? ''}`.trim())
  }
  return (await res.json()) as T
}

// ---- People API ------------------------------------------------------------

interface Person {
  resourceName: string
  etag: string
  names?: { displayName?: string; givenName?: string }[]
  phoneNumbers?: { value?: string }[]
}

async function listContacts(): Promise<GoogleContact[]> {
  const out: GoogleContact[] = []
  let pageToken = ''
  do {
    const q = new URLSearchParams({ personFields: 'names,phoneNumbers', pageSize: '1000' })
    if (pageToken) q.set('pageToken', pageToken)
    const page = await api<{ connections?: Person[]; nextPageToken?: string }>(`${PEOPLE}/people/me/connections?${q}`)
    for (const p of page.connections ?? []) {
      out.push({
        resourceName: p.resourceName,
        etag: p.etag,
        name: p.names?.[0]?.displayName ?? p.names?.[0]?.givenName ?? '',
        phones: (p.phoneNumbers ?? []).map((n) => n.value ?? '').filter(Boolean),
      })
    }
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  knownPhones = new Set(out.flatMap((c) => c.phones.map((p) => phoneKey(p)).filter((k): k is string => !!k)))
  return out
}

async function createContacts(list: { name: string; phone: string }[]) {
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH)
    await api(`${PEOPLE}/people:batchCreateContacts`, {
      method: 'POST',
      body: JSON.stringify({
        contacts: chunk.map((c) => ({ contactPerson: { names: [{ givenName: c.name }], phoneNumbers: [{ value: c.phone }] } })),
        readMask: 'names',
      }),
    })
    for (const c of chunk) {
      const k = phoneKey(c.phone)
      if (k) knownPhones.add(k)
    }
  }
}

async function renameContact(r: { resourceName: string; etag: string; name: string }) {
  await api(`${PEOPLE}/${r.resourceName}:updateContact?updatePersonFields=names`, {
    method: 'PATCH',
    body: JSON.stringify({ etag: r.etag, names: [{ givenName: r.name }] }),
  })
}

// ---- Sinkron ---------------------------------------------------------------

/**
 * Impor dari Google, lalu ekspor pelanggan aplikasi. `addImported` menyimpan pelanggan
 * hasil impor dan mengembalikan yang berhasil disimpan. `full = false` hanya membuat
 * kontak yang belum ada (sinkron otomatis), tanpa impor dan tanpa mengganti nama.
 */
export async function syncContacts(
  customers: ContactCustomer[],
  addImported: (list: { name: string; phone: string }[]) => ContactCustomer[],
  full = true,
): Promise<SyncResult> {
  set({ busy: true, error: null })
  try {
    const google = await listContacts()
    let imported: ContactCustomer[] = []
    let skipped = 0
    if (full) {
      const plan = planImport(google, customers)
      imported = plan.add.length ? addImported(plan.add) : []
      skipped += plan.skipped
    }
    const exportPlan = planExport([...customers, ...imported], google)
    await createContacts(exportPlan.create)
    if (full) for (const r of exportPlan.rename) await renameContact(r)
    const result: SyncResult = {
      imported: imported.length,
      created: exportPlan.create.length,
      renamed: full ? exportPlan.rename.length : 0,
      skipped: skipped + exportPlan.skipped,
    }
    set({ busy: false, lastSync: new Date().toISOString(), lastResult: result })
    return result
  } catch (e) {
    set({ busy: false, error: e instanceof Error ? e.message : 'Sinkron Google gagal.' })
    throw e
  }
}

/** Pelanggan baru langsung dikirim ke Google bila sedang terhubung. Gagal tidak menghalangi simpan. */
export function pushNewCustomer(c: ContactCustomer) {
  if (!status.connected || !hasToken()) return
  const key = phoneKey(c.phone)
  if (!key || knownPhones.has(key)) return
  const plan = planExport([c], [])
  createContacts(plan.create).catch((e: unknown) =>
    set({ error: e instanceof Error ? e.message : 'Gagal mengirim pelanggan ke Google.' }),
  )
}

export function shouldAutoSync(now = Date.now()): boolean {
  return status.connected && hasToken() && !status.busy && (!status.lastSync || now - Date.parse(status.lastSync) > AUTO_SYNC_MS)
}
