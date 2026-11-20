import { matches } from '@/lib/search'
import { DataList, useViewMode, ViewSwitch } from '@/components/DataList'
import { Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { DeleteButton } from '@/components/ConfirmDialog'
import { deleteService, serviceUsage } from '@/data/admin'
import { Card, Hint, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { addService, addServiceCategory, allServiceCategories, deleteServiceCategory, renameServiceCategory, setServiceActive, updateService, useStore, type Service, type ServiceDetails } from '@/data/store'
import { formatRupiah } from '@/lib/format'
import { unitLabel, type Unit } from '@/lib/orders'

export function ServicesPage() {
  const view = useViewMode('services', 'compact')
  const services = useStore((s) => s.services)
  const extraCategories = useStore((s) => s.serviceCategories)
  const { session } = useAuth()
  const isOwner = session?.role === 'owner'

  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<Unit>('kg')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [det, setDet] = useState({ subcategory: '', size: '', material: '', estimate: '' })
  const [catForm, setCatForm] = useState<{ from: string | null; name: string } | null>(null)
  const [catError, setCatError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open(target: Service | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setUnit(target === 'new' ? 'kg' : target.unit)
    setPrice(target === 'new' ? '' : String(target.price))
    setCategory(target === 'new' ? '' : (target.category ?? ''))
    setDet({
      subcategory: target === 'new' ? '' : (target.subcategory ?? ''),
      size: target === 'new' ? '' : (target.size ?? ''),
      material: target === 'new' ? '' : (target.material ?? ''),
      estimate: target === 'new' || !target.estimateHours ? '' : String(target.estimateHours),
    })
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = Number(price.replace(/\./g, ''))
      const details: ServiceDetails = {
        subcategory: det.subcategory,
        size: det.size,
        material: det.material,
        ...(det.estimate.trim() ? { estimateHours: Number(det.estimate) } : {}),
      }
      if (editing === 'new') addService(name, unit, value, category, details)
      else if (editing) updateService(editing.id, name, value, details, category)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan layanan.')
    }
  }

  const categories = allServiceCategories({ services, serviceCategories: extraCategories })
  const grouped = new Map<string, Service[]>()
  if (isOwner && !query.trim()) for (const c of extraCategories) grouped.set(c, [])
  for (const s of services) {
    if (!(isOwner || s.active)) continue
    if (!matches(query, [s.name, s.category, s.unit])) continue
    const key = s.category ?? 'Lainnya'
    grouped.set(key, [...(grouped.get(key) ?? []), s])
  }
  const groups = [...grouped.entries()]

  function submitCategory(e: FormEvent) {
    e.preventDefault()
    if (!catForm) return
    setCatError(null)
    try {
      if (catForm.from === null) addServiceCategory(catForm.name)
      else renameServiceCategory(catForm.from, catForm.name)
      setCatForm(null)
    } catch (err) {
      setCatError(err instanceof Error ? err.message : 'Gagal menyimpan kategori.')
    }
  }

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
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCatError(null); setCatForm({ from: null, name: '' }) }} className="btn btn-secondary">
              <Plus className="size-4" aria-hidden />
              Tambah Kategori
            </button>
            <button
              type="button"
              onClick={() => open('new')}
              className="btn btn-accent"
            >
              <Plus className="size-4" aria-hidden />
              Tambah Layanan
            </button>
          </div>
        )}
      </div>

      {catForm && isOwner && (
        <Card>
          <form onSubmit={submitCategory} noValidate className="flex flex-wrap items-end gap-3">
            <label className="block min-w-48 flex-1 text-sm font-semibold">
              {catForm.from === null ? 'Nama kategori baru' : `Ubah nama kategori "${catForm.from}"`}
              <input
                autoFocus
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <button type="submit" className={primaryButton}>
              Simpan
            </button>
            <button type="button" onClick={() => setCatForm(null)} className="btn btn-secondary">
              Batal
            </button>
          </form>
          {catError && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {catError}
            </p>
          )}
        </Card>
      )}

      <Hint>Katalog contoh disalin dari sistem lama ({services.length} layanan). Mengubah harga tidak mengubah pesanan yang sudah dibuat.</Hint>

      {editing && isOwner && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_12rem_12rem_9rem] sm:items-end">
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
                placeholder="Pakaian, Sepatu, ..."
                className={`${inputClass} mt-1.5`}
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
            <label className="block text-sm font-semibold">
              Subkategori (opsional)
              <input value={det.subcategory} onChange={(e) => setDet({ ...det, subcategory: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Ukuran (opsional)
              <input value={det.size} onChange={(e) => setDet({ ...det, size: e.target.value })} placeholder="Kecil, Sedang, Besar" className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Bahan (opsional)
              <input value={det.material} onChange={(e) => setDet({ ...det, material: e.target.value })} placeholder="Kulit, Kanvas, ..." className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Estimasi selesai (jam)
              <input inputMode="numeric" value={det.estimate} onChange={(e) => setDet({ ...det, estimate: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <div className="flex gap-2 sm:col-span-4">
              <button type="submit" className={primaryButton}>
                {editing === 'new' ? 'Simpan' : 'Perbarui'}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">
                Batal
              </button>
            </div>
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
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 id={`grp-${u}`} className="text-lg font-bold">
                {cat} <span className="text-sm font-medium text-muted">· {list.length}</span>
              </h2>
              {isOwner && cat !== 'Lainnya' && (
                <>
                  <button
                    type="button"
                    onClick={() => { setCatError(null); setCatForm({ from: cat, name: cat }) }}
                    aria-label={`Ubah nama kategori ${cat}`}
                    className="icon-btn icon-btn-sm"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  {list.length === 0 && (
                    <DeleteButton
                      label={`Hapus kategori ${cat}`}
                      title={`Hapus kategori ${cat}?`}
                      onConfirm={() => deleteServiceCategory(cat)}
                    />
                  )}
                </>
              )}
            </div>
            {list.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Belum ada layanan. Pilih kategori ini saat menambah layanan.</p>
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
                        {[s.subcategory, s.size, s.material, s.estimateHours ? `estimasi ${s.estimateHours} jam` : null]
                          .filter(Boolean)
                          .map((t) => ` · ${t}`)
                          .join('')}
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
