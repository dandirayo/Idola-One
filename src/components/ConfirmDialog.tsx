import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MIN_REASON } from '@/data/admin'

interface DialogProps {
  title: string
  /** Akibat yang akan terjadi, satu per baris. */
  impacts?: string[]
  /** Bila terisi, tindakan ditolak dan alasannya dijelaskan (tombol konfirmasi tidak ada). */
  blockedBy?: string[]
  /** Teks saran bila ditolak, misalnya "Nonaktifkan saja." */
  blockedHint?: string
  reasonRequired?: boolean
  confirmLabel?: string
  /** Melempar Error bila gagal; pesannya ditampilkan di dialog. */
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Dialog konfirmasi seragam untuk semua tindakan hapus atau batal. */
export function ConfirmDialog({
  title,
  impacts = [],
  blockedBy = [],
  blockedHint = 'Nonaktifkan saja bila tidak dipakai lagi.',
  reasonRequired = false,
  confirmLabel = 'Hapus',
  onConfirm,
  onClose,
}: DialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const blocked = blockedBy.length > 0
  const reasonOk = !reasonRequired || reason.trim().length >= MIN_REASON

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      onConfirm(reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal. Coba lagi.')
    }
  }

  return createPortal(
    <div className="screen-only fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form onSubmit={submit} noValidate className="relative w-full max-w-md rounded-[1.5rem] bg-surface p-5 shadow-card">
        <div className="mb-3 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-peach text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <h2 id={titleId} className="min-w-0 flex-1 pt-1.5 text-lg font-bold leading-snug">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="icon-btn icon-btn-sm">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {blocked ? (
          <div className="space-y-2 text-sm">
            <p>Tidak bisa dihapus karena:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {blockedBy.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="text-muted">{blockedHint}</p>
          </div>
        ) : (
          <>
            {impacts.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {impacts.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            )}
            {reasonRequired && (
              <label className="mt-3 block text-sm font-semibold">
                Alasan (wajib, tercatat di Audit)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="field field-area mt-1.5"
                  placeholder="Contoh: salah input nominal"
                />
              </label>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {blocked ? 'Tutup' : 'Batal'}
          </button>
          {!blocked && (
            <button type="submit" disabled={!reasonOk} className="btn btn-danger">
              {confirmLabel}
            </button>
          )}
        </div>
      </form>
    </div>,
    document.body,
  )
}

/** Tombol ikon Hapus yang membuka ConfirmDialog. Dipakai di setiap baris yang bisa dihapus. */
export function DeleteButton({
  label,
  children,
  className = children ? 'btn btn-danger' : 'icon-btn icon-btn-sm icon-btn-danger',
  ...dialog
}: { label: string; children?: ReactNode; className?: string } & Omit<DialogProps, 'onClose'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} title={label} className={className}>
        <Trash2 className="size-4" aria-hidden />
        {children}
      </button>
      {open && <ConfirmDialog {...dialog} onClose={() => setOpen(false)} />}
    </>
  )
}
