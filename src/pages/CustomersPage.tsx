import { Pencil, Plus, Search } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { DeleteButton } from '@/components/ConfirmDialog'
import { customerUsage, deleteCustomer } from '@/data/admin'
import { Card, Hint, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { customerPoints } from '@/lib/points'
import { addCustomer, setCustomerActive, updateCustomer, useStore, type Customer } from '@/data/store'

export function CustomersPage() {
  const customers = useStore((s) => s.customers)
  const orders = useStore((s) => s.orders)

  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const orderCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const o of orders) map.set(o.customerId, (map.get(o.customerId) ?? 0) + 1)
    return map
  }, [orders])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers.filter(
      (c) =>
        (showInactive || c.active) &&
        (!q || c.name.toLowerCase().includes(q) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000')),
    )
  }, [customers, query, showInactive])

  function open(target: Customer | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setPhone(target === 'new' ? '' : target.phone)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (editing === 'new') addCustomer(name, phone)
      else if (editing) updateCustomer(editing.id, name, phone)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pelanggan.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Pelanggan</h1>
        <button
          type="button"
          onClick={() => open('new')}
          className="btn btn-accent"
        >
          <Plus className="size-4" aria-hidden />
          Tambah Pelanggan
        </button>
      </div>

      <Hint>Perubahan hanya tersimpan sementara dan hilang saat halaman dimuat ulang.</Hint>

      {editing && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Nama
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Nomor WhatsApp
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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

      <div className="flex flex-wrap items-center gap-4">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Cari nama atau nomor</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau nomor"
            className="field field-search"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Tampilkan yang nonaktif
        </label>
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">Tidak ada pelanggan yang cocok.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac font-bold">
                {c.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <Link to={`/customers/${c.id}`} className="block truncate font-semibold hover:underline">
                  {c.name}
                </Link>
                <p className="truncate text-xs text-muted">
                  {c.phone} · {orderCount.get(c.id) ?? 0} pesanan · {customerPoints(orders, c.id).balance} poin
                </p>
              </div>
              {!c.active && <StatusChip label="Nonaktif" tone="peach" />}
              <button
                type="button"
                onClick={() => open(c)}
                aria-label={`Ubah ${c.name}`}
                className="icon-btn icon-btn-sm"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setCustomerActive(c.id, !c.active)}
                className="btn btn-secondary btn-sm"
              >
                {c.active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <DeleteButton label={`Hapus ${c.name}`} title={`Hapus pelanggan ${c.name}?`} blockedBy={customerUsage(c.id).reasons} onConfirm={() => deleteCustomer(c.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
