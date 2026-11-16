import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'

const soon = (title: string, phase: string) => <PlaceholderPage title={title} phase={phase} />

export const router = createBrowserRouter([
  { path: '/sign-in', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'orders', element: soon('Pesanan', 'Fase 1') },
      { path: 'orders/new', element: soon('Pesanan Baru', 'Fase 1') },
      { path: 'customers', element: soon('Pelanggan', 'Fase 1') },
      { path: 'services', element: soon('Layanan & Harga', 'Fase 1') },
      { path: 'inventory', element: soon('Stok', 'Fase 2') },
      { path: 'cashbook', element: soon('Buku Kas', 'Fase 2') },
      { path: 'reports', element: soon('Laporan', 'Fase 2') },
      { path: 'requests/review', element: soon('Pengajuan', 'Fase 2') },
      { path: 'employees', element: soon('Tim', 'Fase 2') },
      { path: 'settings/shop', element: soon('Pengaturan', 'Fase 2') },
      { path: '*', element: soon('Halaman tidak ditemukan', '-') },
    ],
  },
])
