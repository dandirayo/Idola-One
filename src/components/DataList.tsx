import { AlignJustify, ArrowDown, ArrowUp, LayoutGrid, List, Table } from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'

export type ViewMode = 'normal' | 'table' | 'compact' | 'grid'

const MODES: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: 'normal', label: 'Normal', icon: List },
  { value: 'table', label: 'Tabel', icon: Table },
  { value: 'compact', label: 'List kecil', icon: AlignJustify },
  { value: 'grid', label: 'Grid detail', icon: LayoutGrid },
]

const storageKey = (id: string) => `idola-one:view:${id}`

function readMode(id: string): ViewMode {
  try {
    const v = localStorage.getItem(storageKey(id))
    if (v === 'normal' || v === 'table' || v === 'compact' || v === 'grid') return v
  } catch {
    // penyimpanan diblokir: pakai Normal
  }
  return 'normal'
}

/** Pilihan tampilan daftar, diingat per daftar di browser. */
export function useViewMode(id: string): [ViewMode, (m: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => readMode(id))
  return [
    mode,
    (m) => {
      setMode(m)
      try {
        localStorage.setItem(storageKey(id), m)
      } catch {
        // diabaikan
      }
    },
  ]
}

export function ViewSwitch({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="seg" role="group" aria-label="Tampilan daftar">
      {MODES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className="seg-item inline-flex items-center gap-1.5"
          aria-pressed={mode === value}
          aria-label={`Tampilan ${label}`}
          title={label}
          onClick={() => onChange(value)}
        >
          <Icon className="size-4" aria-hidden />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

export interface Column<T> {
  key: string
  label: string
  render: (item: T) => ReactNode
  /** Nilai untuk mengurutkan. Tanpa ini kolom tidak bisa diurutkan. */
  sort?: (item: T) => string | number
  align?: 'right'
  /** Kolom utama (judul baris) pada List kecil dan Grid detail. */
  primary?: boolean
  /** Tampil di List kecil (maksimal dua). Tanpa penanda, dua kolom pertama setelah kolom utama. */
  compact?: boolean
  /** Sembunyikan kolom di bawah lebar ini pada Tabel. */
  hideBelow?: 'sm' | 'md' | 'lg'
}

const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }

interface Props<T> {
  /** Nama unik daftar, dipakai untuk mengingat pilihan tampilan. */
  id: string
  items: T[]
  rowKey: (item: T) => string
  columns: Column<T>[]
  /** Baris Normal (tampilan yang sudah ada). Mengembalikan elemen li lengkap. */
  renderNormal: (item: T) => ReactNode
  /** Tombol per baris (ubah, hapus) untuk Tabel, List kecil, dan Grid detail. */
  actions?: (item: T) => ReactNode
  normalClassName?: string
  /** Pilihan tampilan bersama (bila beberapa daftar dalam satu halaman memakai satu pemilih). */
  view?: [ViewMode, (m: ViewMode) => void]
  showSwitch?: boolean
}

export function DataList<T>({ id, items, rowKey, columns, renderNormal, actions, normalClassName = 'space-y-3', view, showSwitch = true }: Props<T>) {
  const own = useViewMode(id)
  const [mode, setMode] = view ?? own
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [desc, setDesc] = useState(false)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sort) return items
    const get = col.sort
    const out = [...items].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id')
    })
    return desc ? out.reverse() : out
  }, [items, columns, sortKey, desc])

  const primary = columns.find((c) => c.primary) ?? columns[0]
  const others = columns.filter((c) => c !== primary)
  const compactCols = (others.some((c) => c.compact) ? others.filter((c) => c.compact) : others).slice(0, 2)

  function toggleSort(key: string) {
    if (sortKey === key) setDesc((d) => !d)
    else {
      setSortKey(key)
      setDesc(false)
    }
  }

  return (
    <div>
      {showSwitch && (
        <div className="mb-3 flex justify-end">
          <ViewSwitch mode={mode} onChange={setMode} />
        </div>
      )}

      {mode === 'normal' && (
        <ul className={normalClassName}>
          {sorted.map((item) => (
            <Fragment key={rowKey(item)}>{renderNormal(item)}</Fragment>
          ))}
        </ul>
      )}

      {mode === 'table' && (
        <div className="scroll-x rounded-card bg-surface shadow-card">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`${c.align === 'right' ? 'text-right' : ''} ${c.hideBelow ? hideClass[c.hideBelow] : ''}`} aria-sort={sortKey === c.key ? (desc ? 'descending' : 'ascending') : undefined}>
                    {c.sort ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1">
                        {c.label}
                        {sortKey === c.key && (desc ? <ArrowDown className="size-3.5" aria-hidden /> : <ArrowUp className="size-3.5" aria-hidden />)}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
                {actions && <th scope="col" className="col-actions w-px text-right"><span className="sr-only">Aksi</span></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <tr key={rowKey(item)}>
                  {columns.map((c) => (
                    <td key={c.key} className={`${c.align === 'right' ? 'text-right' : ''} ${c.primary ? 'font-semibold' : ''} ${c.hideBelow ? hideClass[c.hideBelow] : ''}`}>
                      {c.render(item)}
                    </td>
                  ))}
                  {actions && (
                    <td className="col-actions text-right">
                      <span className="inline-flex items-center justify-end gap-1.5">{actions(item)}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode === 'compact' && (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {sorted.map((item) => (
            <li key={rowKey(item)} className="flex min-h-11 items-center gap-3 px-4 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-semibold">{primary.render(item)}</span>
              {compactCols.map((c, i) => (
                <span key={c.key} className={`shrink-0 text-muted ${i > 0 ? 'hidden sm:inline' : ''}`}>
                  {c.render(item)}
                </span>
              ))}
              {actions && <span className="flex shrink-0 items-center gap-1.5">{actions(item)}</span>}
            </li>
          ))}
        </ul>
      )}

      {mode === 'grid' && (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => (
            <li key={rowKey(item)} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
              <p className="font-semibold">{primary.render(item)}</p>
              <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                {others.map((c) => (
                  <Fragment key={c.key}>
                    <dt className="text-muted">{c.label}</dt>
                    <dd className="min-w-0 text-right">{c.render(item)}</dd>
                  </Fragment>
                ))}
              </dl>
              {actions && <div className="flex items-center justify-end gap-1.5 border-t border-line pt-3">{actions(item)}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
