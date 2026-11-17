import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PrintDialog } from '@/components/PrintDialog'
import { resetSavedData } from '@/data/persist'
import { Card, Hint, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { updateShop, useStore } from '@/data/store'
import { buildTestPage, COLUMNS, type PaperWidth } from '@/lib/receipt'

export function SettingsPage() {
  const shop = useStore((s) => s.shop)

  const [name, setName] = useState(shop.name)
  const [phone, setPhone] = useState(shop.phone)
  const [address, setAddress] = useState(shop.address)
  const [footer, setFooter] = useState(shop.footer)
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(shop.paperWidth)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [testOpen, setTestOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      updateShop({ name, phone, address, footer, paperWidth })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Pengaturan Toko</h1>

      <Hint>Perubahan hanya tersimpan sementara dan hilang saat halaman dimuat ulang.</Hint>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <SectionTitle>Identitas toko dan nota</SectionTitle>
          <form onSubmit={submit} noValidate className="space-y-4">
            <label className="block text-sm font-semibold">
              Nama toko
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Telepon
              <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Alamat
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Pesan di bawah nota
              <input value={footer} onChange={(e) => setFooter(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Lebar kertas printer</legend>
              <div className="seg w-full">
                {([58, 80] as PaperWidth[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={paperWidth === w}
                    onClick={() => setPaperWidth(w)}
                    className="seg-item flex-1"
                  >
                    {w} mm · {COLUMNS[w]} kolom
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="text-sm font-medium text-success">
                Pengaturan disimpan.
              </p>
            )}
            <button type="submit" className={primaryButton}>
              Simpan
            </button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Printer</SectionTitle>
          <p className="text-sm">
            Jalur cetak saat ini: <strong>dialog cetak browser</strong>. Pilih printer yang terpasang di komputer atau
            ponsel, atau pilih "Simpan sebagai PDF".
          </p>
          <p className="mt-2 text-xs text-muted">
            Cetak langsung ke printer thermal Bluetooth belum tersedia. Jalurnya menunggu keputusan di
            docs/04-BACKEND.md bagian 6.
          </p>
          <button
            type="button"
            onClick={() => setTestOpen(true)}
            className="btn btn-accent mt-4 w-full"
          >
            Cetak Uji
          </button>
          <p className="mt-2 text-xs text-muted">
            Cetak uji memakai pengaturan yang sudah disimpan, bukan isian yang belum disimpan.
          </p>
        </Card>
      </div>

      <Card>
        <SectionTitle>Data pratinjau</SectionTitle>
        <p className="text-sm text-muted">
          Selama backend belum ada, data tersimpan di browser ini saja (tidak dibagi ke perangkat lain). Reset mengembalikan semua data ke data contoh awal.
        </p>
        <button type="button" onClick={() => setResetOpen(true)} className="btn btn-danger mt-4">
          Reset data contoh
        </button>
      </Card>

      {resetOpen && (
        <ConfirmDialog
          title="Reset semua data ke data contoh?"
          impacts={['Semua perubahan, termasuk isi Sampah, hilang dari browser ini.', 'Tidak bisa dipulihkan.']}
          confirmLabel="Reset"
          restorable={false}
          onConfirm={() => resetSavedData()}
          onClose={() => setResetOpen(false)}
        />
      )}

      {testOpen && (
        <PrintDialog
          title="Cetak Uji"
          lines={buildTestPage(shop)}
          paperWidth={shop.paperWidth}
          onClose={() => setTestOpen(false)}
        />
      )}
    </div>
  )
}
