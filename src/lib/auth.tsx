import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setActor } from '@/data/store'
import type { Role } from '@/lib/access'

export type { Role }

export interface Session {
  name: string
  role: Role
  /** Id karyawan, kosong untuk owner. */
  employeeId?: string
}

interface AuthValue {
  session: Session | null
  /** Usaha yang sedang aktif. Null bila belum dipilih. */
  businessId: string | null
  signIn: (session: Session) => void
  signOut: () => void
  selectBusiness: (id: string | null) => void
}

const SESSION_KEY = 'idola.preview.session'
const BUSINESS_KEY = 'idola.preview.business'
const AuthContext = createContext<AuthValue | null>(null)

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // penyimpanan diblokir: sesi hanya hidup selama tab terbuka
  }
}

/** Sesi lama (tanpa peran valid) dianggap tidak ada. */
function readSession(): Session | null {
  const s = read<Session>(SESSION_KEY)
  return s && (s.role === 'owner' || s.role === 'employee') && typeof s.name === 'string' ? s : null
}

/**
 * Mode pratinjau: belum ada backend, jadi masuk cukup dengan memilih orang.
 * Akan diganti autentikasi backend sendiri (lihat docs/04-BACKEND.md).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)
  const [businessId, setBusinessId] = useState<string | null>(() => (session ? read<string>(BUSINESS_KEY) : null))

  useEffect(() => {
    setActor(session?.name ?? 'Sistem')
  }, [session])

  const signIn = useCallback((next: Session) => {
    write(SESSION_KEY, next)
    write(BUSINESS_KEY, null)
    setSession(next)
    setBusinessId(null)
  }, [])

  const signOut = useCallback(() => {
    write(SESSION_KEY, null)
    write(BUSINESS_KEY, null)
    setSession(null)
    setBusinessId(null)
  }, [])

  const selectBusiness = useCallback((id: string | null) => {
    write(BUSINESS_KEY, id)
    setBusinessId(id)
  }, [])

  const value = useMemo(
    () => ({ session, businessId, signIn, signOut, selectBusiness }),
    [session, businessId, signIn, signOut, selectBusiness],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
