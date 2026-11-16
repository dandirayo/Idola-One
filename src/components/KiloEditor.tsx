import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { updateOrderKiloLines, useStore, type Order, type OrderItem } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import { orderTotal } from '@/lib/orders'

interface Row {
  serviceId: string
  qty: string
}

/**
 * Owner mengubah layanan kiloan pesanan. Harga dan total dihitung ulang dari
 * katalog saat ini; item satuan tidak berubah. Hanya sebelum pesanan diambil.
 */
export function KiloEditor({ order }: { order: Order }) {
  const services = useStore((s) => s.services)
  const kiloServices = services.filter((s) => s.unit === 'kg' && (s.active || order.items.some((i) => i.serviceId === s.id)))

  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const editable = order.status === 'received' || order.status === 'processing'
  if (!editable || !order.items.some((i) => i.unit === 'kg')) return null

  function start() {
    setError(null)
    setRows(order.items.filter((i) => i.unit === 'kg').map((i) => ({ serviceId: i.serviceId, qty: formatQty(i.qty) })))
    setOpen(true)
  }

  const parsed = rows.map((r) => ({ serviceId: r.serviceId, qty: Number(r.qty.replace(',', '.')) }))
  const preview: OrderItem[] = [
    ...parsed
      .filter((p) => Number.isFinite(p.qty) && p.qty > 0)
      .map((p) => {
        const s = services.find((x) => x.id === p.serviceId)
        return { serviceId: p.serviceId, name: s?.name ?? '', unit: 'kg' as const, qty: p.qty, price: s?.price ?? 0 }
      }),
    ...order.items.filter((i) => i.unit !== 'kg'),
  ]
  const newTotal = orderTotal(preview, order.skipMinKg)

  function save() {
    setError(null)
    try {
      updateOrderKiloLines(order.id, parsed)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah layanan.')
    }
  }

  return (
    <Card>
      <SectionTitle>Ubah Layanan Kiloan</SectionTitle>
      {!open ? (
        <>
          <p className="mb-3 text-xs text-muted">Khusus owner. Harga dan total dihitung ulang dari katalog saat ini, dan perubahan tercatat di Audit.</p>
          <button type="button" onClick={start} className="h-10 rounded-full bg-canvas px-5 text-sm font-semibold hover:bg-line">
            Ubah layanan kiloan
          </button>
        </>
      ) : (
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_7rem_auto] items-end gap-2">
              <label className="block text-xs font-semibold">
                Layanan
                <select
                  value={r.serviceId}
                  onChange={(e) => setRows((prev) => prev.map((x, n) => (n === idx ? { ...x, serviceId: e.target.value } : x)))}
                  className={`${inputClass} mt-1`}
                >
                  {kiloServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatRupiah(s.price)}/kg
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Berat (kg)
                <input
                  inputMode="decimal"
                  value={r.qty}
                  onChange={(e) => setRows((prev) => prev.map((x, n) => (n === idx ? { ...x, qty: e.target.value } : x)))}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <button
                type="button"
                aria-label="Hapus baris kiloan"
                disabled={rows.length === 1}
                onClick={() => setRows((prev) => prev.filter((_, n) => n !== idx))}
                className="grid size-10 place-items-center rounded-full hover:bg-canvas disabled:opacity-40"
              >
                <Trash2 className="size-4 text-muted" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { serviceId: kiloServices[0]?.id ?? '', qty: '' }])}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-canvas px-4 text-sm font-semibold hover:bg-line"
          >
            <Plus className="size-4" aria-hidden /> Tambah baris
          </button>

          <p className="rounded-xl bg-canvas p-3 text-sm">
            Total sekarang <strong>{formatRupiah(order.total)}</strong>, perkiraan setelah diubah <strong>{formatRupiah(newTotal)}</strong>. Sudah dibayar{' '}
            {formatRupiah(order.paid)}.
          </p>

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={save} className={`${primaryButton} h-10`}>
              Simpan perubahan
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full bg-canvas px-5 text-sm font-semibold hover:bg-line">
              Batal
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
