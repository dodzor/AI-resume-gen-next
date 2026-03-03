'use client'

import { useState } from 'react'
import { Id } from '@/convex/_generated/dataModel'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { isUnlimited } from '@/lib/plan-limits'
import UpgradeModal from './UpgradeModal'

interface Resume {
  _id: Id<'resumes'>
  _creationTime: number
  name: string
  email: string
  jobTitle?: string
  updatedAt: number
}

interface ResumeSwitcherProps {
  resumes: Resume[] | undefined
  currentResumeId: Id<'resumes'> | null
  onSelectResume: (resumeId: Id<'resumes'>) => void
  onCreateNew: () => void
  isLoading: boolean
}

export default function ResumeSwitcher({
  resumes,
  currentResumeId,
  onSelectResume,
  onCreateNew,
  isLoading
}: ResumeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { canCreateResume, remaining, limits, usage, plan } = useUsageLimits()
  
  const resumeCount = resumes?.length || 0
  const limit = limits.resumes
  const isLimitReached = !isUnlimited(limit) && resumeCount >= limit

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="animate-spin">⏳</span>
        <span>Loading...</span>
      </div>
    )
  }

  const currentResume = resumes?.find(r => r._id === currentResumeId)
  const hasResumes = resumes && resumes.length > 0

  const handleCreateNew = () => {
    if (!canCreateResume || isLimitReached) {
      setShowUpgradeModal(true)
      return
    }
    onCreateNew()
  }

  const formatLimitText = () => {
    if (isUnlimited(limit)) {
      return `${resumeCount} resumes (Unlimited)`
    }
    return `${resumeCount} / ${limit} resumes`
  }

  return (
    <div className="relative">
      {/* Current Resume Display */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Editing:</span>{' '}
          <span className="text-gray-800">{currentResume?.jobTitle || 'New Resume'}</span>
          {' '}
          <span className="text-gray-500">({formatLimitText()})</span>
        </div>
        <div className="flex gap-2">
          {hasResumes && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Switch
            </button>
          )}
          <button
            onClick={handleCreateNew}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center justify-center space-x-1 ${
              isLimitReached
                ? 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isLimitReached ? "Resume limit reached. Upgrade to Pro to create more resumes." : undefined}
          >
            <span>New Resume</span>
            {isLimitReached && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && hasResumes && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Your Resumes
              </div>
              {resumes.map((resume) => {
                const isCurrent = resume._id === currentResumeId
                return (
                  <button
                    key={resume._id}
                    onClick={() => {
                      onSelectResume(resume._id)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{resume.jobTitle || 'Untitled Resume'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(resume.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        action="create_resume"
        plan={plan}
      />
    </div>
  )
}
