import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Card, Hint, SectionTitle } from '@/components/ui'
import { backupFilename, backupJson, customersCsv, previewBackup, restoreBackup, servicesCsv, type BackupPreview } from '@/data/backup'
import { getState } from '@/data/store'
import { downloadCsv } from '@/lib/download'
import { cashCsv, ordersCsv } from '@/lib/reports'

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Khusus owner: simpan salinan data ke berkas, ekspor CSV, dan pulihkan dari backup. */
export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ raw: string; name: string; preview: BackupPreview } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const stamp = new Date().toISOString().slice(0, 10)

  async function pick(file: File | undefined) {
    setMessage(null)
    if (!file) return
    const raw = await file.text()
    const preview = previewBackup(raw)
    if (!preview.ok) {
      setMessage(preview.error ?? 'Berkas tidak valid.')
      return
    }
    setPending({ raw, name: file.name, preview })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Backup dan Ekspor</h1>
      <Hint>
        Data pratinjau tersimpan di browser ini saja. Simpan backup sebelum membersihkan data browser atau berpindah perangkat.
      </Hint>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle>Backup lengkap</SectionTitle>
          <p className="mb-3 text-sm text-muted">Satu berkas JSON berisi semua data: pesanan, kas, pelanggan, layanan, karyawan, dan lainnya.</p>
          <button type="button" className="btn btn-primary" onClick={() => downloadJson(backupFilename(), backupJson())}>
            <Download className="size-4" aria-hidden />
            Unduh backup (JSON)
          </button>
        </Card>

        <Card>
          <SectionTitle>Pulihkan dari backup</SectionTitle>
          <p className="mb-3 text-sm text-muted">Data sekarang akan <strong>diganti</strong> dengan isi berkas. Tindakan ini tercatat di Audit.</p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Pilih berkas backup"
            onChange={(e) => {
              void pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden />
            Pilih berkas backup
          </button>
          {message && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {message}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>Ekspor CSV</SectionTitle>
        <p className="mb-3 text-sm text-muted">Untuk dibuka di Excel atau Google Sheets.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`pelanggan-${stamp}.csv`, customersCsv())}>
            Pelanggan
          </button>
          <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`layanan-${stamp}.csv`, servicesCsv())}>
            Layanan
          </button>
          <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`pesanan-${stamp}.csv`, ordersCsv(getState().orders))}>
            Pesanan
          </button>
          <button type="button" className="btn btn-outline" onClick={() => downloadCsv(`kas-${stamp}.csv`, cashCsv(getState().cash))}>
            Buku Kas
          </button>
        </div>
      </Card>

      {pending && (
        <ConfirmDialog
          title="Pulihkan dari backup?"
          impacts={[
            `Berkas: ${pending.name}`,
            ...pending.preview.counts.map((c) => `${c.label}: ${c.count}`),
            'Semua data sekarang diganti dengan isi berkas ini.',
          ]}
          confirmLabel="Pulihkan"
          restorable={false}
          onConfirm={() => {
            const ok = restoreBackup(pending.raw)
            setMessage(ok ? 'Data berhasil dipulihkan.' : 'Gagal memulihkan data.')
            setPending(null)
          }}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}
