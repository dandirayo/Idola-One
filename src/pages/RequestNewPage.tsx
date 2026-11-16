import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, inputClass, primaryButton } from '@/components/ui'
import { createRequest } from '@/data/store'
import { isMoneyRequest, requestTypeLabel, type RequestType } from '@/lib/requests'

const placeholders: Record<RequestType, string> = {
  stock: 'Contoh: Plastik 40, 200 pcs',
  overtime: 'Contoh: Lembur Jumat 17.00–20.00 karena pesanan menumpuk',
  shift_swap: 'Contoh: Tukar shift Sabtu dengan Dika',
  leave: 'Contoh: Izin sakit tanggal 20 November',
  cash_advance: 'Contoh: Kasbon untuk keperluan keluarga',
}

export function RequestNewPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<RequestType>('stock')
  const [requester, setRequester] = useState('')
  const [detail, setDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      createRequest(type, requester, detail, Number(amount.replace(/\./g, '').replace(',', '.')) || 0)
      navigate('/requests/review', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Buat Pengajuan</h1>
        <Link to="/requests/review" className="text-sm font-semibold text-muted hover:text-ink">
          Batal
        </Link>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={submit} noValidate className="space-y-4">
          <label className="block text-sm font-semibold">
            Jenis pengajuan
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RequestType)}
              className={`${inputClass} mt-1.5`}
            >
              {(Object.keys(requestTypeLabel) as RequestType[]).map((t) => (
                <option key={t} value={t}>
                  {requestTypeLabel[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Nama pengaju
            <input value={requester} onChange={(e) => setRequester(e.target.value)} className={`${inputClass} mt-1.5`} />
          </label>

          <label className="block text-sm font-semibold">
            Detail
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder={placeholders[type]}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas p-3.5 text-sm outline-none placeholder:text-muted focus:border-ink"
            />
          </label>

          {isMoneyRequest(type) && (
            <label className="block text-sm font-semibold">
              Nominal (Rp)
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          <button type="submit" className={primaryButton}>
            Kirim Pengajuan
          </button>
        </form>
      </Card>
    </div>
  )
}
