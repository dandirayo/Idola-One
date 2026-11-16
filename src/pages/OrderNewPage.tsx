import { Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { addCustomer, createOrder, useStore, type OrderItem } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import { lineAmount, MIN_KG, orderTotal, paymentMethodLabel, subtotal, type PaymentMethod } from '@/lib/orders'

type PayChoice = 'none' | 'half' | 'full'

export function OrderNewPage() {
  const navigate = useNavigate()
  const allServices = useStore((s) => s.services)
  const allCustomers = useStore((s) => s.customers)
  const services = allServices.filter((s) => s.active)
  const customers = allCustomers.filter((c) => c.active)

  const [customerId, setCustomerId] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [skipMinKg, setSkipMinKg] = useState(false)
  const [payChoice, setPayChoice] = useState<PayChoice>('none')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selected = services.find((s) => s.id === serviceId)
  const estimate = orderTotal(items, skipMinKg)
  const raw = subtotal(items, skipMinKg)
  const hasKg = items.some((i) => i.unit === 'kg')
  const kgTotal = items.filter((i) => i.unit === 'kg').reduce((sum, i) => sum + i.qty, 0)
  const minApplies = hasKg && kgTotal < MIN_KG && !skipMinKg
  const payAmount = payChoice === 'full' ? estimate : payChoice === 'half' ? Math.ceil(estimate / 2 / 1000) * 1000 : 0

  function addItem() {
    setError(null)
    const value = Number(qty.replace(',', '.'))
    if (!selected) return setError('Pilih layanan.')
    if (!Number.isFinite(value) || value <= 0) return setError('Isi berat atau jumlah lebih dari nol.')
    const step = selected.unit === 'kg' ? 0.1 : 1
    if (Math.abs(value / step - Math.round(value / step)) > 1e-9) {
      return setError(selected.unit === 'kg' ? 'Berat per 0,1 kg.' : 'Jumlah harus bilangan bulat.')
    }
    setItems((prev) => [
      ...prev,
      { serviceId: selected.id, name: selected.name, unit: selected.unit, qty: value, price: selected.price },
    ])
    setQty('')
  }

  function saveCustomer() {
    setError(null)
    try {
      const c = addCustomer(newName, newPhone)
      setCustomerId(c.id)
      setAdding(false)
      setNewName('')
      setNewPhone('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan pelanggan.')
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const order = createOrder({
        customerId,
        items,
        skipMinKg,
        note,
        initialPayment: payAmount > 0 ? { amount: payAmount, method } : null,
      })
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pesanan.')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Pesanan Baru</h1>
        <Link to="/orders" className="text-sm font-semibold text-muted hover:text-ink">
          Batal
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <SectionTitle>Pelanggan</SectionTitle>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Pelanggan</span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih pelanggan</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.phone}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setAdding((v) => !v)}
                aria-expanded={adding}
                aria-label="Tambah pelanggan baru"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-lime"
              >
                <UserPlus className="size-4" aria-hidden />
              </button>
            </div>
            {adding && (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  aria-label="Nama pelanggan"
                  placeholder="Nama"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={inputClass}
                />
                <input
                  aria-label="Nomor WhatsApp"
                  placeholder="Nomor WhatsApp"
                  inputMode="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={inputClass}
                />
                <button type="button" onClick={saveCustomer} className={primaryButton}>
                  Simpan
                </button>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle>Layanan</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]">
              <label>
                <span className="sr-only">Layanan</span>
                <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatRupiah(s.price)}/{s.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">Berat atau jumlah</span>
                <input
                  inputMode="decimal"
                  placeholder={selected?.unit === 'kg' ? 'Berat (kg)' : 'Jumlah'}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                  className={inputClass}
                />
              </label>
              <button type="button" onClick={addItem} className={primaryButton}>
                Tambah
              </button>
            </div>

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Belum ada layanan ditambahkan.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {items.map((i, idx) => (
                  <li key={idx} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted">
                        {formatQty(i.qty)} {i.unit} × {formatRupiah(i.price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatRupiah(lineAmount(i.qty, i.price))}</p>
                    <button
                      type="button"
                      aria-label={`Hapus ${i.name}`}
                      onClick={() => setItems((prev) => prev.filter((_, n) => n !== idx))}
                      className="grid size-8 place-items-center rounded-full hover:bg-canvas"
                    >
                      <Trash2 className="size-4 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {hasKg && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={skipMinKg} onChange={(e) => setSkipMinKg(e.target.checked)} />
                Tanpa minimal {MIN_KG} kg (pelanggan setia)
              </label>
            )}
          </Card>

          <Card>
            <SectionTitle>Catatan</SectionTitle>
            <textarea
              aria-label="Catatan"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-line bg-canvas p-3.5 text-sm outline-none focus:border-ink"
            />
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <SectionTitle>Ringkasan</SectionTitle>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd>{formatRupiah(raw)}</dd>
              </div>
              {minApplies && (
                <div className="text-xs text-warning">Ditagih minimal {MIN_KG} kg untuk kiloan.</div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Perkiraan total</dt>
                <dd>{formatRupiah(estimate)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted">Dibulatkan ke atas ke kelipatan Rp1.000. Total final dari server.</p>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold">Pembayaran</legend>
              <div className="flex gap-2">
                {(
                  [
                    ['none', 'Belum'],
                    ['half', 'DP 50%'],
                    ['full', 'Lunas'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={payChoice === value}
                    onClick={() => setPayChoice(value)}
                    className={`h-9 flex-1 rounded-full text-sm font-semibold ${
                      payChoice === value ? 'bg-sidebar text-white' : 'bg-canvas hover:bg-line'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {payChoice !== 'none' && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm">
                    Dibayar sekarang: <strong>{formatRupiah(payAmount)}</strong>
                  </p>
                  <label className="block">
                    <span className="sr-only">Metode bayar</span>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      className={inputClass}
                    >
                      {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {paymentMethodLabel[m]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </fieldset>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            )}
            <button type="submit" className={`${primaryButton} mt-4 w-full`}>
              Simpan Pesanan
            </button>
          </Card>
        </aside>
      </div>
    </form>
  )
}
