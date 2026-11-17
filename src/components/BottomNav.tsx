import { Menu } from 'lucide-react'
import { NavLink } from 'react-router'
import { useStore } from '@/data/store'
import { bottomNavFor, type BusinessKind, type Role } from '@/lib/access'
import { routeIcons } from '@/lib/icons'

/**
 * Navigasi utama di HP dan tablet (< 1024px): tombol besar di bawah layar agar
 * bisa dijangkau satu tangan. "Lainnya" membuka menu lengkap.
 */
export function BottomNav({ role, kind, onMore }: { role: Role; kind: BusinessKind; onMore: () => void }) {
  const requests = useStore((s) => s.requests)
  const pending = requests.filter((r) => r.status === 'pending').length
  const entries = bottomNavFor(role, kind)

  return (
    <nav
      aria-label="Menu cepat"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface print:hidden lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 16px rgb(27 27 40 / 0.06)' }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch">
        {entries.map(({ to, label }) => {
          const Icon = routeIcons[to]
          const badge = to === '/requests/review' ? pending : 0
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/dashboard' || to === '/pos'}
                className={({ isActive }) => `bottom-tab${isActive ? ' is-active' : ''}`}
              >
                <span className="relative">
                  {Icon && <Icon className="size-6" aria-hidden />}
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-white">
                      {badge}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </NavLink>
            </li>
          )
        })}
        <li className="flex-1">
          <button type="button" onClick={onMore} className="bottom-tab w-full">
            <span>
              <Menu className="size-6" aria-hidden />
            </span>
            <span>Lainnya</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
