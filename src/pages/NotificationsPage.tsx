import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Card } from '@/components/ui'
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from '@/data/business'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { isVisibleTo, safeInternalPath } from '@/lib/notifications'

const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function NotificationsPage() {
  const { session } = useAuth()
  const all = useStore((s) => s.notifications)
  const navigate = useNavigate()
  if (!session) return null

  const visible = all.filter((n) => isVisibleTo(n, session)).sort((a, b) => b.at.localeCompare(a.at))
  const unread = visible.filter((n) => !n.read).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notifikasi</h1>
          <p className="mt-1 text-sm text-muted">{unread > 0 ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</p>
        </div>
        <button
          type="button"
          disabled={unread === 0}
          onClick={() => markAllNotificationsRead(session)}
          className="h-11 rounded-full bg-surface px-5 text-sm font-semibold shadow-card hover:bg-line disabled:opacity-50"
        >
          Tandai semua dibaca
        </button>
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Notifikasi dalam aplikasi, data contoh. Notifikasi push ke ponsel belum tersedia.
      </p>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">Belum ada notifikasi.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((n) => (
            <li key={n.id} className={`flex items-center gap-3 rounded-card p-4 shadow-card ${n.read ? 'bg-surface' : 'bg-lime-soft'}`}>
              <button
                type="button"
                onClick={() => {
                  markNotificationRead(n.id)
                  navigate(safeInternalPath(n.link))
                }}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-2">
                  {!n.read && <span className="size-2 shrink-0 rounded-full bg-danger" aria-label="Belum dibaca" />}
                  <span className="truncate font-semibold">{n.title}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm">{n.body}</span>
                <span className="mt-0.5 block text-xs text-muted">{dateTime.format(new Date(n.at))}</span>
              </button>
              <button
                type="button"
                onClick={() => deleteNotification(n.id)}
                aria-label={`Hapus notifikasi: ${n.title}`}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas hover:bg-line"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
