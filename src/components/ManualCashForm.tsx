import { useState, type FormEvent } from 'react'
import { Card, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { addManualCash } from '@/data/store'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'

/** Kas manual oleh owner di luar pembayaran dan pengeluaran, misalnya setoran modal. */
export function ManualCashForm({ onDone }: { onDone: () => void }) {
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      addManualCash(direction, description, category, Number(amount.replace(/\./g, '').replace(',', '.')), method)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat kas manual.')
    }
  }

  return (
    <Card>
      <SectionTitle>Kas manual</SectionTitle>
      <p className="mb-3 text-xs text-muted">Untuk uang masuk atau keluar di luar pembayaran pesanan dan pengeluaran. Tercatat di Audit.</p>
      <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label className="block text-sm font-semibold">
          Arah
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')} className={`${inputClass} mt-1.5`}>
            <option value="in">Masuk</option>
            <option value="out">Keluar</option>
          </select>
        </label>
        <label className="block text-sm font-semibold lg:col-span-2">
          Deskripsi
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold">
          Kategori (opsional)
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Kas Manual" className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold">
          Nominal (Rp)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} />
        </label>
        <label className="block text-sm font-semibold">
          Metode
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${inputClass} mt-1.5`}>
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={primaryButton}>
            Simpan
          </button>
          <button type="button" onClick={onDone} className="h-11 rounded-full bg-canvas px-5 text-sm font-semibold hover:bg-line">
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
  )
}
