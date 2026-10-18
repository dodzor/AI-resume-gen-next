'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  onDeleteResume: (resumeId: Id<'resumes'>) => Promise<void>
  onCreateNew: () => void
  isLoading: boolean
}

export default function ResumeSwitcher({
  resumes,
  currentResumeId,
  onSelectResume,
  onDeleteResume,
  onCreateNew,
  isLoading
}: ResumeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<Id<'resumes'> | null>(null)
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

  const handleDelete = async (resume: Resume) => {
    const title = resume.jobTitle || 'Untitled Resume'
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) {
      return
    }

    setDeletingId(resume._id)
    try {
      await onDeleteResume(resume._id)
      if ((resumes?.length ?? 0) <= 1) {
        setIsOpen(false)
      }
    } catch {
      // Parent surfaces the error.
    } finally {
      setDeletingId(null)
    }
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
          <Link
            href="/discover"
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Discover jobs
          </Link>
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
                const title = resume.jobTitle || 'Untitled Resume'
                const isDeleting = deletingId === resume._id
                return (
                  <div
                    key={resume._id}
                    className={`flex items-center rounded-md transition-colors ${
                      isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectResume(resume._id)
                        setIsOpen(false)
                      }}
                      className={`min-w-0 flex-1 text-left px-3 py-2 ${
                        isCurrent ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium truncate">{title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(resume.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${title}`}
                      title="Delete resume"
                      disabled={deletingId !== null}
                      onClick={() => {
                        void handleDelete(resume)
                      }}
                      className="mr-1 shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
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
