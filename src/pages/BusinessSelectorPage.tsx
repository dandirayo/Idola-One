import { Coffee, WashingMachine } from 'lucide-react'
import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useStore } from '@/data/store'
import { accessibleBusinesses, homeFor } from '@/lib/access'
import { useAuth } from '@/lib/auth'

export function BusinessSelectorPage() {
  const { session, selectBusiness, signOut } = useAuth()
  const businesses = useStore((s) => s.businesses)
  const members = useStore((s) => s.members)
  const navigate = useNavigate()

  const options = session ? accessibleBusinesses(businesses, members, session.role, session.employeeId) : []
  const only = options.length === 1 ? options[0] : null

  // Satu usaha saja: langsung masuk tanpa langkah memilih
  useEffect(() => {
    if (only) {
      selectBusiness(only.id)
      navigate(homeFor(only.kind), { replace: true })
    }
  }, [only, selectBusiness, navigate])

  if (!session) return <Navigate to="/sign-in" replace />

  function choose(id: string, kind: 'laundry' | 'beverage') {
    selectBusiness(id)
    navigate(homeFor(kind), { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-md space-y-4">
        <div>
          <p className="text-sm text-muted">Halo, {session.name}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Pilih usaha</h1>
        </div>

        {options.length === 0 ? (
          <div className="rounded-card bg-surface p-5 shadow-card" role="alert">
            <p className="font-semibold">Kamu belum punya akses ke usaha mana pun.</p>
            <p className="mt-1 text-sm text-muted">Minta owner menambahkan aksesmu di Kelola Usaha.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {options.map((b) => {
              const Icon = b.kind === 'laundry' ? WashingMachine : Coffee
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => choose(b.id, b.kind)}
                    className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-left shadow-card card-hover"
                  >
                    <span className={`grid size-12 place-items-center rounded-xl ${b.kind === 'laundry' ? 'bg-lilac' : 'bg-peach'}`}>
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{b.name}</span>
                      <span className="block text-xs text-muted">{b.kind === 'laundry' ? 'Laundry' : 'Minuman'}</span>
                    </span>
                    <span className="inline-flex h-6 items-center rounded-full bg-lime-soft px-2.5 text-xs font-semibold">Aktif</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            signOut()
            navigate('/sign-in', { replace: true })
          }}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          Keluar
        </button>
      </div>
    </div>
  )
}
