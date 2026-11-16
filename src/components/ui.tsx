import type { ComponentType, ReactNode } from 'react'
import type { Tone } from '@/data/mock'

const toneClass: Record<Tone, string> = {
  peach: 'bg-peach',
  lilac: 'bg-lilac',
  lime: 'bg-lime-soft',
  cream: 'bg-cream',
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
