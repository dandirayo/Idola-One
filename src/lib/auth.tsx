import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Role = 'owner' | 'employee' | 'pos'

export interface Session {
  name: string
  role: Role
}

interface AuthValue {
  session: Session | null
  signIn: (identity: string, password: string) => Promise<void>
  signOut: () => void
}

const STORAGE_KEY = 'idola.preview.session'
const AuthContext = createContext<AuthValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // penyimpanan diblokir: sesi hanya hidup selama tab terbuka
  }
}

/**
 * Mode pratinjau: belum ada backend, jadi login menerima isian apa pun.
 * Akan diganti autentikasi backend sendiri (lihat docs/04-BACKEND.md).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const signIn = useCallback(async (identity: string, password: string) => {
    if (!identity.trim() || !password) {
      throw new Error('Isi username dan password.')
    }
    const next: Session = { name: 'Dandi', role: 'owner' }
    writeSession(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    writeSession(null)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
