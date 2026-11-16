import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { addService, setServiceActive, updateService, useStore, type Service } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import type { Unit } from '@/lib/orders'

const unitLabel: Record<Unit, string> = { kg: 'Kiloan (per kg)', pcs: 'Satuan (per pcs)' }

export function ServicesPage() {
  const services = useStore((s) => s.services)

  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open(target: Service | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setUnit(target === 'new' ? 'kg' : target.unit)
    setPrice(target === 'new' ? '' : String(target.price))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = Number(price.replace(/\./g, ''))
      if (editing === 'new') addService(name, unit, value)
      else if (editing) updateService(editing.id, name, value)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Layanan & Harga</h1>
        <button
          type="button"
          onClick={() => open('new')}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-sidebar"
        >
          <Plus className="size-4" aria-hidden />
          Tambah Layanan
        </button>
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        Data contoh, bukan katalog harga asli. Mengubah harga tidak mengubah pesanan yang sudah dibuat.
      </p>

      {editing && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_12rem_9rem_auto_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Nama layanan
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Jenis
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                disabled={editing !== 'new'}
                className={`${inputClass} mt-1.5 disabled:opacity-60`}
              >
                {(Object.keys(unitLabel) as Unit[]).map((u) => (
                  <option key={u} value={u}>
                    {unitLabel[u]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Harga (Rp)
              <input
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <button type="submit" className={primaryButton}>
              {editing === 'new' ? 'Simpan' : 'Perbarui'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-11 rounded-full bg-canvas px-5 text-sm font-semibold hover:bg-line"
            >
              Batal
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </Card>
      )}

      {(['kg', 'pcs'] as Unit[]).map((u) => {
        const list = services.filter((s) => s.unit === u)
        return (
          <section key={u} aria-labelledby={`grp-${u}`}>
            <h2 id={`grp-${u}`} className="mb-3 text-lg font-bold">
              {unitLabel[u]}
            </h2>
            {list.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Belum ada layanan.</p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {list.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="text-xs text-muted">
                        {formatRupiah(s.price)} / {s.unit}
                      </p>
                    </div>
                    {!s.active && <StatusChip label="Nonaktif" tone="peach" />}
                    <button
                      type="button"
                      onClick={() => open(s)}
                      aria-label={`Ubah ${s.name}`}
                      className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-line"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceActive(s.id, !s.active)}
                      className="h-9 rounded-full bg-canvas px-4 text-sm font-semibold hover:bg-line"
                    >
                      {s.active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
