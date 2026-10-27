import { PricingTable } from '@clerk/nextjs'
import { SiteHeader } from '@/components/SiteHeader'

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <PricingTable />
      </div>
    </>
  )
}
