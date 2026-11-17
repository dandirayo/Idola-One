import { Info } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

export type Tone = 'peach' | 'lilac' | 'lime' | 'cream'

const toneClass: Record<Tone, string> = {
  peach: 'bg-peach',
  lilac: 'bg-lilac',
  lime: 'bg-lime-soft',
  cream: 'bg-cream',
}

/** Kelas bawaan untuk input, select, dan textarea. Lihat src/styles/components.css. */
export const inputClass = 'field'
export const primaryButton = 'btn btn-primary'

export const orderStatusTone: Record<string, Tone> = {
  received: 'cream',
  processing: 'lilac',
  ready: 'lime',
  picked_up: 'peach',
  cancelled: 'peach',
}

export const paymentTone: Record<string, Tone> = {
  unpaid: 'peach',
  partial: 'cream',
  paid: 'lime',
}

/**
 * Kartu. Varian "dark" untuk angka utama (hero) memakai gradien gelap dan teks
 * putih sekaligus, sehingga tidak bisa lagi menghasilkan teks putih di atas putih.
 */
export function Card({
  children,
  className = '',
  variant = 'default',
}: {
  children: ReactNode
  className?: string
  variant?: 'default' | 'dark'
}) {
  const base = variant === 'dark' ? 'card-dark' : 'bg-surface'
  return <section className={`rounded-card p-5 shadow-card ${base} ${className}`}>{children}</section>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  )
}

/** Judul halaman: judul, keterangan, dan aksi yang rata dan turun rapi di layar sempit. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Keterangan kecil dengan ikon info. Menggantikan banner berwarna di tiap halaman. */
export function Hint({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`hint ${className}`}>
      <Info aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/** Angka ringkasan. Varian "hero" menonjolkan angka yang paling penting pada halaman. */
export function StatCard({
  label,
  value,
  hint,
  variant = 'default',
  className = '',
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  variant?: 'default' | 'hero'
  className?: string
}) {
  const hero = variant === 'hero'
  return (
    <Card variant={hero ? 'dark' : 'default'} className={`flex flex-col justify-center ${hero ? 'p-5' : 'p-4'} ${className}`}>
      <p className={`text-xs font-semibold ${hero ? 'stat-label' : 'text-muted'}`}>{label}</p>
      <p className={`mt-1 font-bold leading-tight ${hero ? 'text-3xl' : 'text-xl'}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${hero ? 'text-white/65' : 'text-muted'}`}>{hint}</p>}
    </Card>
  )
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </Card>
  )
}

/** Kotak ikon seragam: 40px, sudut 12px, ikon 20px. */
export function IconChip({
  icon: Icon,
  tone,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone: Tone
}) {
  return (
    <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`chip ${toneClass[tone]}`}
    >
      {label}
    </span>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// Input jam 24 jam yang tampil sama di semua browser (input type=time mengikuti locale perangkat).
export function TimeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hh = '00', mm = '00'] = value.split(':')
  const minutes = MINUTES.includes(mm) ? MINUTES : [...MINUTES, mm].sort()
  return (
    <span className="mt-1.5 flex items-center gap-2">
      <select aria-label="Jam" value={hh} onChange={(e) => onChange(`${e.target.value}:${mm}`)} className={inputClass}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden className="font-bold">
        :
      </span>
      <select aria-label="Menit" value={mm} onChange={(e) => onChange(`${hh}:${e.target.value}`)} className={inputClass}>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </span>
  )
}
