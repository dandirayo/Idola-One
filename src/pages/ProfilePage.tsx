import { useState, type FormEvent } from 'react'
import { Card, Hint, inputClass, primaryButton, SectionTitle } from '@/components/ui'
import { updateEmployeeProfile, updateShop, useStore } from '@/data/store'
import { useAuth } from '@/lib/auth'

/**
 * Profil pengguna. Karyawan mengubah nama dan nomor HP sendiri. Owner mengatur nomor
 * WhatsApp yang menerima laporan pembayaran. Nama owner belum bisa diubah di sini karena
 * identitas login baru ada setelah backend tersedia.
 */
export function ProfilePage() {
  const { session } = useAuth()
  const employees = useStore((s) => s.employees)
  const shop = useStore((s) => s.shop)
  const me = employees.find((e) => e.id === session?.employeeId)

  const [name, setName] = useState(me?.name ?? session?.name ?? '')
  const [phone, setPhone] = useState(session?.role === 'owner' ? (shop.ownerPhone ?? '') : (me?.phone ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!session) return null
  const isOwner = session.role === 'owner'

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      if (isOwner) {
        const digits = phone.replace(/\D/g, '')
        if (digits && digits.length < 9) throw new Error('Nomor telepon tidak valid.')
        updateShop({ ownerPhone: digits })
      } else if (me) {
        updateEmployeeProfile(me.id, name, phone)
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.')
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">Profil</h1>
      <Hint>Perubahan tersimpan di browser ini sampai backend tersedia.</Hint>

      <Card className="max-w-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-full bg-lilac text-xl font-bold">{session.name.charAt(0)}</span>
          <div>
            <p className="text-lg font-bold">{session.name}</p>
            <p className="text-sm text-muted">{isOwner ? 'Owner' : (me?.position ?? 'Karyawan')}</p>
          </div>
        </div>

        <SectionTitle>{isOwner ? 'Penerima laporan pembayaran' : 'Data saya'}</SectionTitle>
        <form onSubmit={submit} noValidate className="space-y-4">
          {!isOwner && (
            <label className="block text-sm font-semibold">
              Nama
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
          )}
          <label className="block text-sm font-semibold">
            {isOwner ? 'Nomor WhatsApp owner' : 'Nomor HP'}
            <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} mt-1.5`} />
            {isOwner && <span className="mt-1 block text-xs font-normal text-muted">Draf Laporan Pembayaran dikirim ke nomor ini. Kosong: memakai telepon toko.</span>}
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {error}
            </p>
          )}
          {saved && <p className="text-sm font-semibold text-success">Tersimpan.</p>}
          <button type="submit" className={primaryButton}>
            Simpan
          </button>
        </form>
      </Card>
    </div>
  )
}
