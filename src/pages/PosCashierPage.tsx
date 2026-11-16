import { Minus, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card, inputClass, SectionTitle } from '@/components/ui'
import { createPosSale, posDayFor, setPosDay } from '@/data/pos'
import { useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import { cartTotal } from '@/lib/pos'

export function PosCashierPage() {
  const { businessId } = useAuth()
  const allProducts = useStore((s) => s.posProducts)
  useStore((s) => s.posDays)

  const [cart, setCart] = useState<Record<string, number>>({})
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<{ number: string; total: number } | null>(null)

  if (!businessId) return null
  const products = allProducts.filter((p) => p.businessId === businessId && p.active).sort((a, b) => a.sort - b.sort)
  const open = !!posDayFor(businessId)?.open

  const lines = products.filter((p) => cart[p.id] > 0).map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: cart[p.id] }))
  const total = cartTotal(lines)

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta)
      const copy = { ...c }
      if (next === 0) delete copy[id]
      else copy[id] = next
      return copy
    })

  function checkout() {
    setError(null)
    setLast(null)
    try {
      const sale = createPosSale(businessId!, lines.map((l) => ({ productId: l.productId, qty: l.qty })), method)
      setLast({ number: sale.number, total: sale.total })
      setCart({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Kasir</h1>

      {!open && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm" role="status">
          <span>Hari ini belum ditandai berjualan. Aktifkan dulu untuk mencatat transaksi.</span>
          <button type="button" onClick={() => setPosDay(businessId, true, '')} className="h-9 rounded-full bg-sidebar px-5 text-sm font-bold text-white">
            Mulai jualan
          </button>
        </div>
      )}

      {last && (
        <p role="status" className="rounded-2xl bg-lime-soft px-4 py-3 text-sm font-semibold">
          Transaksi {last.number} tersimpan: {formatRupiah(last.total)}. Keranjang dikosongkan.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label="Produk">
          {products.length === 0 ? (
            <Card>
              <p className="font-semibold">Belum ada produk aktif.</p>
              <p className="mt-1 text-sm text-muted">Owner menambahkan produk di halaman Produk.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => change(p.id, 1)}
                  aria-label={`Tambah ${p.name}, ${formatRupiah(p.price)}`}
                  className="relative min-h-24 rounded-card bg-surface p-4 text-left shadow-card hover:bg-white/70"
                >
                  <span className="block font-semibold">{p.name}</span>
                  <span className="mt-1 block text-sm text-muted">{formatRupiah(p.price)}</span>
                  {cart[p.id] > 0 && (
                    <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-lime text-xs font-bold text-sidebar">{cart[p.id]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside>
          <Card>
            <SectionTitle>Keranjang</SectionTitle>
            {lines.length === 0 ? (
              <p className="text-sm text-muted">Pilih produk di sebelah kiri.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <li key={l.productId} className="flex items-center gap-2 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.name}</span>
                      <span className="text-xs text-muted">{formatRupiah(l.price)}</span>
                    </span>
                    <button type="button" aria-label={`Kurangi ${l.name}`} onClick={() => change(l.productId, -1)} className="grid size-8 place-items-center rounded-full bg-canvas hover:bg-line">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-6 text-center font-semibold" aria-label={`Jumlah ${l.name}`}>
                      {l.qty}
                    </span>
                    <button type="button" aria-label={`Tambah ${l.name}`} onClick={() => change(l.productId, 1)} className="grid size-8 place-items-center rounded-full bg-canvas hover:bg-line">
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label={`Hapus ${l.name}`} onClick={() => change(l.productId, -l.qty)} className="grid size-8 place-items-center rounded-full hover:bg-canvas">
                      <Trash2 className="size-4 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex justify-between border-t border-line pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatRupiah(total)}</span>
            </div>

            <label className="mt-3 block text-sm font-semibold">
              Metode bayar
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${inputClass} mt-1.5`}>
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel[m]}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={checkout}
              className="mt-4 h-12 w-full rounded-full bg-sidebar text-sm font-bold text-white hover:bg-sidebar-hover disabled:opacity-50"
            >
              Bayar {formatRupiah(total)}
            </button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
