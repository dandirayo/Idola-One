import type { ComponentType, ReactNode } from 'react'
export type Tone = 'peach' | 'lilac' | 'lime' | 'cream'

const toneClass: Record<Tone, string> = {
  peach: 'bg-peach',
  lilac: 'bg-lilac',
  lime: 'bg-lime-soft',
  cream: 'bg-cream',
}

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-sm outline-none placeholder:text-muted focus:border-ink'

export const primaryButton =
  'inline-flex h-11 items-center justify-center rounded-full bg-sidebar px-6 text-sm font-bold text-white hover:bg-sidebar-hover disabled:opacity-60'

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

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card bg-surface p-5 shadow-card ${className}`}>{children}</section>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {action}
    </div>
  )
}

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
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${toneClass[tone]}`}
    >
      {label}
    </span>
  )
}
