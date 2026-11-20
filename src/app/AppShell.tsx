import { LogOut, Search, X } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
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

/** Merek di top bar: logo gelap dan teks gelap di atas kanvas terang. */
function Brand({ name }: { name: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark variant="dark" />
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight text-ink">Idola One</span>
        <span className="block truncate text-xs text-muted">{name}</span>
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
  showLogo = false,
}: {
  role: Role
  kind: BusinessKind
  businessName: string
  canSwitch: boolean
  onNavigate?: () => void
  /** Logo hanya di laci HP. Di desktop logo ada di top bar. */
  showLogo?: boolean
}) {
  const requests = useStore((s) => s.requests)
  const pending = requests.filter((r) => r.status === 'pending').length
  const entries = navFor(role, kind)
  const navigate = useNavigate()
  const location = useLocation()

  let lastGroup = ''
  return (
    <div className="flex h-full flex-col gap-4 rounded-[1.75rem] bg-sidebar p-4">
      {showLogo && <Logo name={businessName} />}
      <nav aria-label="Menu utama" className="scroll-thin flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
        {entries.map(({ to, label, group }) => {
          const Icon = routeIcons[to] ?? concept.dashboard
          const badge = to === '/requests/review' ? pending : 0
          const heading = group !== lastGroup && entries.length > 6
          const first = lastGroup === ''
          lastGroup = group
          return (
            <div key={to}>
              {heading && <p className={`mb-1 ${first ? 'mt-1' : 'mt-3'} px-3 text-[10px] font-bold uppercase tracking-wider text-white/40`}>{group}</p>}
              <NavLink
                to={to}
                end={to === '/dashboard' || to === '/pos'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  // /orders/me punya menu sendiri, jadi menu Pesanan tidak ikut menyala di sana.
                  `nav-link${isActive && !(to === '/orders' && location.pathname.startsWith('/orders/me')) ? ' is-active' : ''}`
                }
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
  const [barClosed, setBarClosed] = useState(() => {
    try {
      return sessionStorage.getItem('idola-one:preview-bar') === 'closed'
    } catch {
      return false
    }
  })
  function closeBar() {
    setBarClosed(true)
    try {
      sessionStorage.setItem('idola-one:preview-bar', 'closed')
    } catch {
      // diabaikan
    }
  }
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

  const sidebar = (onNavigate?: () => void, showLogo = false) => (
    <SidebarContent
      role={session.role}
      kind={business.kind}
      businessName={business.name}
      canSwitch={options.length > 1}
      onNavigate={onNavigate}
      showLogo={showLogo}
    />
  )

  const previewText = (
    <>
      <concept.preview className="size-4 shrink-0 text-lime" aria-hidden />
      <span className="min-w-0 flex-1 py-1.5 lg:truncate lg:py-0">
        <span className="sm:hidden">Mode pratinjau: data tersimpan di browser ini.</span>
        <span className="hidden sm:inline lg:hidden">Mode pratinjau: data contoh tersimpan di browser ini saja, belum tersambung ke server.</span>
        <span className="hidden lg:inline">Pratinjau: data di browser ini</span>
      </span>
      <button
        type="button"
        onClick={closeBar}
        aria-label="Tutup keterangan mode pratinjau"
        className="grid size-11 shrink-0 place-items-center rounded-full text-white/80 hover:bg-sidebar-hover lg:size-9"
      >
        <X className="size-4" aria-hidden />
      </button>
    </>
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 pb-28 sm:px-5 sm:pb-28 lg:pb-5">
      {/* HP dan tablet: keterangan pratinjau satu baris di atas top bar. Desktop: ringkas di dalam top bar. */}
      {!barClosed && (
        <div role="note" className="mt-3 flex items-center gap-2 rounded-2xl bg-sidebar py-0.5 pl-4 pr-0.5 text-xs font-semibold text-white print:hidden lg:hidden">
          {previewText}
        </div>
      )}

      {/* Top bar selebar kontainer dengan jarak kiri dan kanan tetap. Tinggi dari --topbar-h. */}
      <header
        className="z-20 flex shrink-0 items-center gap-3 bg-canvas lg:sticky lg:top-0"
        style={{ height: 'var(--topbar-h)' }}
      >
        <div className="min-w-0 lg:w-64 lg:shrink-0">
          <Brand name={business.name} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {!barClosed && (
            <div role="note" className="hidden h-11 items-center gap-2 rounded-full bg-sidebar pl-4 pr-1 text-xs font-semibold text-white print:hidden lg:flex">
              {previewText}
            </div>
          )}
          {business.kind === 'laundry' && canOpen('/orders', session.role, 'laundry') && (
            <form
              role="search"
              className="relative hidden w-56 sm:block xl:w-64"
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
            className="relative grid size-12 place-items-center rounded-full bg-surface shadow-card lg:size-11"
          >
            <concept.notifications className="size-5" aria-hidden />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            aria-label={`Profil ${session.name}`}
            title="Profil"
            className="flex h-12 items-center gap-2 rounded-full bg-surface pl-1.5 pr-4 shadow-card lg:h-11"
          >
            <span className="grid size-8 place-items-center rounded-full bg-lilac text-sm font-bold">{session.name.charAt(0)}</span>
            <span className="hidden text-xs font-semibold sm:block">{session.role === 'owner' ? 'Owner' : 'Karyawan'}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut()
              navigate('/sign-in', { replace: true })
            }}
            aria-label={`Keluar dari akun ${session.name}`}
            title="Keluar"
            className="grid size-12 place-items-center rounded-full bg-surface shadow-card lg:size-11"
          >
            <LogOut className="size-4 text-muted" aria-hidden />
          </button>
        </div>
      </header>

      {/* Sidebar dan isi halaman mulai di garis yang sama, tepat di bawah top bar. */}
      <div className="flex flex-1 items-start gap-6">
        <aside
          className="sticky hidden w-64 shrink-0 lg:block"
          style={{ top: 'var(--topbar-h)', height: 'calc(100vh - var(--topbar-h) - var(--shell-gap))' }}
        >
          {sidebar()}
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Tutup menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-3 left-3 w-72 max-w-[85vw]">
              {sidebar(() => setOpen(false), true)}
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

        <main className="min-w-0 flex-1">{allowed ? <Outlet /> : <AccessDeniedPage kind={business.kind} />}</main>
      </div>
      <BottomNav role={session.role} kind={business.kind} onMore={() => setOpen(true)} />
    </div>
  )
}
