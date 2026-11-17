// Peta konsep ke ikon. Satu konsep satu ikon di seluruh aplikasi: bila perlu ikon untuk
// hal yang sudah ada di sini, pakai yang ini, jangan memilih ikon lain.
// Ikon aksi umum (tambah, ubah, hapus, cari, tutup) tetap diimpor langsung dari
// lucide-react dengan pasangan tetap: Plus, Pencil, Trash2, Search, X.
import {
  Banknote,
  Bell,
  BarChart3,
  Briefcase,
  CalendarClock,
  Camera,
  ClipboardList,
  Coffee,
  FlaskConical,
  HandCoins,
  Hourglass,
  Inbox,
  Layers,
  LayoutGrid,
  Package,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  UserCog,
  Users,
  Wallet,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'

export const concept = {
  dashboard: LayoutGrid,
  orders: ClipboardList,
  customers: Users,
  services: Tag,
  stock: Package,
  projects: Briefcase,
  requests: Inbox,
  team: UserCog,
  shifts: CalendarClock,
  attendance: Camera,
  cash: Wallet, // buku kas dan pemasukan
  receivable: Receipt, // tagihan belum lunas dan laporan pembayaran
  payroll: HandCoins, // gaji dan insentif
  payout: Banknote,
  reports: BarChart3,
  audit: ShieldCheck,
  trash: Trash2, // menu Sampah dan tombol Hapus
  business: Store,
  switchBusiness: Repeat,
  settings: Settings,
  notifications: Bell,
  pos: ShoppingCart,
  drinks: Coffee,
  laundry: WashingMachine, // layanan kiloan dan usaha laundry
  pieces: Shirt, // layanan satuan
  mixed: Layers, // kiloan dan satuan sekaligus
  waiting: Hourglass,
  preview: FlaskConical,
} satisfies Record<string, LucideIcon>

// Ikon menu samping berdasarkan alamat halaman.
export const routeIcons: Record<string, LucideIcon> = {
  '/dashboard': concept.dashboard,
  '/orders': concept.orders,
  '/customers': concept.customers,
  '/services': concept.services,
  '/inventory': concept.stock,
  '/projects': concept.projects,
  '/requests/review': concept.requests,
  '/requests/me': concept.requests,
  '/employees': concept.team,
  '/shifts': concept.shifts,
  '/shifts/me': concept.shifts,
  '/attendance': concept.attendance,
  '/attendance/me': concept.attendance,
  '/cashbook': concept.cash,
  '/payroll': concept.payroll,
  '/reports': concept.reports,
  '/reports/payments': concept.receivable,
  '/audit': concept.audit,
  '/trash': concept.trash,
  '/businesses/manage': concept.business,
  '/settings/shop': concept.settings,
  '/pos': concept.dashboard,
  '/pos/cashier': concept.pos,
  '/pos/products': concept.drinks,
}
