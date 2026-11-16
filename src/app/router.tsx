import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { CashbookPage } from '@/pages/CashbookPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { OrderNewPage } from '@/pages/OrderNewPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { RequestNewPage } from '@/pages/RequestNewPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { SettingsPage } from '@/pages/SettingsPage'

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
      { path: 'requests/review', element: <RequestsPage /> },
      { path: 'requests/new', element: <RequestNewPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'settings/shop', element: <SettingsPage /> },
      { path: '*', element: soon('Halaman tidak ditemukan', '-') },
    ],
  },
])
