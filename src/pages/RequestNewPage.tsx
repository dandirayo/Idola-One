import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, inputClass, primaryButton, TimeField } from '@/components/ui'
import { createRequest, type RequestPayload } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { dateKey } from '@/lib/shifts'
import { isMoneyRequest, requestTypeLabel, type RequestType } from '@/lib/requests'

const placeholders: Record<RequestType, string> = {
  stock: 'Contoh: Plastik 40, 200 pcs',
  overtime: 'Contoh: Lembur Jumat 17.00–20.00 karena pesanan menumpuk',
  shift_swap: 'Contoh: Tukar shift Sabtu dengan Dika',
  leave: 'Contoh: Izin sakit tanggal 20 November',
  cash_advance: 'Contoh: Kasbon untuk keperluan keluarga',
  forgot_attendance: 'Contoh: Lupa absen masuk karena HP mati',
  incentive: 'Contoh: Insentif cuci 12 sepatu pada nota IDL-20261117-0003',
}

export function RequestNewPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const isEmployee = session?.role === 'employee'

  const [type, setType] = useState<RequestType>('stock')
  const [requester, setRequester] = useState(isEmployee ? (session?.name ?? '') : '')
  const [detail, setDetail] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(dateKey(new Date(Date.now() - 86_400_000)))
  const [checkIn, setCheckIn] = useState('08:00')
  const [checkOut, setCheckOut] = useState('')
  const [error, setError] = useState<string | null>(null)

  const backTo = isEmployee ? '/requests/me' : '/requests/review'

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const payload: RequestPayload | undefined =
        type === 'forgot_attendance' ? { date, checkIn, ...(checkOut ? { checkOut } : {}) } : undefined
      createRequest(type, requester, detail, Number(amount.replace(/\./g, '').replace(',', '.')) || 0, payload)
      navigate(backTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Buat Pengajuan</h1>
        <Link to={backTo} className="text-sm font-semibold text-muted hover:text-ink">
          Batal
        </Link>
      </div>

      <Card className="max-w-2xl">
        <form onSubmit={submit} noValidate className="space-y-4">
          <label className="block text-sm font-semibold">
            Jenis pengajuan
            <select value={type} onChange={(e) => setType(e.target.value as RequestType)} className={`${inputClass} mt-1.5`}>
              {(Object.keys(requestTypeLabel) as RequestType[]).map((t) => (
                <option key={t} value={t}>
                  {requestTypeLabel[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Nama pengaju
            <input
              value={requester}
              onChange={(e) => setRequester(e.target.value)}
              readOnly={isEmployee}
              className={`${inputClass} mt-1.5 ${isEmployee ? 'opacity-70' : ''}`}
            />
          </label>

          <label className="block text-sm font-semibold">
            Detail
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder={placeholders[type]}
              className="field field-area mt-1.5"
            />
          </label>

          {type === 'forgot_attendance' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                Tanggal
                <input type="date" value={date} max={dateKey(new Date())} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Jam masuk
                <TimeField value={checkIn} onChange={setCheckIn} />
              </label>
              <label className="block text-sm font-semibold">
                Jam pulang (opsional)
                <TimeField value={checkOut} onChange={setCheckOut} />
              </label>
            </div>
          )}

          {isMoneyRequest(type) && (
            <label className="block text-sm font-semibold">
              Nominal (Rp)
              <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} />
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
