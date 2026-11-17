import { DataList, useViewMode, ViewSwitch } from '@/components/DataList'
import { Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { DeleteButton } from '@/components/ConfirmDialog'
import { deleteService, serviceUsage } from '@/data/admin'
import { Card, Hint, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { addService, setServiceActive, updateService, useStore, type Service } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import { unitLabel, type Unit } from '@/lib/orders'

export function ServicesPage() {
  const view = useViewMode('services', 'compact')
  const services = useStore((s) => s.services)
  const { session } = useAuth()
  const isOwner = session?.role === 'owner'

  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open(target: Service | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setUnit(target === 'new' ? 'kg' : target.unit)
    setPrice(target === 'new' ? '' : String(target.price))
    setCategory(target === 'new' ? '' : (target.category ?? ''))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = Number(price.replace(/\./g, ''))
      if (editing === 'new') addService(name, unit, value, category)
      else if (editing) updateService(editing.id, name, value)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan.')
    }
  }

  const categories = [...new Set(services.map((s) => s.category).filter((c): c is string => !!c))]
  const q = query.trim().toLowerCase()
  const grouped = new Map<string, Service[]>()
  for (const s of services) {
    if (!(isOwner || s.active)) continue
    if (q && !s.name.toLowerCase().includes(q) && !(s.category ?? '').toLowerCase().includes(q)) continue
    const key = s.category ?? 'Lainnya'
    grouped.set(key, [...(grouped.get(key) ?? []), s])
  }
  const groups = [...grouped.entries()]

  const actions = (s: Service) => (
    <>
{isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => open(s)}
                          aria-label={`Ubah ${s.name}`}
                          className="icon-btn icon-btn-sm"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setServiceActive(s.id, !s.active)}
                          className="btn btn-secondary btn-sm"
                        >
                          {s.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <DeleteButton label={`Hapus ${s.name}`} title={`Hapus layanan ${s.name}?`} blockedBy={serviceUsage(s.id).reasons} onConfirm={() => deleteService(s.id)} />
                      </>
                    )}
    </>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Layanan & Harga</h1>
        {isOwner && (
          <button
            type="button"
            onClick={() => open('new')}
            className="btn btn-accent"
          >
            <Plus className="size-4" aria-hidden />
            Tambah Layanan
          </button>
        )}
      </div>

      <Hint>Katalog contoh disalin dari sistem lama ({services.length} layanan). Mengubah harga tidak mengubah pesanan yang sudah dibuat.</Hint>

      {editing && isOwner && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem_9rem_auto_auto] sm:items-end">
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
              Kategori
              <input
                list="service-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={editing !== 'new'}
                placeholder="Pakaian, Sepatu, ..."
                className={`${inputClass} mt-1.5 disabled:opacity-60`}
              />
              <datalist id="service-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
              className="btn btn-secondary"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Cari layanan</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari layanan" className="field field-search" />
        </label>
        <ViewSwitch mode={view[0]} onChange={view[1]} />
      </div>

      {groups.length === 0 && (
        <Card>
          <p className="font-semibold">Tidak ada layanan yang cocok.</p>
        </Card>
      )}

      {groups.map(([cat, list]) => {
        const u = cat
        return (
          <section key={u} aria-labelledby={`grp-${u}`}>
            <h2 id={`grp-${u}`} className="mb-3 text-lg font-bold">
              {cat} <span className="text-sm font-medium text-muted">· {list.length}</span>
            </h2>
            {list.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Belum ada layanan.</p>
              </Card>
            ) : (
              <DataList
                id={`services-${u}`}
                items={list}
                rowKey={(s) => s.id}
                actions={actions}
                view={view}
                showSwitch={false}
                columns={[
            { key: 'name', label: 'Layanan', primary: true, sort: (s) => s.name, render: (s) => s.name },
            { key: 'price', label: 'Harga', align: 'right', compact: true, sort: (s) => s.price, render: (s) => `${formatRupiah(s.price)} / ${s.unit}` },
            { key: 'unit', label: 'Satuan', hideBelow: 'sm', render: (s) => unitLabel[s.unit] },
            { key: 'status', label: 'Status', compact: true, render: (s) => <StatusChip label={s.active ? 'Aktif' : 'Nonaktif'} tone={s.active ? 'lime' : 'peach'} /> },
                ]}
                renderNormal={(s) => (
<li className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="text-xs text-muted">
                        {formatRupiah(s.price)} / {s.unit}
                      </p>
                    </div>
                    {!s.active && <StatusChip label="Nonaktif" tone="peach" />}
                    {actions(s)}
</li>
                )}
              />
            )}
          </section>
        )
      })}
    </div>
  )
}
