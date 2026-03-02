'use client'

import { ReactNode, useState } from 'react'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { useCanPerformAction } from '@/hooks/useUsageLimits'
import type { ActionType } from '@/lib/plan-limits'
import { isUnlimited } from '@/lib/plan-limits'
import UpgradeModal from './UpgradeModal'
import { cn } from '@/lib/utils'

interface UsageGatedButtonProps {
  action: ActionType
  onClick: () => void | Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
  showRemaining?: boolean
  variant?: 'default' | 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Button component that checks usage limits before allowing actions
 * Shows upgrade modal if limit is reached
 */
export default function UsageGatedButton({
  action,
  onClick,
  children,
  className = '',
  disabled: externalDisabled = false,
  showRemaining = true,
  variant = 'default',
  size = 'md',
}: UsageGatedButtonProps) {
  const { plan, isLoading: usageLoading } = useUsageLimits()
  const { allowed, remaining, upgradeRequired, isLoading: actionLoading } = useCanPerformAction(action)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const isLoading = usageLoading || actionLoading

  // Determine if button should be disabled
  const isDisabled = externalDisabled || isLoading || !allowed

  // Get button text with remaining count
  const getButtonText = (): ReactNode => {
    if (isLoading) {
      return 'Loading...'
    }

    if (!showRemaining) {
      return children
    }

    // If unlimited, show "Unlimited" or just the children
    if (isUnlimited(remaining) || remaining === -1) {
      return (
        <>
          {children}
          <span className="ml-1 text-xs opacity-75">(Unlimited)</span>
        </>
      )
    }

    // If limit reached, show children with upgrade hint
    if (!allowed && upgradeRequired) {
      return (
        <>
          {children}
          <span className="ml-1 text-xs opacity-75">(Upgrade required)</span>
        </>
      )
    }

    // Show remaining count
    return (
      <>
        {children}
        {remaining > 0 && (
          <span className="ml-1 text-xs opacity-75">({remaining} left)</span>
        )}
      </>
    )
  }

  // Handle button click
  const handleClick = async () => {
    if (isDisabled) {
      // If limit reached, show upgrade modal
      if (!allowed && upgradeRequired) {
        setShowUpgradeModal(true)
      }
      return
    }

    // Execute the action
    await onClick()
  }

  // Get variant classes
  const getVariantClasses = (): string => {
    if (isDisabled) {
      return 'bg-gray-200 text-gray-400 cursor-not-allowed'
    }

    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700'
      case 'secondary':
        return 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      default:
        return 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
    }
  }

  // Get size classes
  const getSizeClasses = (): string => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  // Get tooltip text
  const getTooltipText = (): string | null => {
    if (isLoading) return null
    if (!allowed && upgradeRequired) {
      const actionNames: Record<ActionType, string> = {
        job_analysis: 'job analyses',
        ai_rewrite: 'AI rewrites',
        create_resume: 'resumes',
        export: 'PDF exports',
      }
      return `You've reached your limit for ${actionNames[action]}. Upgrade to Pro for unlimited access.`
    }
    return null
  }

  const tooltipText = getTooltipText()

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          'rounded-lg font-medium transition-colors flex items-center justify-center',
          getVariantClasses(),
          getSizeClasses(),
          className
        )}
        title={tooltipText || undefined}
      >
        {getButtonText()}
      </button>

      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          action={action}
          plan={plan}
        />
      )}
    </>
  )
}
