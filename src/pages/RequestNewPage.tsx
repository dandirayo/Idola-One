import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Card, inputClass, primaryButton, TimeField } from '@/components/ui'
import { createRequest, type RequestPayload } from '@/data/store'
import { useAuth } from '@/lib/auth'
import { dateKey } from '@/lib/shifts'
import { buildRequestDetail, expenseKinds, isMoneyRequest, leaveTypes, requestTypeLabel, type RequestFields, type RequestType } from '@/lib/requests'

const placeholders: Record<RequestType, string> = {
  stock: 'Contoh: Plastik 40, 200 pcs',
  overtime: 'Contoh: Lembur Jumat 17.00–20.00 karena pesanan menumpuk',
  shift_swap: 'Contoh: Tukar shift Sabtu dengan Dika',
  leave: 'Contoh: Izin sakit tanggal 20 November',
  cash_advance: 'Contoh: Kasbon untuk keperluan keluarga',
  forgot_attendance: 'Contoh: Lupa absen masuk karena HP mati',
  incentive: 'Contoh: Insentif cuci 12 sepatu pada nota IDL-20261117-0003',
  expense: 'Contoh: Struk terlampir di toko',
}

export function RequestNewPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const isEmployee = session?.role === 'employee'

  const [type, setType] = useState<RequestType>('stock')
  const [requester, setRequester] = useState(isEmployee ? (session?.name ?? '') : '')
  const [detail, setDetail] = useState('')
  const today = dateKey(new Date())
  const [f, setF] = useState<RequestFields>({
    leaveType: 'Sakit',
    expenseKind: 'Dana operasional',
    startDate: today,
    endDate: today,
    startTime: '17:00',
    endTime: '20:00',
  })
  const set = (patch: Partial<RequestFields>) => setF((v) => ({ ...v, ...patch }))
  const structured = type === 'stock' || type === 'leave' || type === 'shift_swap' || type === 'overtime' || type === 'expense'
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
      const text = buildRequestDetail(type, { ...f, note: detail })
      createRequest(type, requester, text, Number(amount.replace(/\./g, '').replace(',', '.')) || 0, payload)
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

          {type === 'stock' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold sm:col-span-3">
                Nama barang
                <input value={f.item ?? ''} onChange={(e) => set({ item: e.target.value })} placeholder="Contoh: Deterjen cair" className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Jumlah
                <input inputMode="decimal" value={f.quantity ?? ''} onChange={(e) => set({ quantity: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold sm:col-span-2">
                Satuan
                <input value={f.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder="Contoh: liter, botol, bungkus" className={`${inputClass} mt-1.5`} />
              </label>
            </div>
          )}

          {type === 'leave' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                Jenis izin
                <select value={f.leaveType} onChange={(e) => set({ leaveType: e.target.value })} className={`${inputClass} mt-1.5`}>
                  {leaveTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Tanggal mulai
                <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Tanggal selesai
                <input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set({ endDate: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <p className="text-xs text-muted sm:col-span-3">Tidak perlu menuliskan detail pribadi atau kondisi kesehatan.</p>
            </div>
          )}

          {type === 'shift_swap' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Tanggal tukar shift
                <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Rekan pengganti
                <input value={f.colleague ?? ''} onChange={(e) => set({ colleague: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Shift asal
                <input value={f.fromShift ?? ''} onChange={(e) => set({ fromShift: e.target.value })} placeholder="Contoh: 06.00–14.00" className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Shift tujuan
                <input value={f.toShift ?? ''} onChange={(e) => set({ toShift: e.target.value })} placeholder="Contoh: 12.00–20.00" className={`${inputClass} mt-1.5`} />
              </label>
            </div>
          )}

          {type === 'overtime' && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                Tanggal lembur
                <input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={`${inputClass} mt-1.5`} />
              </label>
              <label className="block text-sm font-semibold">
                Jam mulai
                <TimeField value={f.startTime ?? ''} onChange={(v) => set({ startTime: v })} />
              </label>
              <label className="block text-sm font-semibold">
                Jam selesai
                <TimeField value={f.endTime ?? ''} onChange={(v) => set({ endTime: v })} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-3">
                <input type="checkbox" checked={!!f.nextDay} onChange={(e) => set({ nextDay: e.target.checked })} />
                Selesai pada hari berikutnya
              </label>
              <label className="block text-sm font-semibold sm:col-span-3">
                Pekerjaan yang diselesaikan
                <textarea value={f.purpose ?? ''} onChange={(e) => set({ purpose: e.target.value })} rows={2} className="field field-area mt-1.5" />
              </label>
            </div>
          )}

          {type === 'expense' && (
            <div className="grid gap-3">
              <label className="block text-sm font-semibold">
                Jenis biaya
                <select value={f.expenseKind} onChange={(e) => set({ expenseKind: e.target.value })} className={`${inputClass} mt-1.5`}>
                  {expenseKinds.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Tujuan penggunaan
                <textarea value={f.purpose ?? ''} onChange={(e) => set({ purpose: e.target.value })} rows={2} placeholder="Contoh: Membeli plastik kemasan" className="field field-area mt-1.5" />
              </label>
              <p className="text-xs text-muted">Untuk biaya yang perlu persetujuan. Jangan ajukan ulang biaya yang sudah dicatat atau diganti.</p>
            </div>
          )}

          <label className="block text-sm font-semibold">
            {structured ? 'Catatan tambahan (opsional)' : 'Detail'}
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
