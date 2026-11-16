import { Card, SectionTitle, StatusChip } from '@/components/ui'
import { useStore, type Order } from '@/data/store'
import { formatQty, formatRupiah } from '@/lib/format'

/** Insentif per item pada pesanan: nilai, penerima, dan statusnya. */
export function OrderIncentives({ order }: { order: Order }) {
  const employees = useStore((s) => s.employees)
  const incentives = useStore((s) => s.incentives).filter((i) => i.orderId === order.id)
  const withIncentive = order.items.filter((i) => i.incentive && i.incentive.perUnit > 0)
  if (withIncentive.length === 0) return null

  const name = (id: string) => employees.find((e) => e.id === id)?.name ?? id

  return (
    <Card>
      <SectionTitle>Insentif Karyawan</SectionTitle>
      <ul className="space-y-2 text-sm">
        {withIncentive.map((i, idx) => {
          const rec = incentives.find((x) => x.itemName === i.name && x.employeeId === i.incentive!.employeeId)
          const status = rec ? (rec.status === 'paid' ? 'Dibayar' : 'Hak tercatat') : order.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu Siap Diambil'
          return (
            <li key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2">
              <span>
                {i.name} {formatQty(i.qty)} pcs · {formatRupiah(i.incentive!.perUnit)}/pcs
                <span className="block text-xs text-muted">Untuk {name(i.incentive!.employeeId)}</span>
              </span>
              <StatusChip label={status} tone={rec?.status === 'paid' ? 'lime' : rec ? 'cream' : 'lilac'} />
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">Hak tercatat saat Siap Diambil, walau pelanggan belum membayar. Owner membayarnya di Gaji & Insentif.</p>
    </Card>
  )
}
