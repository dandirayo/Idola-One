import { Search, X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { matches } from '@/lib/search'

export interface SearchOption {
  id: string
  label: string
  /** Teks kecil di kanan (harga, nomor HP). */
  detail?: string
  group?: string
  /** Teks tambahan yang ikut dicari (kategori, satuan). */
  keywords?: (string | undefined)[]
  phones?: string[]
}

/**
 * Pilihan dengan kolom cari (combobox). Cocok untuk daftar panjang seperti katalog
 * layanan dan pelanggan. Keyboard: panah atas/bawah, Enter memilih, Esc menutup.
 * Di HP daftar terbuka selayar penuh agar mudah disentuh.
 */
export function SearchSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  limit = 30,
}: {
  label: string
  placeholder: string
  options: SearchOption[]
  value: string
  onChange: (id: string) => void
  limit?: number
}) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = options.find((o) => o.id === value)

  const results = useMemo(() => {
    const found = options.filter((o) => matches(query, [o.label, o.group, ...(o.keywords ?? [])], o.phones))
    return query.trim() ? found.slice(0, limit) : found
  }, [options, query, limit])

  function choose(o: SearchOption) {
    onChange(o.id)
    setOpen(false)
    setQuery('')
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault()
        choose(results[active])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  let lastGroup: string | undefined
  return (
    <div
      className={
        open
          ? 'relative max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:flex max-sm:flex-col max-sm:bg-surface max-sm:p-4'
          : 'relative'
      }
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false)
          setQuery('')
        }
      }}
    >
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{label}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${id}-${results[active].id}` : undefined}
            value={open ? query : (selected?.label ?? '')}
            placeholder={selected && open ? selected.label : placeholder}
            onFocus={() => {
              setOpen(true)
              setActive(0)
            }}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
              setOpen(true)
            }}
            onKeyDown={onKey}
            className="field field-search"
          />
        </label>
        {open && (
          <button
            type="button"
            className="icon-btn sm:hidden"
            aria-label="Tutup pencarian"
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="scroll-thin z-30 mt-1 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-card max-sm:mt-3 max-sm:flex-1 sm:absolute sm:inset-x-0 sm:max-h-80"
        >
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">Tidak ada yang cocok.</li>}
          {results.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null
            lastGroup = o.group
            return (
              <li key={o.id} role="presentation">
                {header && (
                  <p className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-muted">{header}</p>
                )}
                <div
                  id={`${id}-${o.id}`}
                  role="option"
                  aria-selected={o.id === value}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm ${
                    i === active ? 'bg-lime-soft' : ''
                  } ${o.id === value ? 'font-bold' : ''}`}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  {o.detail && <span className="shrink-0 text-xs text-muted">{o.detail}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
