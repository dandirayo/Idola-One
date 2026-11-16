import {
  BarChart3,
  Bell,
  ClipboardList,
  Download,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  Tag,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
}

const ownerNav: NavItem[] = [
  { to: '/dashboard', label: 'Beranda', icon: LayoutGrid },
  { to: '/orders', label: 'Pesanan', icon: ClipboardList },
  { to: '/customers', label: 'Pelanggan', icon: Users },
  { to: '/services', label: 'Layanan & Harga', icon: Tag },
  { to: '/inventory', label: 'Stok', icon: Package },
  { to: '/cashbook', label: 'Buku Kas', icon: Wallet },
  { to: '/reports', label: 'Laporan', icon: BarChart3 },
  { to: '/requests/review', label: 'Pengajuan', icon: Inbox },
  { to: '/employees', label: 'Tim', icon: UserCog },
  { to: '/settings/shop', label: 'Pengaturan', icon: Settings },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="grid size-9 place-items-center rounded-xl bg-lime text-sm font-extrabold text-sidebar">
        I1
      </span>
      <span className="text-xl font-bold text-white">Idola One</span>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const requests = useStore((s) => s.requests)
  const pending = requests.filter((r) => r.status === 'pending').length
  return (
    <div className="flex h-full flex-col gap-6 rounded-[1.75rem] bg-sidebar p-5">
      <Logo />
      <nav aria-label="Menu utama" className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {ownerNav.map(({ to, label, icon: Icon }) => {
          const badge = to === '/requests/review' ? pending : 0
          return (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive ? 'bg-lime text-sidebar' : 'text-white/90 hover:bg-sidebar-hover'
              }`
            }
          >
            <Icon className="size-5" aria-hidden />
            <span className="flex-1">{label}</span>
            {badge ? (
              <span className="grid size-5 place-items-center rounded-full bg-peach text-xs font-bold text-sidebar">
                {badge}
              </span>
            ) : null}
          </NavLink>
          )
        })}
      </nav>
      <div className="rounded-3xl bg-lime p-4 text-sidebar">
        <span className="mb-6 grid size-10 place-items-center rounded-full bg-sidebar text-lime">
          <Download className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-bold">Segera: pasang di layar utama HP</p>
        <p className="mt-0.5 text-xs text-sidebar/70">Tersedia setelah aplikasi web dapat dipasang (PWA).</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const requests = useStore((s) => s.requests)
  const pending = requests.filter((r) => r.status === 'pending').length

  if (!session) return <Navigate to="/sign-in" replace />

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-3 sm:p-5">
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-3 left-3 w-72 max-w-[85vw]">
            <SidebarContent onNavigate={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-sidebar-hover text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="grid size-11 place-items-center rounded-2xl bg-surface shadow-card lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="flex-1" />
          <form
            role="search"
            className="relative hidden w-64 sm:block"
            onSubmit={(e) => {
              e.preventDefault()
              const q = search.trim()
              navigate(q ? `/orders?q=${encodeURIComponent(q)}` : '/orders')
            }}
          >
            <label>
              <span className="sr-only">Cari nomor nota atau pelanggan, tekan Enter</span>
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pesanan atau pelanggan"
                className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none placeholder:text-muted focus:border-ink"
              />
            </label>
          </form>
          <Link
            to="/requests/review"
            aria-label={pending > 0 ? `Pengajuan menunggu keputusan: ${pending}` : 'Pengajuan, tidak ada yang menunggu'}
            className="relative grid size-11 place-items-center rounded-full bg-surface shadow-card"
          >
            <Bell className="size-5" aria-hidden />
            {pending > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-danger" />}
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut()
              navigate('/sign-in', { replace: true })
            }}
            aria-label={`Keluar dari akun ${session.name}`}
            title="Keluar"
            className="flex h-11 items-center gap-2 rounded-full bg-surface pl-1.5 pr-4 shadow-card"
          >
            <span className="grid size-8 place-items-center rounded-full bg-lilac text-sm font-bold">
              {session.name.charAt(0)}
            </span>
            <LogOut className="size-4 text-muted" aria-hidden />
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
