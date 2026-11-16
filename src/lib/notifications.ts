// Notifikasi dalam aplikasi (NTF-01, NTF-02).

export type Audience = 'owner' | 'employee'

export interface NotificationLike {
  audience: Audience
  /** Bila diisi, hanya untuk karyawan dengan nama ini. Kosong berarti untuk semua pada audiens itu. */
  forName?: string
}

/**
 * Tautan notifikasi hanya boleh ke route di dalam aplikasi. Tautan ke luar,
 * skema lain (javascript:), atau jalur ganda (//) diganti ke Beranda.
 */
export function safeInternalPath(link: string | undefined | null): string {
  if (!link) return '/dashboard'
  if (!/^\/[A-Za-z0-9\-_./?=&%]*$/.test(link) || link.startsWith('//') || link.includes('..')) return '/dashboard'
  return link
}

/** Apakah notifikasi ini untuk sesi tersebut. */
export function isVisibleTo(n: NotificationLike, session: { role: Audience; name: string }): boolean {
  if (n.audience !== session.role) return false
  if (session.role === 'owner') return true
  return !n.forName || n.forName === session.name
}
