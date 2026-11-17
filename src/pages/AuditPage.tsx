import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Hint } from '@/components/ui'
import { useStore } from '@/data/store'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const PAGE_SIZE = 15

export function AuditPage() {
  const audit = useStore((s) => s.audit)
  const [query, setQuery] = useState('')
  const [entity, setEntity] = useState('all')
  const [page, setPage] = useState(0)

  const entities = useMemo(() => [...new Set(audit.map((a) => a.entity))].sort(), [audit])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return audit.filter(
      (a) =>
        (entity === 'all' || a.entity === entity) &&
        (!q || [a.ref, a.action, a.actor, a.before, a.after, a.entity].some((t) => t.toLowerCase().includes(q))),
    )
  }, [audit, query, entity])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Audit</h1>
        <p className="mt-1 text-sm text-muted">Jejak perubahan penting. Hanya bisa dibaca, tidak bisa diubah atau dihapus.</p>
      </div>

      <Hint>Hanya mencatat perubahan pada sesi ini: koreksi pembayaran, ubah layanan kiloan, perubahan harga, kas manual, gaji dan
        insentif, pembayaran kasbon, proyek, dan akses usaha.</Hint>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Cari di audit</span>
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Cari rujukan, aksi, atau pelaku"
            className="field field-search"
          />
        </label>
        <label className="text-sm font-semibold">
          <span className="sr-only">Filter jenis</span>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value)
              setPage(0)
            }}
            className="field field-pill"
          >
            <option value="all">Semua jenis</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <Card>
          <p className="font-semibold">{audit.length === 0 ? 'Belum ada perubahan tercatat.' : 'Tidak ada yang cocok.'}</p>
          {audit.length === 0 && <p className="mt-1 text-sm text-muted">Lakukan koreksi pembayaran atau ubah harga layanan untuk melihat contohnya.</p>}
        </Card>
      ) : (
        <ol className="space-y-3">
          {visible.map((a) => (
            <li key={a.id} className="rounded-card bg-surface p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {a.action} <span className="font-normal text-muted">· {a.entity}</span>
                </p>
                <p className="text-xs text-muted">
                  {dateTime.format(new Date(a.at))} · {a.actor}
                </p>
              </div>
              <p className="mt-0.5 text-sm">{a.ref}</p>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <p className="rounded-xl bg-canvas p-2.5">
                  <span className="font-semibold">Sebelum: </span>
                  {a.before}
                </p>
                <p className="rounded-xl bg-lime-soft p-2.5">
                  <span className="font-semibold">Sesudah: </span>
                  {a.after}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="btn btn-outline btn-sm">
            Sebelumnya
          </button>
          <span className="text-muted">
            Halaman {current + 1} dari {pages}
          </span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="btn btn-outline btn-sm">
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}
