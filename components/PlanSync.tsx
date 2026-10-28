'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'

/**
 * Clerk checkout updates billing immediately. The usage record follows on load,
 * including when the webhook has not reached this deployment yet.
 */
export function PlanSync() {
  const { isSignedIn, userId } = useAuth()

  useEffect(() => {
    if (!isSignedIn || !userId) return
    let cancelled = false
    const sync = () => {
      if (cancelled) return
      void fetch('/api/billing/sync', { method: 'POST' }).catch((error) => {
        console.error('Plan sync failed', error)
      })
    }
    sync()
    const retry = window.setTimeout(sync, 2500)
    return () => {
      cancelled = true
      window.clearTimeout(retry)
    }
  }, [isSignedIn, userId])

  return null
}
