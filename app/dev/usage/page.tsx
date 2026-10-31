import { notFound } from 'next/navigation'
import { features } from '@/config/features'
import { UsageDashboard } from './dashboard'

export const dynamic = 'force-dynamic'

export default function UsageDashboardPage() {
  if (!features.usageDashboard) {
    notFound()
  }

  return <UsageDashboard />
}
