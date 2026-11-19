import { Printer, Scissors, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogoMark } from '@/components/LogoMark'
import { COLUMNS, type Line, type PaperWidth } from '@/lib/receipt'

export interface PrintDoc {
  title: string
  lines: Line[]
}

/** Tampilan dokumen monospace selebar kolom kertas, dipakai untuk pratinjau dan hasil cetak. */
function ReceiptView({ lines, paperWidth, className = '' }: { lines: Line[]; paperWidth: PaperWidth; className?: string }) {
  return (
    <div
      className={`receipt bg-white text-black ${className}`}
      style={{ width: `${COLUMNS[paperWidth]}ch` }}
      data-paper={paperWidth}
    >
      {lines.map((l, i) =>
        l.logo ? (
          <div key={i} className="mb-1 flex justify-center">
            <LogoMark variant="dark" className={paperWidth === 80 ? 'size-14' : 'size-11'} />
          </div>
        ) : (
          <div
            key={i}
            className={`whitespace-pre ${l.bold ? 'font-bold' : ''} ${l.center ? 'text-center' : ''}`}
            style={l.large ? { fontSize: '1.5em', lineHeight: 1.25 } : undefined}
          >
            {l.text || ' '}
          </div>
        ),
      )}
    </div>
  )
}

/**
 * Dialog pratinjau cetak. Dokumen dirender dua kali di luar #root: satu untuk layar
 * (pratinjau) dan satu khusus cetak. CSS cetak di index.css menyembunyikan aplikasi.
 * Beberapa dokumen (misalnya Nota + Label) tercetak dalam satu kali tekan, dipisah
 * garis potong dan pindah halaman, pengganti "cetak dua kali" di aplikasi Android.
 */
export function PrintDialog({
  title,
  build,
  paperWidth,
  onClose,
}: {
  title: string
  /** Menyusun dokumen untuk lebar kertas yang dipilih. */
  build: (paperWidth: PaperWidth) => PrintDoc[]
  paperWidth: PaperWidth
  onClose: () => void
}) {
  const [width, setWidth] = useState<PaperWidth>(paperWidth)
  const docs = build(width)

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="seg" role="group" aria-label="Lebar kertas">
              {([80, 58] as PaperWidth[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={width === w}
                  onClick={() => setWidth(w)}
                  className="seg-item"
                >
                  {w} mm
                </button>
              ))}
            </div>
            {docs.length > 1 && <span className="text-xs font-semibold text-muted">{docs.length} dokumen sekali cetak</span>}
          </div>
          <p className="mb-3 text-xs text-muted">
            Di dialog cetak browser pilih printer, atau pilih "Simpan sebagai PDF".
          </p>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto rounded-xl border border-line bg-canvas p-3">
            {docs.map((d, i) => (
              <div key={i}>
                {i > 0 && (
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
                    <Scissors className="size-3.5" aria-hidden /> Potong di sini · {d.title}
                  </p>
                )}
                <ReceiptView lines={d.lines} paperWidth={width} className="receipt-screen mx-auto text-[12px] leading-snug" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => window.print()} className="btn btn-primary flex-1">
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
        {docs.map((d, i) => (
          <div key={i} className="receipt-page">
            <ReceiptView lines={d.lines} paperWidth={width} className="receipt-print text-[12px] leading-snug" />
          </div>
        ))}
      </div>
    </>,
    document.body,
  )
}
