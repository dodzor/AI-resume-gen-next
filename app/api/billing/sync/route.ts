import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { syncSignedInBillingPlan } from '@/lib/api-usage'

export async function POST() {
  const authResult = await requireAuth()
  if ('error' in authResult) return authResult.error

  try {
    const plan = await syncSignedInBillingPlan(authResult.userId)
    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Billing sync failed:', error)
    return NextResponse.json({ error: 'Could not sync the plan' }, { status: 500 })
  }
}
