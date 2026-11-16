import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { addPosProduct, movePosProduct, setPosProductActive, updatePosProduct } from '@/data/pos'
import { useStore, type PosProduct } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'

export function PosProductsPage() {
  const { businessId, session } = useAuth()
  const all = useStore((s) => s.posProducts)
  const isOwner = session?.role === 'owner'

  const [editing, setEditing] = useState<PosProduct | 'new' | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!businessId) return null
  const products = all.filter((p) => p.businessId === businessId && (isOwner || p.active)).sort((a, b) => a.sort - b.sort)

  function open(target: PosProduct | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setPrice(target === 'new' ? '' : String(target.price))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = Number(price.replace(/\./g, ''))
      if (editing === 'new') addPosProduct(businessId!, name, value)
      else if (editing) updatePosProduct(editing.id, name, value)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Produk</h1>
        {isOwner && (
          <button type="button" onClick={() => open('new')} className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 text-sm font-bold text-sidebar">
            <Plus className="size-4" aria-hidden />
            Tambah Produk
          </button>
        )}
      </div>

      <p className="rounded-2xl bg-lilac px-4 py-2.5 text-sm" role="note">
        {isOwner
          ? 'Data contoh. Variasi ukuran atau topping dibuat sebagai produk terpisah. Harga baru tidak mengubah penjualan yang sudah tercatat.'
          : 'Daftar produk aktif. Hanya owner yang dapat mengubah produk dan harga.'}
      </p>

      {editing && isOwner && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_10rem_auto_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Nama produk
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Harga (Rp)
              <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <button type="submit" className={primaryButton}>
              {editing === 'new' ? 'Simpan' : 'Perbarui'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="h-11 rounded-full bg-canvas px-5 text-sm font-semibold hover:bg-line">
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

      {products.length === 0 ? (
        <Card>
          <p className="font-semibold">Belum ada produk.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {products.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{formatRupiah(p.price)}</p>
              </div>
              {!p.active && <StatusChip label="Nonaktif" tone="peach" />}
              {isOwner && (
                <>
                  <button type="button" disabled={i === 0} onClick={() => movePosProduct(p.id, 'up')} aria-label={`Naikkan ${p.name}`} className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-line disabled:opacity-40">
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button type="button" disabled={i === products.length - 1} onClick={() => movePosProduct(p.id, 'down')} aria-label={`Turunkan ${p.name}`} className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-line disabled:opacity-40">
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => open(p)} aria-label={`Ubah ${p.name}`} className="grid size-9 place-items-center rounded-full bg-canvas hover:bg-line">
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setPosProductActive(p.id, !p.active)} className="h-9 rounded-full bg-canvas px-4 text-sm font-semibold hover:bg-line">
                    {p.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
