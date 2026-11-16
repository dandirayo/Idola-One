import { Card } from '@/components/ui'

export function PlaceholderPage({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      <Card>
        <p className="font-semibold">Halaman ini belum dibuat.</p>
        <p className="mt-1 text-sm text-muted">Dijadwalkan pada {phase} (lihat docs/03-IMPLEMENTATION-PLAN.md).</p>
      </Card>
    </div>
  )
}
