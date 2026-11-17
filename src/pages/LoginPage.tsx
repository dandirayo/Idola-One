import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useStore } from '@/data/store'
import { useAuth, type Session } from '@/lib/auth'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const employees = useStore((s) => s.employees).filter((e) => e.active)
  const navigate = useNavigate()
  const [choice, setChoice] = useState('owner')

  if (session) return <Navigate to="/businesses" replace />

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Session =
      choice === 'owner'
        ? { name: 'Dandi', role: 'owner' }
        : (() => {
            const emp = employees.find((x) => x.id === choice)
            return { name: emp?.name ?? 'Karyawan', role: 'employee' as const, employeeId: emp?.id }
          })()
    signIn(next)
    navigate('/businesses', { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-lilac/60 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[1.75rem] bg-surface p-7 shadow-card">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar text-sm font-extrabold text-lime">I1</span>
          <span className="text-xl font-bold">Idola One</span>
        </div>
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="mt-1 text-sm text-muted">Mode pratinjau: pilih peran untuk mencoba tampilannya.</p>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold">Masuk sebagai</legend>
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${choice === 'owner' ? 'border-ink bg-canvas' : 'border-line'}`}>
              <input type="radio" name="who" value="owner" checked={choice === 'owner'} onChange={() => setChoice('owner')} />
              <span>
                <span className="block font-semibold">Owner</span>
                <span className="block text-xs text-muted">Dandi · semua usaha dan administrasi</span>
              </span>
            </label>
            {employees.map((emp) => (
              <label
                key={emp.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm ${choice === emp.id ? 'border-ink bg-canvas' : 'border-line'}`}
              >
                <input type="radio" name="who" value={emp.id} checked={choice === emp.id} onChange={() => setChoice(emp.id)} />
                <span>
                  <span className="block font-semibold">{emp.name}</span>
                  <span className="block text-xs text-muted">Karyawan · {emp.position}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn btn-primary mt-6 w-full">
          Masuk
        </button>

        <p className="mt-4 rounded-xl bg-lilac px-3 py-2 text-xs" role="note">
          Belum terhubung ke server dan tanpa password. Jangan dipakai di produksi.
        </p>
      </form>
    </div>
  )
}
