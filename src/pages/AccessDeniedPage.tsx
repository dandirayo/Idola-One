import { Link } from 'react-router'
import { Card } from '@/components/ui'
import { homeFor, type BusinessKind } from '@/lib/access'

export function AccessDeniedPage({ kind }: { kind: BusinessKind }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">Akses ditolak</h1>
      <Card>
        <p className="font-semibold">Halaman ini tidak tersedia untuk perananmu atau usaha yang sedang dipilih.</p>
        <p className="mt-1 text-sm text-muted">
          Pembatasan ini hanya penyederhanaan tampilan. Di aplikasi sungguhan hak akses ditegakkan oleh server.
        </p>
        <Link
          to={homeFor(kind)}
          className="mt-4 inline-flex h-11 items-center rounded-full bg-sidebar px-6 text-sm font-bold text-white hover:bg-sidebar-hover"
        >
          Ke halaman utama
        </Link>
      </Card>
    </div>
  )
}
