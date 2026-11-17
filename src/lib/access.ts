// Akses berdasarkan peran dan jenis usaha. Ini hanya kenyamanan tampilan:
// otorisasi sebenarnya harus ditegakkan backend (lihat PRD bagian 4).

export type Role = 'owner' | 'employee'
export type BusinessKind = 'laundry' | 'beverage'

export interface BusinessLike {
  id: string
  name: string
  kind: BusinessKind
  active: boolean
}

export interface MemberLike {
  businessId: string
  employeeId: string
  active: boolean
}

/**
 * Usaha aktif yang boleh dipilih. Owner melihat semua usaha aktif.
 * Karyawan hanya usaha yang keanggotaannya aktif.
 */
export function accessibleBusinesses(
  businesses: BusinessLike[],
  members: MemberLike[],
  role: Role,
  employeeId?: string,
): BusinessLike[] {
  const active = businesses.filter((b) => b.active)
  if (role === 'owner') return active
  if (!employeeId) return []
  const allowed = new Set(members.filter((m) => m.employeeId === employeeId && m.active).map((m) => m.businessId))
  return active.filter((b) => allowed.has(b.id))
}

const common = ['/notifications']

/** Halaman khusus karyawan. Owner tidak membukanya walau awalan path-nya cocok dengan halaman owner. */
const employeeOnly = ['/requests/me', '/attendance/me', '/shifts/me']

const allowed: Record<string, string[]> = {
  'owner:laundry': [
    '/dashboard',
    '/orders',
    '/customers',
    '/services',
    '/inventory',
    '/cashbook',
    '/reports',
    '/requests',
    '/employees',
    '/attendance',
    '/shifts',
    '/payroll',
    '/projects',
    '/audit',
    '/trash',
    '/settings',
    '/businesses/manage',
    ...common,
  ],
  'employee:laundry': [
    '/dashboard',
    '/orders',
    '/customers',
    '/services',
    '/inventory',
    '/reports/payments',
    '/requests/me',
    '/requests/new',
    '/attendance/me',
    '/shifts/me',
    ...common,
  ],
  'owner:beverage': ['/dashboard', '/pos', ...common],
  'employee:beverage': ['/dashboard', '/pos', ...common],
}

/** Apakah peran dan jenis usaha ini boleh membuka path. Cocok per segmen, bukan per awalan teks. */
export function canOpen(path: string, role: Role, kind: BusinessKind): boolean {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/'
  if (role === 'owner' && employeeOnly.some((p) => clean === p || clean.startsWith(`${p}/`))) return false
  return (allowed[`${role}:${kind}`] ?? []).some((p) => clean === p || clean.startsWith(`${p}/`))
}

export interface NavEntry {
  to: string
  label: string
  group: string
}

const laundryOwnerNav: NavEntry[] = [
  { to: '/dashboard', label: 'Beranda', group: 'Ringkasan' },
  { to: '/orders', label: 'Pesanan', group: 'Operasional' },
  { to: '/customers', label: 'Pelanggan', group: 'Operasional' },
  { to: '/services', label: 'Layanan & Harga', group: 'Operasional' },
  { to: '/inventory', label: 'Stok', group: 'Operasional' },
  { to: '/projects', label: 'Proyek', group: 'Operasional' },
  { to: '/requests/review', label: 'Pengajuan', group: 'Tim' },
  { to: '/employees', label: 'Tim', group: 'Tim' },
  { to: '/shifts', label: 'Jadwal Shift', group: 'Tim' },
  { to: '/attendance', label: 'Absensi', group: 'Tim' },
  { to: '/cashbook', label: 'Buku Kas', group: 'Keuangan' },
  { to: '/payroll', label: 'Gaji & Insentif', group: 'Keuangan' },
  { to: '/reports', label: 'Laporan', group: 'Keuangan' },
  { to: '/audit', label: 'Audit', group: 'Kontrol' },
  { to: '/trash', label: 'Sampah', group: 'Kontrol' },
  { to: '/businesses/manage', label: 'Kelola Usaha', group: 'Kontrol' },
  { to: '/settings/shop', label: 'Pengaturan', group: 'Kontrol' },
]

const laundryEmployeeNav: NavEntry[] = [
  { to: '/dashboard', label: 'Beranda', group: 'Ringkasan' },
  { to: '/orders', label: 'Pesanan', group: 'Pekerjaan' },
  { to: '/customers', label: 'Pelanggan', group: 'Pekerjaan' },
  { to: '/services', label: 'Layanan & Harga', group: 'Pekerjaan' },
  { to: '/inventory', label: 'Stok', group: 'Pekerjaan' },
  { to: '/attendance/me', label: 'Absensi', group: 'Saya' },
  { to: '/shifts/me', label: 'Jadwal Saya', group: 'Saya' },
  { to: '/requests/me', label: 'Pengajuan Saya', group: 'Saya' },
  { to: '/reports/payments', label: 'Laporan Pembayaran', group: 'Saya' },
]

const beverageNav: NavEntry[] = [
  { to: '/pos', label: 'Ringkasan', group: 'POS' },
  { to: '/pos/cashier', label: 'Kasir', group: 'POS' },
  { to: '/pos/products', label: 'Produk', group: 'POS' },
]

export function navFor(role: Role, kind: BusinessKind): NavEntry[] {
  if (kind === 'beverage') return beverageNav
  return role === 'owner' ? laundryOwnerNav : laundryEmployeeNav
}

/** Halaman awal setelah memilih usaha. */
export function homeFor(kind: BusinessKind): string {
  return kind === 'beverage' ? '/pos' : '/dashboard'
}
