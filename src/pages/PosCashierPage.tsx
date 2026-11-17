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
          <button type="button" onClick={() => setPosDay(businessId, true, '')} className="btn btn-primary btn-sm">
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
                  className="relative min-h-28 rounded-card bg-surface p-4 text-left shadow-card card-hover active:scale-[0.98]"
                >
                  <span className="block pr-8 text-lg font-bold leading-snug">{p.name}</span>
                  <span className="mt-1 block text-base text-muted">{formatRupiah(p.price)}</span>
                  {cart[p.id] > 0 && (
                    <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-lime text-base font-bold text-sidebar">{cart[p.id]}</span>
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
              <p className="text-base text-muted">Ketuk produk untuk menambah ke keranjang.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <li key={l.productId} className="flex items-center gap-2 py-3 text-base">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{l.name}</span>
                      <span className="text-xs text-muted">{formatRupiah(l.price)}</span>
                    </span>
                    <button type="button" aria-label={`Kurangi ${l.name}`} onClick={() => change(l.productId, -1)} className="icon-btn icon-btn-sm">
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span className="w-8 text-center text-lg font-bold" aria-label={`Jumlah ${l.name}`}>
                      {l.qty}
                    </span>
                    <button type="button" aria-label={`Tambah ${l.name}`} onClick={() => change(l.productId, 1)} className="icon-btn icon-btn-sm">
                      <Plus className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label={`Hapus ${l.name}`} onClick={() => change(l.productId, -l.qty)} className="icon-btn icon-btn-ghost icon-btn-sm">
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

            <label className="mt-3 hidden text-sm font-semibold lg:block">
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
              className="btn btn-primary btn-lg mt-4 hidden w-full lg:inline-flex"
            >
              Bayar {formatRupiah(total)}
            </button>
          </Card>
        </aside>
      </div>

      {/* HP: metode, total, dan tombol Bayar menempel di atas bilah navigasi bawah */}
      <div
        className="fixed inset-x-0 z-20 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 lg:hidden"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))', boxShadow: '0 -4px 16px rgb(27 27 40 / 0.06)' }}
      >
        <label className="shrink-0">
          <span className="sr-only">Metode bayar</span>
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${inputClass} w-28`}>
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={lines.length === 0} onClick={checkout} className="btn btn-primary btn-lg min-w-0 flex-1">
          Bayar {formatRupiah(total)}
        </button>
      </div>
    </div>
  )
}
