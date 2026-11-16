import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/app/AppShell'
import { AttendancePage } from '@/pages/AttendancePage'
import { AuditPage } from '@/pages/AuditPage'
import { BusinessManagePage } from '@/pages/BusinessManagePage'
import { BusinessSelectorPage } from '@/pages/BusinessSelectorPage'
import { CashbookPage } from '@/pages/CashbookPage'
import { CustomerDetailPage } from '@/pages/CustomerDetailPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { DashboardRoute } from '@/pages/DashboardRoute'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { LoginPage } from '@/pages/LoginPage'
import { MyAttendancePage } from '@/pages/MyAttendancePage'
import { MyRequestsPage } from '@/pages/MyRequestsPage'
import { MyShiftsPage } from '@/pages/MyShiftsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { OrderNewPage } from '@/pages/OrderNewPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { PayrollPage } from '@/pages/PayrollPage'
import { PaymentReportPage } from '@/pages/PaymentReportPage'
import { PosCashierPage } from '@/pages/PosCashierPage'
import { PosHomePage } from '@/pages/PosHomePage'
import { PosProductsPage } from '@/pages/PosProductsPage'
import { ProjectsPage } from '@/pages/ProjectsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { RequestNewPage } from '@/pages/RequestNewPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ShiftsPage } from '@/pages/ShiftsPage'

export const router = createBrowserRouter([
  { path: '/sign-in', element: <LoginPage /> },
  { path: '/businesses', element: <BusinessSelectorPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardRoute /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/new', element: <OrderNewPage /> },
      { path: 'orders/:orderId', element: <OrderDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:customerId', element: <CustomerDetailPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'cashbook', element: <CashbookPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/payments', element: <PaymentReportPage /> },
      { path: 'requests/review', element: <RequestsPage /> },
      { path: 'requests/new', element: <RequestNewPage /> },
      { path: 'requests/me', element: <MyRequestsPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'shifts', element: <ShiftsPage /> },
      { path: 'shifts/me', element: <MyShiftsPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'attendance/me', element: <MyAttendancePage /> },
      { path: 'payroll', element: <PayrollPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'businesses/manage', element: <BusinessManagePage /> },
      { path: 'settings/shop', element: <SettingsPage /> },
      { path: 'pos', element: <PosHomePage /> },
      { path: 'pos/cashier', element: <PosCashierPage /> },
      { path: 'pos/products', element: <PosProductsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
