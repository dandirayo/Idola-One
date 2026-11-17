import { Printer, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { COLUMNS, type Line, type PaperWidth } from '@/lib/receipt'

/** Tampilan dokumen monospace selebar kolom kertas, dipakai untuk pratinjau dan hasil cetak. */
function ReceiptView({ lines, paperWidth, className = '' }: { lines: Line[]; paperWidth: PaperWidth; className?: string }) {
  return (
    <div
      className={`receipt bg-white text-black ${className}`}
      style={{ width: `${COLUMNS[paperWidth]}ch` }}
      data-paper={paperWidth}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          className={`whitespace-pre ${l.bold ? 'font-bold' : ''} ${l.center ? 'text-center' : ''}`}
          style={l.large ? { fontSize: '1.5em', lineHeight: 1.25 } : undefined}
        >
          {l.text || ' '}
        </div>
      ))}
    </div>
  )
}

/**
 * Dialog pratinjau cetak. Dokumen yang sama dirender dua kali di luar #root:
 * satu untuk layar (pratinjau) dan satu khusus cetak. CSS cetak di index.css
 * menyembunyikan aplikasi dan hanya menampilkan versi cetak.
 */
export function PrintDialog({
  title,
  lines,
  paperWidth,
  onClose,
}: {
  title: string
  lines: Line[]
  paperWidth: PaperWidth
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <div className="screen-only fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" aria-label="Tutup pratinjau" className="absolute inset-0 bg-ink/50" onClick={onClose} />
        <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[1.5rem] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:rounded-[1.5rem] sm:pb-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Tutup" className="icon-btn icon-btn-sm">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="mb-3 text-xs text-muted">
            Pratinjau kertas {paperWidth} mm. Di dialog cetak browser pilih printer, atau pilih "Simpan sebagai PDF".
          </p>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-canvas p-3">
            <ReceiptView lines={lines} paperWidth={paperWidth} className="receipt-screen mx-auto text-[12px] leading-snug" />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn btn-primary flex-1"
            >
              <Printer className="size-4" aria-hidden />
              Cetak
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Tutup
            </button>
          </div>
        </div>
      </div>
      <div className="print-only">
        <ReceiptView lines={lines} paperWidth={paperWidth} className="receipt-print text-[12px] leading-snug" />
      </div>
    </>,
    document.body,
  )
}
