import { Link } from 'react-router'
import { Card } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold sm:text-3xl">Halaman tidak ditemukan</h1>
      <Card>
        <p className="font-semibold">Alamat yang kamu buka tidak ada.</p>
        <p className="mt-1 text-sm text-muted">Periksa alamatnya, atau kembali ke Beranda.</p>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex h-11 items-center rounded-full bg-sidebar px-6 text-sm font-bold text-white hover:bg-sidebar-hover"
        >
          Ke Beranda
        </Link>
      </Card>
    </div>
  )
}
