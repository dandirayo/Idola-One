import { pushNewCustomer } from '@/lib/google-contacts'
import { SearchSelect, type SearchOption } from '@/components/SearchSelect'
import { Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { addCustomer, createOrder, useStore, type OrderItem } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import { lineAmount, MIN_KG, orderTotal, paymentMethodLabel, subtotal, type PaymentMethod, isDecimalUnit } from '@/lib/orders'
import { INCENTIVE_OPTIONS } from '@/lib/payroll'

type PayChoice = 'none' | 'half' | 'full'

const AUTO_PRINT_KEY = 'idola-one:auto-print'

/** Bawaan menyala, sama dengan sakelar "Cetak Struk Otomatis" di aplikasi Android. */
function readAutoPrint(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) !== '0'
  } catch {
    return true
  }
}

export function OrderNewPage() {
  const navigate = useNavigate()
  const allServices = useStore((s) => s.services)
  const allCustomers = useStore((s) => s.customers)
  const services = allServices.filter((s) => s.active)
  const customers = allCustomers.filter((c) => c.active)
  const employees = useStore((s) => s.employees).filter((e) => e.active)

  const [customerId, setCustomerId] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [qty, setQty] = useState('')
  const [incentive, setIncentive] = useState('0')
  const [incentiveTo, setIncentiveTo] = useState('')
  const [items, setItems] = useState<OrderItem[]>([])
  const [skipMinKg, setSkipMinKg] = useState(false)
  const [payChoice, setPayChoice] = useState<PayChoice>('none')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [autoPrint, setAutoPrintState] = useState(readAutoPrint)
  const setAutoPrint = (v: boolean) => {
    setAutoPrintState(v)
    try {
      localStorage.setItem(AUTO_PRINT_KEY, v ? '1' : '0')
    } catch {
      // penyimpanan diblokir: pilihan hanya berlaku di halaman ini
    }
  }

  const selected = services.find((s) => s.id === serviceId)
  const serviceOptions: SearchOption[] = services.map((s) => ({
    id: s.id,
    label: s.name,
    detail: `${formatRupiah(s.price)}/${s.unit}`,
    group: s.category ?? 'Lainnya',
    keywords: [s.unit],
  }))
  const customerOptions: SearchOption[] = customers.map((c) => ({
    id: c.id,
    label: c.name,
    detail: c.phone,
    phones: [c.phone],
  }))
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
    const decimal = isDecimalUnit(selected.unit)
    const step = decimal ? 0.1 : 1
    if (Math.abs(value / step - Math.round(value / step)) > 1e-9) {
      return setError(decimal ? `Jumlah per 0,1 ${selected.unit}.` : 'Jumlah harus bilangan bulat.')
    }
    const perUnit = selected.incentive ? Number(incentive) : 0
    const receiver = incentiveTo || employees[0]?.id || ''
    if (perUnit > 0 && !receiver) return setError('Pilih karyawan penerima insentif.')
    setItems((prev) => [
      ...prev,
      {
        serviceId: selected.id,
        name: selected.name,
        unit: selected.unit,
        qty: value,
        price: selected.price,
        ...(perUnit > 0 ? { incentive: { perUnit, employeeId: receiver } } : {}),
      },
    ])
    setQty('')
    setIncentive('0')
  }

  function saveCustomer() {
    setError(null)
    try {
      const c = addCustomer(newName, newPhone)
      pushNewCustomer(c)
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
      navigate(`/orders/${order.id}`, { replace: true, state: autoPrint ? { print: ['receipt', 'label'] } : null })
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
              <div className="min-w-0 flex-1">
                <SearchSelect
                  label="Pelanggan"
                  placeholder="Cari nama atau nomor HP"
                  options={customerOptions}
                  value={customerId}
                  onChange={setCustomerId}
                />
              </div>
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
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <div className="col-span-full">
                <SearchSelect
                  label="Layanan"
                  placeholder="Cari layanan, misal: jas setrika"
                  options={serviceOptions}
                  value={serviceId}
                  onChange={setServiceId}
                  limit={60}
                />
              </div>
              <label>
                <span className="sr-only">Berat atau jumlah</span>
                <input
                  inputMode="decimal"
                  placeholder={selected?.unit === 'kg' ? 'Berat (kg)' : selected && isDecimalUnit(selected.unit) ? `Jumlah (${selected.unit})` : 'Jumlah'}
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

            {selected?.incentive && (
              <div className="mt-2 grid gap-2 rounded-2xl bg-canvas p-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold">
                  Insentif karyawan per pcs
                  <select value={incentive} onChange={(e) => setIncentive(e.target.value)} className={`${inputClass} mt-1 bg-surface`}>
                    {INCENTIVE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v === 0 ? 'Tanpa insentif' : formatRupiah(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold">
                  Penerima
                  <select value={incentiveTo || employees[0]?.id || ''} onChange={(e) => setIncentiveTo(e.target.value)} className={`${inputClass} mt-1 bg-surface`}>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

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
                        {i.incentive ? ` · insentif ${formatRupiah(i.incentive.perUnit)}/pcs` : ''}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatRupiah(lineAmount(i.qty, i.price))}</p>
                    <button
                      type="button"
                      aria-label={`Hapus ${i.name}`}
                      onClick={() => setItems((prev) => prev.filter((_, n) => n !== idx))}
                      className="icon-btn icon-btn-ghost icon-btn-sm"
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
              className="field field-area"
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
              <div className="seg w-full">
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
                    className="seg-item flex-1"
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
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
              Cetak otomatis Nota + Label setelah simpan
            </label>
            <button type="submit" className={`${primaryButton} btn-lg mt-4 hidden w-full lg:inline-flex`}>
              Simpan Pesanan
            </button>
          </Card>
        </aside>
      </div>

      {/* HP: total dan tombol simpan menempel di atas bilah navigasi bawah */}
      <div
        className="fixed inset-x-0 z-20 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 lg:hidden"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))', boxShadow: '0 -4px 16px rgb(27 27 40 / 0.06)' }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">Perkiraan total</p>
          <p className="text-xl font-bold tabular-nums">{formatRupiah(estimate)}</p>
        </div>
        <button type="submit" className={`${primaryButton} btn-lg ml-auto flex-1 sm:flex-none`}>
          Simpan Pesanan
        </button>
      </div>
    </form>
  )
}
