'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import type { ActionType, PlanTier } from '@/lib/plan-limits'

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
  if (!isOpen) return null

  // Get context-specific message
  const getMessage = (): string => {
    if (message) return message

    if (action) {
      const actionMessages: Record<ActionType, string> = {
        job_analysis: "You've used all your free job analyses for this month. Upgrade to Pro for unlimited job description analyses.",
        ai_rewrite: "You've used all your free AI rewrites for this month. Upgrade to Pro for unlimited AI-powered rewrites.",
        create_resume: "You've reached your free resume limit. Upgrade to Pro to create multiple resumes.",
        export: "PDF export is available in Pro. Upgrade to download your resume as a professional PDF.",
      }
      return actionMessages[action]
    }

    return "Upgrade to Pro to unlock unlimited features and advanced capabilities."
  }

  // Get feature list based on action
  const getFeatureList = (): string[] => {
    const baseFeatures = [
      'Unlimited job description analyses',
      'Unlimited AI rewrites (bullet points, experience, summaries)',
      'Multiple resumes (up to 10)',
      'PDF export with ATS-friendly formatting',
      'Advanced keyword targeting',
      'Resume version history',
    ]

    if (action === 'export') {
      return [
        'PDF export with professional formatting',
        'ATS-friendly resume formats',
        'Multiple export options',
        ...baseFeatures.filter(f => !f.includes('PDF export')),
      ]
    }

    return baseFeatures
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="p-6">
          {/* Message */}
          <p className="text-gray-700 mb-6">{getMessage()}</p>

          {/* Feature List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Pro Features Include:
            </h3>
            <ul className="space-y-2">
              {getFeatureList().map((feature, index) => (
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
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/pricing"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              onClick={onClose}
            >
              View Pricing & Upgrade
            </Link>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
