import { useState, type FormEvent } from 'react'
import { Card, Hint, inputClass, primaryButton, SectionTitle, StatusChip } from '@/components/ui'
import { adjustStock, buyStock, consumeStock, useStore, type InventoryItem } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatQty } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'

type Mode = 'buy' | 'use' | 'adjust'

const modeLabel: Record<Mode, string> = {
  buy: 'Beli Stok',
  use: 'Pakai Stok',
  adjust: 'Koreksi +/−',
}

const typeLabel = { IN: 'Masuk', OUT: 'Keluar', ADJ: 'Koreksi' } as const
const dateTime = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const toNumber = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'))

export function InventoryPage() {
  const inventory = useStore((s) => s.inventory)
  const movements = useStore((s) => s.movements)

  const { session } = useAuth()
  const modes: Mode[] = session?.role === 'owner' ? ['buy', 'use', 'adjust'] : ['use']
  const [target, setTarget] = useState<{ item: InventoryItem; mode: Mode } | null>(null)
  const [qty, setQty] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function open(item: InventoryItem, mode: Mode) {
    setTarget({ item, mode })
    setQty('')
    setAmount('')
    setNote('')
    setError(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!target) return
    setError(null)
    try {
      const { item, mode } = target
      if (mode === 'buy') buyStock(item.id, toNumber(qty), toNumber(amount), method, note.trim())
      else if (mode === 'use') consumeStock(item.id, toNumber(qty), note.trim())
      else adjustStock(item.id, toNumber(qty), note.trim())
      setTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  const low = inventory.filter((i) => i.stock <= i.min).length
  const itemName = (id: string) => inventory.find((i) => i.id === id)?.name ?? id

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Stok</h1>
        <p className="mt-1 text-sm text-muted">
          {low > 0 ? `${low} barang menipis` : 'Semua stok aman'} · {inventory.length} barang
        </p>
      </div>

      <Hint>Perubahan hanya tersimpan sementara dan hilang saat halaman dimuat ulang.</Hint>

      {target && (
        <Card>
          <SectionTitle>
            {modeLabel[target.mode]}: {target.item.name}
          </SectionTitle>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <label className="block text-sm font-semibold">
              {target.mode === 'adjust' ? `Selisih (${target.item.unit}, boleh minus)` : `Jumlah (${target.item.unit})`}
              <input
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            {target.mode === 'buy' && (
              <>
                <label className="block text-sm font-semibold">
                  Nominal (Rp)
                  <input
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputClass} mt-1.5`}
                  />
                </label>
                <label className="block text-sm font-semibold">
                  Metode bayar
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className={`${inputClass} mt-1.5`}
                  >
                    {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {paymentMethodLabel[m]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="block text-sm font-semibold">
              Catatan
              <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button type="submit" className={primaryButton}>
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="btn btn-secondary"
              >
                Batal
              </button>
            </div>
          </form>
          {target.mode === 'buy' && (
            <p className="mt-2 text-xs text-muted">
              Beli stok sekaligus mencatat pengeluaran kategori Stok dan kas keluar.
            </p>
          )}
          {target.mode === 'use' && (
            <p className="mt-2 text-xs text-muted">Pakai stok tidak membuat pengeluaran kas.</p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </Card>
      )}

      <ul className="space-y-3">
        {inventory.map((i) => {
          const isLow = i.stock <= i.min
          return (
            <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold">{i.name}</p>
                <p className="text-xs text-muted">Minimum {i.min} {i.unit}</p>
              </div>
              <p className="w-28 text-right font-semibold">
                {formatQty(i.stock)} {i.unit}
              </p>
              {isLow && <StatusChip label="Menipis" tone="peach" />}
              <div className="flex flex-wrap gap-2">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => open(i, m)}
                    aria-label={`${modeLabel[m]} ${i.name}`}
                    className="btn btn-secondary btn-sm"
                  >
                    {modeLabel[m]}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <section aria-labelledby="mv-title">
        <h2 id="mv-title" className="mb-3 text-lg font-bold">
          Riwayat Mutasi
        </h2>
        {movements.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Belum ada mutasi pada sesi ini.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-sm shadow-card">
                <span className="min-w-0">
                  <span className="font-semibold">{itemName(m.itemId)}</span>
                  <span className="block truncate text-xs text-muted">
                    {typeLabel[m.type]} · {dateTime.format(new Date(m.at))}
                    {m.note ? ` · ${m.note}` : ''}
                  </span>
                </span>
                <span className="font-semibold">
                  {m.type === 'OUT' ? '−' : m.qty > 0 ? '+' : ''}
                  {formatQty(m.qty)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Pembelian stok juga tercatat sebagai kas keluar di Buku Kas.</p>
      </section>
    </div>
  )
}
