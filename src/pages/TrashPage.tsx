import { ArchiveRestore } from 'lucide-react'
import { useState } from 'react'
import { DataList } from '@/components/DataList'
import { DeleteButton } from '@/components/ConfirmDialog'
import { EmptyState, Hint, StatusChip } from '@/components/ui'
import { useStore, type TrashItem } from '@/data/store'
import { purgeTrash, restoreBlocker, restoreFromTrash, trashSummary } from '@/data/trash'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export function TrashPage() {
  const trash = useStore((s) => s.trash)
  const state = useStore((s) => s)
  const [error, setError] = useState<string | null>(null)

  function restore(id: string) {
    setError(null)
    try {
      restoreFromTrash(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulihkan.')
    }
  }

  const actions = (t: TrashItem) => {
    const blocker = restoreBlocker(t, state)
    return (
      <>

        <button type="button" onClick={() => restore(t.id)} disabled={blocker !== null} className="btn btn-primary btn-sm">
          <ArchiveRestore aria-hidden />
          Pulihkan
        </button>
        <DeleteButton
          label={`Hapus permanen ${t.kind} ${t.label}`}
          title={`Hapus permanen ${t.kind} ${t.label}?`}
          impacts={['Tidak bisa dipulihkan lagi.']}
          confirmLabel="Hapus Permanen"
          restorable={false}
          onConfirm={() => purgeTrash(t.id)}
        />
                        </>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Sampah</h1>
        <p className="mt-1 text-sm text-muted">{trash.length} item. Yang dihapus bisa dipulihkan, kas dan insentifnya ikut kembali.</p>
      </div>

      <Hint>Hapus permanen tidak bisa dibatalkan. Notifikasi dan Audit tidak masuk Sampah.</Hint>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {trash.length === 0 ? (
        <EmptyState title="Sampah kosong">Data yang Anda hapus akan muncul di sini.</EmptyState>
      ) : (
        <DataList
          id="trash"
          items={trash}
          rowKey={(t) => t.id}
          actions={actions}
          columns={[
            { key: 'label', label: 'Nama', primary: true, sort: (t) => t.label, render: (t) => t.label },
            { key: 'kind', label: 'Jenis', compact: true, sort: (t) => t.kind, render: (t) => <StatusChip label={t.kind} tone="lilac" /> },
            { key: 'at', label: 'Dihapus', compact: true, sort: (t) => t.deletedAt, render: (t) => dateTime.format(new Date(t.deletedAt)) },
            { key: 'actor', label: 'Oleh', hideBelow: 'md', render: (t) => t.actor },
            { key: 'summary', label: 'Isi', hideBelow: 'sm', render: (t) => trashSummary(t) },
            { key: 'reason', label: 'Alasan', hideBelow: 'lg', render: (t) => t.reason || '-' },
          ]}
          renderNormal={(t) => {
            const blocker = restoreBlocker(t, state)
            return (
              <li className="rounded-card bg-surface p-4 shadow-card">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        <StatusChip label={t.kind} tone="lilac" />
                        <span className="truncate">{t.label}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {dateTime.format(new Date(t.deletedAt))} · oleh {t.actor}
                      </p>
                      <p className="mt-1 text-sm">{trashSummary(t)}</p>
                      {t.reason && <p className="mt-1 text-xs text-muted">Alasan: {t.reason}</p>}
                      {blocker && <p className="mt-2 rounded-xl bg-peach p-2 text-xs">{blocker}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">{actions(t)}</div>
                  </div>
                </li>
            )
          }}
        />
      )}
    </div>
  )
}
