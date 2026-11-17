import { Pencil, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { DeleteButton } from '@/components/ConfirmDialog'
import { AUTO_EXPENSE_CATEGORIES, deleteExpense, deleteManualCash, updateExpense, updateManualCash } from '@/data/admin'
import { useStore } from '@/data/store'
import type { CashEntry } from '@/lib/finance'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'

function EditDialog({ entry, expenseId, onClose }: { entry: CashEntry; expenseId?: string; onClose: () => void }) {
  const [description, setDescription] = useState(entry.description)
  const [category, setCategory] = useState(entry.category)
  const [amount, setAmount] = useState(String(entry.amount))
  const [method, setMethod] = useState<PaymentMethod>(entry.method)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const fields = { description, category, amount: Number(amount.replace(/\./g, '').replace(',', '.')), method }
      if (expenseId) updateExpense(expenseId, fields, reason)
      else updateManualCash(entry.id, fields, reason)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  return createPortal(
    <div className="screen-only fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Ubah transaksi kas">
      <button type="button" aria-label="Tutup" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form onSubmit={submit} noValidate className="relative max-h-[92vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-[1.5rem] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-card sm:rounded-[1.5rem] sm:pb-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Ubah {expenseId ? 'pengeluaran' : 'kas manual'}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="icon-btn icon-btn-sm">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <label className="block text-sm font-semibold">
          Deskripsi
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="field mt-1.5" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Kategori
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="field mt-1.5" />
          </label>
          <label className="block text-sm font-semibold">
            Nominal (Rp)
            <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="field mt-1.5" />
          </label>
        </div>
        <label className="block text-sm font-semibold">
          Metode
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="field mt-1.5">
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Alasan perubahan (wajib, tercatat di Audit)
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="field field-area mt-1.5" />
        </label>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Simpan
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/**
 * Tombol Ubah dan Hapus untuk satu baris Buku Kas. Hanya muncul untuk kas manual dan
 * pengeluaran biasa. Pembayaran pesanan, gaji, insentif, kasbon, stok, dan termin proyek
 * diubah atau dibatalkan dari sumbernya agar kas tetap seimbang.
 */
export function CashRowActions({ entry }: { entry: CashEntry }) {
  const expenses = useStore((s) => s.expenses)
  const [editing, setEditing] = useState(false)

  const expense = entry.id.startsWith('cash-') ? expenses.find((x) => `cash-${x.id}` === entry.id) : undefined
  const ordinary = expense && !AUTO_EXPENSE_CATEGORIES.includes(expense.category)
  if (!entry.manual && !ordinary) return null

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button type="button" onClick={() => setEditing(true)} aria-label={`Ubah ${entry.description}`} className="icon-btn icon-btn-sm">
        <Pencil className="size-4" aria-hidden />
      </button>
      <DeleteButton
        label={`Hapus ${entry.description}`}
        title={`Hapus ${entry.manual ? 'kas manual' : 'pengeluaran'} "${entry.description}"?`}
        impacts={[`${entry.direction === 'in' ? 'Kas masuk' : 'Kas keluar'} ${formatRupiah(entry.amount)} dihapus dan saldo dihitung ulang.`]}
        reasonRequired
        onConfirm={(reason) => (expense ? deleteExpense(expense.id, reason) : deleteManualCash(entry.id, reason))}
      />
      {editing && <EditDialog entry={entry} expenseId={expense?.id} onClose={() => setEditing(false)} />}
    </span>
  )
}
