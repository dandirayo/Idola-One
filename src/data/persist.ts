// Penyimpanan data pratinjau di browser (localStorage). Jembatan sampai backend ada:
// data bertahan saat halaman dimuat ulang, tetapi hanya di satu browser dan perangkat.
// Semua akses dibungkus try/catch (mode privat, kuota penuh, penyimpanan diblokir).

import type { State } from './store'

export const STORAGE_KEY = 'idola-one:data:v1'
export const STORAGE_VERSION = 2 // 2: katalog layanan asli
const SAVE_DELAY_MS = 300

export function serializeState(state: State): string {
  return JSON.stringify({ version: STORAGE_VERSION, state })
}

/** Menggabungkan data tersimpan ke data contoh. Rusak, versi beda, atau jenis tidak cocok: pakai data contoh. */
export function hydrateState(raw: string | null, seed: State): State {
  if (!raw) return seed
  try {
    const parsed = JSON.parse(raw) as { version?: number; state?: Record<string, unknown> }
    if (parsed.version !== STORAGE_VERSION || !parsed.state || typeof parsed.state !== 'object') return seed
    const merged: Record<string, unknown> = { ...seed }
    for (const key of Object.keys(seed) as (keyof State)[]) {
      const stored = parsed.state[key]
      const base = seed[key]
      if (stored === undefined || stored === null) continue
      if (Array.isArray(base) ? Array.isArray(stored) : typeof stored === 'object' && !Array.isArray(stored)) {
        merged[key] = stored
      }
    }
    return merged as unknown as State
  } catch {
    return seed
  }
}

/** Aktif hanya di browser, dan tidak saat audit visual memakai ?as= (selalu mulai dari data contoh segar). */
export function persistenceEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined' || typeof window === 'undefined') return false
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('as')) return false
    return true
  } catch {
    return false
  }
}

export function loadState(seed: State): State {
  if (!persistenceEnabled()) return seed
  try {
    return hydrateState(localStorage.getItem(STORAGE_KEY), seed)
  } catch {
    return seed
  }
}

/** Foto absensi (data URL) paling besar; dibuang bila kuota penuh. */
function withoutPhotos(state: State): State {
  return { ...state, attendance: state.attendance.map(({ photoIn: _in, photoOut: _out, ...rest }) => (void _in, void _out, rest)) }
}

let timer: ReturnType<typeof setTimeout> | null = null

export function scheduleSave(getState: () => State) {
  if (!persistenceEnabled()) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    try {
      localStorage.setItem(STORAGE_KEY, serializeState(getState()))
    } catch {
      try {
        localStorage.setItem(STORAGE_KEY, serializeState(withoutPhotos(getState())))
      } catch {
        // kuota penuh atau diblokir: data tetap hidup selama tab terbuka
      }
    }
  }, SAVE_DELAY_MS)
}

/** Hapus data tersimpan lalu muat ulang: kembali ke data contoh. */
export function resetSavedData() {
  if (timer) clearTimeout(timer)
  timer = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // diblokir
  }
  window.location.reload()
}
