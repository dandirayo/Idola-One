import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Card, Hint, inputClass, StatusChip } from '@/components/ui'
import { DeleteButton } from '@/components/ConfirmDialog'
import { cancelRequestPayment, deleteRequest } from '@/data/admin'
import { completeRequest, decideRequest, payRequest, useStore, type EmployeeRequest } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import {
  availableActions,
  isMoneyRequest,
  requestActionLabel,
  requestStatusLabel,
  requestStatuses,
  requestTypeLabel,
  type RequestAction,
  type RequestType,
  type RequestStatus,
} from '@/lib/requests'

const statusTone = {
  pending: 'lilac',
  approved: 'lime',
  rejected: 'peach',
  paid: 'cream',
  completed: 'lime',
} as const

const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function RequestsPage() {
  const requests = useStore((s) => s.requests)
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all')

  const visible = requests.filter((r) => (filter === 'all' || r.status === filter) && (typeFilter === 'all' || r.type === typeFilter))
  const pending = requests.filter((r) => r.status === 'pending').length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Pusat Pengajuan</h1>
          <p className="mt-1 text-sm text-muted">
            {pending > 0 ? `${pending} pengajuan menunggu keputusan` : 'Tidak ada pengajuan yang menunggu'}
          </p>
        </div>
        <Link
          to="/requests/new"
          className="btn btn-accent"
        >
          <Plus className="size-4" aria-hidden />
          Buat Pengajuan
        </Link>
      </div>

      <Hint>Di aplikasi sungguhan karyawan membuat pengajuan dari akunnya sendiri dan hanya owner yang
        memutuskan.</Hint>

      <div className="seg" role="group" aria-label="Filter status">
        {(['all', ...requestStatuses] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className="seg-item"
          >
            {s === 'all' ? 'Semua' : requestStatusLabel[s]}
          </button>
        ))}
      </div>

      <div className="seg flex-wrap" role="group" aria-label="Filter kategori">
        {(['all', ...(Object.keys(requestTypeLabel) as RequestType[])] as const).map((t) => (
          <button key={t} type="button" aria-pressed={typeFilter === t} onClick={() => setTypeFilter(t)} className="seg-item">
            {t === 'all' ? 'Semua kategori' : requestTypeLabel[t]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">Tidak ada pengajuan pada filter ini.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestCard({ request: r }: { request: EmployeeRequest }) {
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)
  const actions = availableActions(r.type, r.status)

  function run(action: RequestAction) {
    setError(null)
    try {
      if (action === 'approve') decideRequest(r.id, 'approve', note)
      else if (action === 'reject') decideRequest(r.id, 'reject', note)
      else if (action === 'pay') payRequest(r.id, method)
      else completeRequest(r.id)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses pengajuan.')
    }
  }

  return (
    <li className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-56">
          <p className="font-semibold">
            {requestTypeLabel[r.type]} · {r.requester}
          </p>
          <p className="mt-0.5 text-sm">{r.detail}</p>
          {r.payload && (
            <p className="mt-0.5 text-xs text-muted">
              Tanggal {r.payload.date} · masuk {r.payload.checkIn}
              {r.payload.checkOut ? ` · pulang ${r.payload.checkOut}` : ''}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">{dateTime.format(new Date(r.createdAt))}</p>
        </div>
        {isMoneyRequest(r.type) && <p className="font-bold">{formatRupiah(r.amount)}</p>}
        <StatusChip label={requestStatusLabel[r.status]} tone={statusTone[r.status]} />
        {r.status === 'paid' ? (
          <DeleteButton
            label={`Batalkan pembayaran ${r.requester}`}
            title="Batalkan pembayaran pengajuan?"
            impacts={[`Kas keluar ${formatRupiah(r.amount)} dibalik.`, 'Pengajuan kembali ke Disetujui.']}
            reasonRequired
            confirmLabel="Batalkan Pembayaran"
            onConfirm={(reason) => cancelRequestPayment(r.id, reason)}
          />
        ) : (
          <DeleteButton
            label={`Hapus pengajuan ${r.requester}`}
            title="Hapus pengajuan ini?"
            impacts={['Pengajuan dihapus dari daftar. Salinannya disimpan di Audit.']}
            onConfirm={() => deleteRequest(r.id)}
          />
        )}
      </div>

      {r.ownerNote && (
        <p className="mt-3 rounded-xl bg-canvas p-3 text-sm">
          <span className="font-semibold">Catatan owner:</span> {r.ownerNote}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {r.status === 'pending' && (
            <label className="block text-sm font-semibold">
              Catatan (wajib bila menolak)
              <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
          )}
          {actions.includes('pay') && (
            <label className="block text-sm font-semibold sm:w-60">
              Metode bayar
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className={`${inputClass} mt-1.5`}
              >
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel[m]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => run(a)}
                aria-label={`${requestActionLabel[a]}: ${requestTypeLabel[r.type]} ${r.requester}`}
                className={
                  a === 'reject'
                    ? 'btn btn-danger btn-sm'
                    : 'btn btn-primary btn-sm'
                }
              >
                {requestActionLabel[a]}
              </button>
            ))}
          </div>
          {payHint(r)}
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function payHint(r: EmployeeRequest) {
  if (r.status === 'approved' && isMoneyRequest(r.type)) {
    return <p className="text-xs text-muted">Membayar akan mencatat pengeluaran dan kas keluar.</p>
  }
  return null
}
