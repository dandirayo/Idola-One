import { RefreshCw, Unplug } from 'lucide-react'
import { useEffect } from 'react'
import { Card, SectionTitle } from '@/components/ui'
import { importCustomers, isSeedCustomer, useStore } from '@/data/store'
import { connectGoogle, disconnectGoogle, shouldAutoSync, syncContacts, useGoogleStatus } from '@/lib/google-contacts'

const time = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Sinkron pelanggan dengan Google Contacts (seperti tombol sinkron kontak di aplikasi
 * Android). Pelanggan contoh bawaan pratinjau tidak ikut dikirim.
 */
export function GoogleContactsCard() {
  const customers = useStore((s) => s.customers)
  const g = useGoogleStatus()
  const own = customers.filter((c) => c.active && !isSeedCustomer(c.id))

  const run = (full: boolean) => syncContacts(own, importCustomers, full).catch(() => undefined)

  // Sinkron otomatis saat halaman dibuka (paling sering sekali per 2 menit): hanya membuat kontak yang belum ada.
  useEffect(() => {
    if (shouldAutoSync()) void syncContacts(own, importCustomers, false).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.connected])

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionTitle>Google Contacts</SectionTitle>
          {!g.configured ? (
            <p className="text-sm text-muted">
              Belum dikonfigurasi. Isi <code>VITE_GOOGLE_CLIENT_ID</code> sesuai panduan <code>docs/07-GOOGLE-CONTACTS.md</code>.
            </p>
          ) : g.connected ? (
            <p className="text-sm">
              Terhubung{g.account ? <> sebagai <strong>{g.account}</strong></> : null}. Pelanggan baru langsung dikirim dengan akhiran
              " CS".
            </p>
          ) : (
            <p className="text-sm text-muted">
              Hubungkan akun Google toko agar pelanggan tersimpan sebagai kontak (nama + " CS") dan kontak Google bisa diimpor.
            </p>
          )}
          {g.lastSync && g.lastResult && (
            <p className="mt-1 text-xs text-muted">
              Sinkron terakhir {time.format(new Date(g.lastSync))}: {g.lastResult.imported} diimpor, {g.lastResult.created} dibuat di Google,{' '}
              {g.lastResult.renamed} nama disamakan, {g.lastResult.skipped} dilewati.
            </p>
          )}
          {g.error && (
            <p role="alert" className="mt-1 text-sm font-medium text-danger">
              {g.error}
            </p>
          )}
        </div>
        {g.configured && (
          <div className="flex flex-wrap gap-2">
            {g.connected ? (
              <>
                <button type="button" onClick={() => void run(true)} disabled={g.busy} className="btn btn-primary">
                  <RefreshCw className={`size-4 ${g.busy ? 'animate-spin' : ''}`} aria-hidden />
                  {g.busy ? 'Menyinkron…' : 'Sinkron sekarang'}
                </button>
                <button type="button" onClick={disconnectGoogle} disabled={g.busy} className="btn btn-secondary">
                  <Unplug className="size-4" aria-hidden />
                  Putuskan
                </button>
              </>
            ) : (
              <button type="button" onClick={() => void connectGoogle().catch(() => undefined)} disabled={g.busy} className="btn btn-accent">
                {g.busy ? 'Menghubungkan…' : 'Hubungkan Google'}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
