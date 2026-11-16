import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { CashbookPage } from '@/pages/CashbookPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { OrderNewPage } from '@/pages/OrderNewPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ServicesPage } from '@/pages/ServicesPage'

const soon = (title: string, phase: string) => <PlaceholderPage title={title} phase={phase} />

export const router = createBrowserRouter([
  { path: '/sign-in', element: <LoginPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <OrderNewPage /> },
      { path: 'orders/:orderId', element: <OrderDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'cashbook', element: <CashbookPage /> },
      { path: 'reports', element: soon('Laporan', 'Fase 2') },
      { path: 'requests/review', element: soon('Pengajuan', 'Fase 2') },
      { path: 'employees', element: soon('Tim', 'Fase 2') },
      { path: 'settings/shop', element: soon('Pengaturan', 'Fase 2') },
      { path: '*', element: soon('Halaman tidak ditemukan', '-') },
    ],
  },
])
