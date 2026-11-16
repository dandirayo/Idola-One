import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/dashboard" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(identity, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-lilac/60 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[1.75rem] bg-surface p-7 shadow-card" noValidate>
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar text-sm font-extrabold text-lime">
            I1
          </span>
          <span className="text-xl font-bold">Idola One</span>
        </div>
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="mt-1 text-sm text-muted">Gunakan akun owner atau karyawan.</p>

        <label className="mt-6 block text-sm font-semibold" htmlFor="identity">
          Username atau email
        </label>
        <input
          id="identity"
          autoComplete="username"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm outline-none focus:border-ink"
        />

        <label className="mt-4 block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm outline-none focus:border-ink"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 h-11 w-full rounded-full bg-sidebar text-sm font-bold text-white hover:bg-sidebar-hover disabled:opacity-60"
        >
          {busy ? 'Memproses…' : 'Masuk'}
        </button>

        <p className="mt-4 rounded-xl bg-lilac px-3 py-2 text-xs" role="note">
          Mode pratinjau: isian apa pun diterima. Belum terhubung ke server.
        </p>
      </form>
    </div>
  )
}
