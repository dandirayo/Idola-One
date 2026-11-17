import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Card, Hint, StatusChip } from '@/components/ui'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import { isMoneyRequest, requestStatusLabel, requestTypeLabel } from '@/lib/requests'

const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const tone = { pending: 'lilac', approved: 'lime', rejected: 'peach', paid: 'cream', completed: 'lime' } as const

export function MyRequestsPage() {
  const { session } = useAuth()
  const requests = useStore((s) => s.requests)
  if (!session) return null
  const mine = requests.filter((r) => r.requester === session.name)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Pengajuan Saya</h1>
        <Link to="/requests/new" className="btn btn-accent">
          <Plus className="size-4" aria-hidden />
          Buat Pengajuan
        </Link>
      </div>

      <Hint>Hanya owner yang dapat menyetujui atau menolak.</Hint>

      {mine.length === 0 ? (
        <Card>
          <p className="font-semibold">Kamu belum membuat pengajuan.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {mine.map((r) => (
            <li key={r.id} className="rounded-card bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-semibold">{requestTypeLabel[r.type]}</p>
                  <p className="mt-0.5 text-sm">{r.detail}</p>
                  <p className="mt-1 text-xs text-muted">{dateTime.format(new Date(r.createdAt))}</p>
                </div>
                {isMoneyRequest(r.type) && <p className="font-bold">{formatRupiah(r.amount)}</p>}
                <StatusChip label={requestStatusLabel[r.status]} tone={tone[r.status]} />
              </div>
              {r.ownerNote && (
                <p className="mt-3 rounded-xl bg-canvas p-3 text-sm">
                  <span className="font-semibold">Catatan owner:</span> {r.ownerNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
