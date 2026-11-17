import { DataList } from '@/components/DataList'
import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { DeleteButton } from '@/components/ConfirmDialog'
import { deleteEmployee, employeeUsage } from '@/data/admin'
import { Card, Hint, inputClass, primaryButton, StatusChip } from '@/components/ui'
import { addEmployee, setEmployeeActive, updateEmployee, useStore, type Employee } from '@/data/store'
import { formatRupiah } from '@/lib/format'

export function EmployeesPage() {
  const employees = useStore((s) => s.employees)

  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [salary, setSalary] = useState('')
  const [error, setError] = useState<string | null>(null)

  const visible = employees.filter((e) => showInactive || e.active)
  const activeCount = employees.filter((e) => e.active).length

  function open(target: Employee | 'new') {
    setError(null)
    setEditing(target)
    setName(target === 'new' ? '' : target.name)
    setPosition(target === 'new' ? '' : target.position)
    setSalary(target === 'new' ? '' : String(target.weeklySalary))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const value = salary.trim() === '' ? 0 : Number(salary.replace(/\./g, ''))
      if (editing === 'new') addEmployee(name, position, value)
      else if (editing) updateEmployee(editing.id, name, position, value)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan karyawan.')
    }
  }

  const actions = (e: Employee) => (
    <>
<button
                type="button"
                onClick={() => open(e)}
                aria-label={`Ubah ${e.name}`}
                className="icon-btn icon-btn-sm"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setEmployeeActive(e.id, !e.active)}
                className="btn btn-secondary btn-sm"
              >
                {e.active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <DeleteButton label={`Hapus ${e.name}`} title={`Hapus karyawan ${e.name}?`} blockedBy={employeeUsage(e.id).reasons} onConfirm={() => deleteEmployee(e.id)} />
    </>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Tim</h1>
          <p className="mt-1 text-sm text-muted">{activeCount} karyawan aktif</p>
        </div>
        <button
          type="button"
          onClick={() => open('new')}
          className="btn btn-accent"
        >
          <Plus className="size-4" aria-hidden />
          Tambah Karyawan
        </button>
      </div>

      <Hint>Pembuatan akun login karyawan (username dan password) baru tersedia setelah backend ada.</Hint>

      {editing && (
        <Card>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Nama
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Jabatan
              <input value={position} onChange={(e) => setPosition(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Gaji mingguan (Rp)
              <input
                inputMode="numeric"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>
            <button type="submit" className={primaryButton}>
              {editing === 'new' ? 'Simpan' : 'Perbarui'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn btn-secondary"
            >
              Batal
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </Card>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Tampilkan yang nonaktif
      </label>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">Belum ada karyawan.</p>
        </Card>
      ) : (
        <DataList
          id="employees"
          items={visible}
          rowKey={(e) => e.id}
          actions={actions}
          columns={[
            { key: 'name', label: 'Nama', primary: true, sort: (e) => e.name, render: (e) => e.name },
            { key: 'position', label: 'Jabatan', compact: true, sort: (e) => e.position, render: (e) => e.position },
            { key: 'salary', label: 'Gaji / minggu', align: 'right', compact: true, sort: (e) => e.weeklySalary, render: (e) => formatRupiah(e.weeklySalary) },
            { key: 'status', label: 'Status', hideBelow: 'sm', render: (e) => <StatusChip label={e.active ? 'Aktif' : 'Nonaktif'} tone={e.active ? 'lime' : 'peach'} /> },
          ]}
          renderNormal={(e) => (
<li className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac font-bold">
                {e.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold">{e.name}</p>
                <p className="truncate text-xs text-muted">
                  {e.position} · {formatRupiah(e.weeklySalary)} / minggu
                </p>
              </div>
              {!e.active && <StatusChip label="Nonaktif" tone="peach" />}
              {actions(e)}
</li>
          )}
        />
      )}
    </div>
  )
}
