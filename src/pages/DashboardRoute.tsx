import { Navigate } from 'react-router'
import { useStore } from '@/data/store'
import { homeFor } from '@/lib/access'
import { useAuth } from '@/lib/auth'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeeHomePage } from '@/pages/EmployeeHomePage'

/** Beranda sesuai peran dan jenis usaha yang dipilih. */
export function DashboardRoute() {
  const { session, businessId } = useAuth()
  const business = useStore((s) => s.businesses).find((b) => b.id === businessId)
  if (!session || !business) return null
  if (business.kind === 'beverage') return <Navigate to={homeFor('beverage')} replace />
  return session.role === 'owner' ? <DashboardPage /> : <EmployeeHomePage />
}
