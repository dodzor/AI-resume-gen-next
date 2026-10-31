'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { OFFER, type ActionType, type PlanTier } from '@/lib/plan-limits'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  action?: ActionType
  plan?: PlanTier
  message?: string
}

/**
 * Modal component for upgrade prompts
 * Shows when user reaches usage limits or tries to access Pro features
 */
export default function UpgradeModal({
  isOpen,
  onClose,
  action,
  plan = 'free',
  message,
}: UpgradeModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen || !mounted) return null

  // Get context-specific message
  const getMessage = (): string => {
    if (message) return message

    if (action === 'create_resume' && plan === 'free') {
      return `The free plan includes one tailored resume. This search is ${OFFER.searchPrice} for ${OFFER.paidApplications} applications over ${OFFER.searchDays} days.`
    }
    if (action === 'create_resume') {
      return `You've used all ${OFFER.paidApplications} applications for this period.`
    }
    if (action === 'export') {
      return 'PDF export is included with the free resume. If this is still blocked, the pricing page has the next step.'
    }
    if (action) {
      return "You've reached the limit on this plan. This search covers the next applications."
    }

    return `This search is ${OFFER.searchPrice} for ${OFFER.paidApplications} tailored applications over ${OFFER.searchDays} days. ${OFFER.monthlyPrice}/month if the search runs longer.`
  }

  const features = [
    `${OFFER.paidApplications} tailored applications`,
    'PDF export included',
    `${OFFER.searchDays} days, or monthly if you are still looking`,
  ]

  const title = plan === 'free' ? 'Tailor the next jobs' : 'Application limit reached'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet on phones, centered dialog from sm up */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:mx-4 sm:max-w-md sm:rounded-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 sm:p-6">
          <h2 id="upgrade-modal-title" className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 active:bg-gray-100"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Message */}
          <p className="text-gray-700 mb-6">{getMessage()}</p>

          {/* Feature List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              This search includes:
            </h3>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
              onClick={onClose}
            >
              See pricing
            </Link>
            <button
              onClick={onClose}
              className="min-h-11 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
