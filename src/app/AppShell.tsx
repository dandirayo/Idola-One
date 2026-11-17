import { LogOut, Menu, Search, X } from 'lucide-react'
import { LogoMark } from '@/components/LogoMark'
import { concept, routeIcons } from '@/lib/icons'
import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useStore } from '@/data/store'
import { accessibleBusinesses, canOpen, navFor, type BusinessKind, type Role } from '@/lib/access'
import { useAuth } from '@/lib/auth'
import { isVisibleTo } from '@/lib/notifications'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'

function Logo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <LogoMark variant="lime" />
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight text-white">Idola One</span>
        <span className="block truncate text-xs text-white/60">{name}</span>
      </span>
    </div>
  )
}

function SidebarContent({
  role,
  kind,
  businessName,
  canSwitch,
  onNavigate,
}: {
  role: Role
  kind: BusinessKind
  businessName: string
  canSwitch: boolean
  onNavigate?: () => void
}) {
  const requests = useStore((s) => s.requests)
  const pending = requests.filter((r) => r.status === 'pending').length
  const entries = navFor(role, kind)
  const navigate = useNavigate()

  let lastGroup = ''
  return (
    <div className="flex h-full flex-col gap-4 rounded-[1.75rem] bg-sidebar p-4">
      <Logo name={businessName} />
      <nav aria-label="Menu utama" className="scroll-thin flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        {entries.map(({ to, label, group }) => {
          const Icon = routeIcons[to] ?? concept.dashboard
          const badge = to === '/requests/review' ? pending : 0
          const heading = group !== lastGroup && entries.length > 6
          lastGroup = group
          return (
            <div key={to}>
              {heading && <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">{group}</p>}
              <NavLink
                to={to}
                end={to === '/dashboard' || to === '/pos'}
                onClick={onNavigate}
                className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon className="size-[18px]" aria-hidden />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="grid size-5 place-items-center rounded-full bg-peach text-xs font-bold text-sidebar">{badge}</span>
                ) : null}
              </NavLink>
            </div>
          )
        })}
      </nav>
      {canSwitch && (
        <button
          type="button"
          onClick={() => {
            onNavigate?.()
            navigate('/businesses')
          }}
          className="flex items-center gap-3 rounded-2xl bg-sidebar-hover px-3.5 py-2.5 text-sm font-semibold text-white"
        >
          <concept.switchBusiness className="size-[18px]" aria-hidden />
          Ganti usaha
        </button>
      )}
    </div>
  )
}

export function AppShell() {
  const { session, businessId, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const businesses = useStore((s) => s.businesses)
  const members = useStore((s) => s.members)
  const notifications = useStore((s) => s.notifications)

  if (!session) return <Navigate to="/sign-in" replace />
  const business = businesses.find((b) => b.id === businessId && b.active)
  const options = accessibleBusinesses(businesses, members, session.role, session.employeeId)
  // Usaha belum dipilih, nonaktif, atau aksesnya dicabut
  if (!business || !options.some((b) => b.id === business.id)) return <Navigate to="/businesses" replace />

  const unread = notifications.filter((n) => isVisibleTo(n, session) && !n.read).length
  const allowed = canOpen(location.pathname, session.role, business.kind)

  const sidebar = (onNavigate?: () => void) => (
    <SidebarContent role={session.role} kind={business.kind} businessName={business.name} canSwitch={options.length > 1} onNavigate={onNavigate} />
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-3 sm:p-5">
      <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 lg:block">{sidebar()}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-3 left-3 w-72 max-w-[85vw]">
            {sidebar(() => setOpen(false))}
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
        <div role="note" className="mb-4 flex items-center gap-2 rounded-2xl bg-sidebar px-4 py-2.5 text-xs font-semibold text-white print:hidden">
          <concept.preview className="size-4 shrink-0 text-lime" aria-hidden />
          <span>Mode pratinjau: data contoh di perangkat ini, belum tersambung ke server.</span>
        </div>
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
          {business.kind === 'laundry' && canOpen('/orders', session.role, 'laundry') && (
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
                  className="field field-search"
                />
              </label>
            </form>
          )}
          <Link
            to="/notifications"
            aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi, semua sudah dibaca'}
            className="relative grid size-11 place-items-center rounded-full bg-surface shadow-card"
          >
            <concept.notifications className="size-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
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
            <span className="grid size-8 place-items-center rounded-full bg-lilac text-sm font-bold">{session.name.charAt(0)}</span>
            <span className="hidden text-xs font-semibold sm:block">{session.role === 'owner' ? 'Owner' : 'Karyawan'}</span>
            <LogOut className="size-4 text-muted" aria-hidden />
          </button>
        </header>
        <main>{allowed ? <Outlet /> : <AccessDeniedPage kind={business.kind} />}</main>
      </div>
    </div>
  )
}
