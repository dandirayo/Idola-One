import { useState, type FormEvent } from 'react'
import { Card, Hint, inputClass, primaryButton, SectionTitle, StatusChip } from '@/components/ui'
import { addBeverageBusiness, setBusinessActive, setMember } from '@/data/business'
import { useStore } from '@/data/store'

export function BusinessManagePage() {
  const businesses = useStore((s) => s.businesses)
  const members = useStore((s) => s.members)
  const employees = useStore((s) => s.employees).filter((e) => e.active)

  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => void) {
    setError(null)
    try {
      fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    run(() => {
      addBeverageBusiness(name)
      setName('')
    })
  }

  const isMember = (businessId: string, employeeId: string) =>
    members.some((m) => m.businessId === businessId && m.employeeId === employeeId && m.active)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Kelola Usaha</h1>

      <Hint>Karyawan hanya melihat usaha yang aksesnya kamu aktifkan di sini. Usaha nonaktif tidak bisa dipilih untuk transaksi baru. Jenis usaha
        yang bisa ditambah saat ini: minuman.</Hint>

      <Card>
        <SectionTitle>Tambah usaha minuman</SectionTitle>
        <form onSubmit={add} noValidate className="flex flex-wrap gap-2">
          <label className="min-w-56 flex-1 text-sm font-semibold">
            <span className="sr-only">Nama usaha</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama usaha, contoh: Kopi Keliling" className={inputClass} />
          </label>
          <button type="submit" className={primaryButton}>
            Tambah
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}
      </Card>

      <ul className="space-y-4">
        {businesses.map((b) => (
          <li key={b.id} className="rounded-card bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-semibold">{b.name}</p>
                <p className="text-xs text-muted">{b.kind === 'laundry' ? 'Laundry' : 'Minuman'}</p>
              </div>
              <StatusChip label={b.active ? 'Aktif' : 'Nonaktif'} tone={b.active ? 'lime' : 'peach'} />
              <button
                type="button"
                onClick={() => run(() => setBusinessActive(b.id, !b.active))}
                className="btn btn-secondary btn-sm"
              >
                {b.active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>

            <fieldset className="mt-3">
              <legend className="mb-2 text-xs font-semibold text-muted">Karyawan yang boleh mengakses</legend>
              <div className="flex flex-wrap gap-2">
                {employees.map((e) => {
                  const on = isMember(b.id, e.id)
                  return (
                    <label
                      key={e.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? 'border-ink bg-lime-soft' : 'border-line'}`}
                    >
                      <input type="checkbox" checked={on} onChange={(ev) => run(() => setMember(b.id, e.id, ev.target.checked))} />
                      {e.name}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
    </div>
  )
}
