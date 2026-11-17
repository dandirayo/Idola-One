import { MessageCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Card, Hint, inputClass, SectionTitle } from '@/components/ui'
import { useStore } from '@/data/store'
import { periodLabel, periodRange, type Period } from '@/lib/finance'
import { formatRupiah } from '@/lib/format'
import { paymentMethodLabel, type PaymentMethod } from '@/lib/orders'
import { paymentReport, paymentReportMessage, whatsappUrl } from '@/lib/reports'
import { useAuth } from '@/lib/auth'

const periods: Period[] = ['today', 'yesterday', 'week', 'month']

export function PaymentReportPage() {
  const orders = useStore((s) => s.orders)
  const shop = useStore((s) => s.shop)
  const { session } = useAuth()

  const [period, setPeriod] = useState<Period>('today')
  const range = useMemo(() => periodRange(period), [period])
  const report = useMemo(() => paymentReport(orders, range), [orders, range])

  const message = paymentReportMessage(report, periodLabel[period], session?.name ?? 'Karyawan')
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? message

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Laporan Pembayaran</h1>
        <Link to="/reports" className="text-sm font-semibold text-muted hover:text-ink">
          Kembali ke Laporan
        </Link>
      </div>

      <Hint>Merangkum pembayaran pelanggan pada periode. Kas manual dan pengeluaran tidak termasuk dan ada di Buku Kas.
        Data contoh.</Hint>

      <div className="seg" role="group" aria-label="Periode">
        {periods.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => {
              setPeriod(p)
              setDraft(null)
            }}
            className="seg-item"
          >
            {periodLabel[p]}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card variant="dark">
            <p className="text-xs font-semibold text-lime">Total pembayaran · {periodLabel[period]}</p>
            <p className="mt-1 text-3xl font-bold">{formatRupiah(report.total)}</p>
            <p className="mt-1 text-xs text-white/60">
              {report.count} pembayaran dari {report.orders} nota
            </p>
          </Card>

          <Card>
            <SectionTitle>Per metode</SectionTitle>
            <ul className="space-y-2 text-sm">
              {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
                <li key={m} className="flex justify-between">
                  <span>{paymentMethodLabel[m]}</span>
                  <span className="font-semibold">{formatRupiah(report.byMethod[m])}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-xl bg-canvas p-3 text-xs">
              <strong>Hybrid: {report.hybrid} nota.</strong> Nota yang dibayar Tunai dan Transfer. Nilainya sudah
              termasuk di Tunai dan Transfer di atas, jadi tidak dijumlahkan lagi.
            </p>
          </Card>
        </div>

        <Card>
          <SectionTitle>Draf WhatsApp ke owner</SectionTitle>
          <label className="block text-sm font-semibold">
            Pesan (boleh diubah)
            <textarea
              value={text}
              onChange={(e) => setDraft(e.target.value)}
              rows={9}
              className={`${inputClass} mt-1.5 h-auto p-3.5 font-mono text-xs`}
            />
          </label>
          <a
            href={whatsappUrl(shop.phone, text)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-accent mt-3 w-full"
          >
            <MessageCircle className="size-4" aria-hidden />
            Buka WhatsApp
          </a>
          <p className="mt-2 text-xs text-muted">
            WhatsApp dibuka untuk diperiksa dan dikirim sendiri. Nomor tujuan memakai telepon toko di Pengaturan (di
            aplikasi sungguhan: nomor owner di profil). Bila kosong, kamu memilih chat sendiri.
          </p>
        </Card>
      </div>
    </div>
  )
}
