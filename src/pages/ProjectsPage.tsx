import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Card, Hint, inputClass, primaryButton, SectionTitle, StatusChip } from '@/components/ui'
import { DeleteButton } from '@/components/ConfirmDialog'
import { deleteProject, deleteProjectBatch, deleteProjectPayment } from '@/data/admin'
import { addProjectBatch, addProjectPayment, createProject, projectBilled, projectPaid, setProjectStatus } from '@/data/projects'
import { useStore, type Project } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import { progressPercent, type RateType } from '@/lib/projects'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const toInt = (v: string) => Number(v.replace(/\./g, '').replace(',', '.'))

function ProjectDetail({ project }: { project: Project }) {
  const batches = useStore((s) => s.projectBatches).filter((b) => b.projectId === project.id)
  const payments = useStore((s) => s.projectPayments).filter((p) => p.projectId === project.id)

  const [pcs, setPcs] = useState('')
  const [kg, setKg] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [error, setError] = useState<string | null>(null)

  const billed = projectBilled(project.id)
  const paid = projectPaid(project.id)
  const remaining = billed - paid
  const progress = progressPercent(project.targetPcs, batches)
  const donePcs = batches.reduce((s, b) => s + b.pcs, 0)
  const active = project.status === 'active'

  function run(fn: () => void) {
    setError(null)
    try {
      fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.')
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-xs text-muted">Tagihan berjalan</p>
          <p className="font-bold">{formatRupiah(billed)}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-xs text-muted">Terbayar</p>
          <p className="font-bold">{formatRupiah(paid)}</p>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <p className="text-xs text-muted">Sisa tagihan</p>
          <p className="font-bold">{formatRupiah(remaining)}</p>
        </div>
      </div>
      <p className="text-xs text-muted">
        Kemajuan {donePcs} dari {project.targetPcs} pcs ({progress}%). Tagihan dibulatkan ke atas ke kelipatan Rp1.000.
      </p>

      {active && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            noValidate
            className="space-y-2 rounded-2xl bg-canvas p-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              run(() => {
                addProjectBatch(project.id, { pcs: pcs.trim() === '' ? 0 : toInt(pcs), kg: kg.trim() === '' ? 0 : toInt(kg) })
                setPcs('')
                setKg('')
              })
            }}
          >
            <p className="text-sm font-bold">Catat batch hari ini</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold">
                Jumlah pcs
                <input inputMode="numeric" value={pcs} onChange={(e) => setPcs(e.target.value)} className={`${inputClass} mt-1 bg-surface`} />
              </label>
              <label className="block text-xs font-semibold">
                Berat (kg)
                <input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} className={`${inputClass} mt-1 bg-surface`} />
              </label>
            </div>
            <button type="submit" className="btn btn-primary btn-sm w-full">
              Simpan batch
            </button>
          </form>

          <form
            noValidate
            className="space-y-2 rounded-2xl bg-canvas p-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              run(() => {
                addProjectPayment(project.id, toInt(amount), method)
                setAmount('')
              })
            }}
          >
            <p className="text-sm font-bold">Catat pembayaran termin</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold">
                Nominal (Rp)
                <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1 bg-surface`} />
              </label>
              <label className="block text-xs font-semibold">
                Metode
                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${inputClass} mt-1 bg-surface`}>
                  {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {paymentMethodLabel[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1">
                Catat
              </button>
              <button type="button" onClick={() => setAmount(String(Math.max(0, remaining)))} className="btn btn-outline btn-sm">
                Lunasi sisa
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-bold">Batch</h3>
          {batches.length === 0 ? (
            <p className="text-sm text-muted">Belum ada batch.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {[...batches].reverse().map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
                  <span>{b.date}</span>
                  <span className="font-semibold">
                    {b.pcs} pcs{b.kg > 0 ? ` · ${formatQty(b.kg)} kg` : ''}
                  </span>
                  <DeleteButton
                    label={`Hapus batch ${b.date}`}
                    title={`Hapus batch ${b.date}?`}
                    impacts={['Tagihan proyek dihitung ulang. Ditolak bila jadi lebih kecil dari yang sudah dibayar.']}
                    onConfirm={() => deleteProjectBatch(b.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold">Pembayaran</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">Belum ada pembayaran.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {[...payments].reverse().map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
                  <span>
                    {paymentMethodLabel[p.method]} · {dateTime.format(new Date(p.at))}
                  </span>
                  <span className="font-semibold">{formatRupiah(p.amount)}</span>
                  <DeleteButton
                    label={`Hapus pembayaran ${formatRupiah(p.amount)}`}
                    title={`Hapus pembayaran termin ${formatRupiah(p.amount)}?`}
                    impacts={[`Kas masuk ${formatRupiah(p.amount)} dibalik di Buku Kas.`]}
                    reasonRequired
                    onConfirm={(reason) => deleteProjectPayment(p.id, reason)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => run(() => setProjectStatus(project.id, active ? 'done' : 'active'))}
        className="btn btn-secondary btn-sm"
      >
        {active ? 'Tandai proyek selesai' : 'Buka kembali proyek'}
      </button>
      <DeleteButton
        label={`Hapus proyek ${project.name}`}
        className="btn btn-danger btn-sm ml-2"
        title={`Hapus proyek ${project.name}?`}
        impacts={[
          `${batches.length} batch dan ${payments.length} pembayaran ikut terhapus.`,
          payments.length > 0 ? `Kas masuk ${formatRupiah(payments.reduce((n, x) => n + x.amount, 0))} dibalik.` : 'Kas tidak berubah.',
          'Salinan proyek disimpan di Audit.',
        ]}
        reasonRequired
        confirmLabel="Hapus Proyek"
        onConfirm={(reason) => deleteProject(project.id, reason)}
      >
        Hapus Proyek
      </DeleteButton>
    </div>
  )
}

export function ProjectsPage() {
  const projects = useStore((s) => s.projects)
  const customers = useStore((s) => s.customers).filter((c) => c.active)
  const batches = useStore((s) => s.projectBatches)
  useStore((s) => s.projectPayments)

  const [openId, setOpenId] = useState<string | null>(projects[0]?.id ?? null)
  const [formOpen, setFormOpen] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [rateType, setRateType] = useState<RateType>('pcs')
  const [rate, setRate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const p = createProject({ customerId, name, targetPcs: toInt(target), rateType, rate: toInt(rate), note })
      setOpenId(p.id)
      setFormOpen(false)
      setName('')
      setTarget('')
      setRate('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat proyek.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Proyek</h1>
        <button type="button" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen} className="btn btn-accent">
          <Plus className="size-4" aria-hidden />
          Proyek Baru
        </button>
      </div>

      <Hint>Laundry borongan (hotel, asrama, instansi). Data contoh. Pembayaran termin otomatis menjadi kas masuk di Buku Kas dan tidak boleh melebihi tagihan berjalan.</Hint>

      {formOpen && (
        <Card>
          <SectionTitle>Proyek baru</SectionTitle>
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-semibold">
              Pelanggan
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`${inputClass} mt-1.5`}>
                <option value="">Pilih pelanggan</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold lg:col-span-2">
              Nama proyek
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Target (pcs)
              <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold">
              Tarif per
              <select value={rateType} onChange={(e) => setRateType(e.target.value as RateType)} className={`${inputClass} mt-1.5`}>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Tarif (Rp)
              <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2 lg:col-span-3">
              Catatan
              <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <button type="submit" className={primaryButton}>
                Simpan proyek
              </button>
            </div>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <p className="font-semibold">Belum ada proyek.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => {
            const progress = progressPercent(p.targetPcs, batches.filter((b) => b.projectId === p.id))
            const expanded = openId === p.id
            return (
              <li key={p.id} className="rounded-card bg-surface p-4 shadow-card">
                <button type="button" onClick={() => setOpenId(expanded ? null : p.id)} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-3 text-left">
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {p.customerName} · {formatRupiah(p.rate)}/{p.rateType} · target {p.targetPcs} pcs
                    </span>
                  </span>
                  <StatusChip label={p.status === 'active' ? 'Berjalan' : 'Selesai'} tone={p.status === 'active' ? 'lime' : 'cream'} />
                  <span className="w-32">
                    <span className="block text-right text-xs font-semibold">{progress}%</span>
                    <span className="block h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Kemajuan ${p.name}`}>
                      <span className="block h-full bg-success" style={{ width: `${progress}%` }} />
                    </span>
                  </span>
                </button>
                {expanded && <ProjectDetail project={p} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
