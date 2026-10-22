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
  kind?: 'master' | 'tailored'
}

interface ResumeSwitcherProps {
  resumes: Resume[] | undefined
  currentResumeId: Id<'resumes'> | null
  onSelectResume: (resumeId: Id<'resumes'>) => void
  onDeleteResume: (resumeId: Id<'resumes'>) => Promise<void>
  onOpenMaster: () => void
  onCreateApplication: () => void
  isLoading: boolean
}

export default function ResumeSwitcher({
  resumes,
  currentResumeId,
  onSelectResume,
  onDeleteResume,
  onOpenMaster,
  onCreateApplication,
  isLoading
}: ResumeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<Id<'resumes'> | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { canCreateResume, limits, plan } = useUsageLimits()

  const master = resumes?.find((resume) => resume.kind === 'master')
  const applications = resumes?.filter((resume) => resume.kind !== 'master') ?? []
  const applicationCount = applications.length
  const limit = limits.resumes
  const isLimitReached = !canCreateResume || (!isUnlimited(limit) && applicationCount >= limit)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="animate-spin">⏳</span>
        <span>Loading...</span>
      </div>
    )
  }

  const currentResume = resumes?.find(r => r._id === currentResumeId)
  const currentLabel = currentResume?.kind === 'master'
    ? 'Career record'
    : (currentResume?.jobTitle || 'New application')

  const handleCreateApplication = () => {
    if (!master) {
      onOpenMaster()
      return
    }
    if (isLimitReached) {
      setShowUpgradeModal(true)
      return
    }
    onCreateApplication()
  }

  const handleDelete = async (resume: Resume) => {
    const title = resume.kind === 'master' ? 'Career record' : (resume.jobTitle || 'Untitled application')
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return

    setDeletingId(resume._id)
    try {
      await onDeleteResume(resume._id)
      if ((resumes?.length ?? 0) <= 1) setIsOpen(false)
    } catch {
      // Parent surfaces the error.
    } finally {
      setDeletingId(null)
    }
  }

  const formatLimitText = () => {
    if (isUnlimited(limit)) return `${applicationCount} applications (Unlimited)`
    return `${applicationCount} / ${limit} applications`
  }

  const renderRow = (resume: Resume) => {
    const isCurrent = resume._id === currentResumeId
    const title = resume.kind === 'master' ? 'Career record' : (resume.jobTitle || 'Untitled application')
    const isDeleting = deletingId === resume._id
    return (
      <div
        key={resume._id}
        className={`flex items-center rounded-md transition-colors ${isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
      >
        <button
          type="button"
          onClick={() => {
            onSelectResume(resume._id)
            setIsOpen(false)
          }}
          className={`min-w-0 flex-1 text-left px-3 py-2 ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}
        >
          <div className="font-medium truncate">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {resume.kind === 'master' ? 'Not exported' : new Date(resume.updatedAt).toLocaleDateString()}
          </div>
        </button>
        <button
          type="button"
          aria-label={`Delete ${title}`}
          title="Delete"
          disabled={deletingId !== null}
          onClick={() => { void handleDelete(resume) }}
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
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Editing:</span>{' '}
          <span className="text-gray-800">{currentLabel}</span>
          {' '}
          <span className="text-gray-500">({formatLimitText()})</span>
        </div>
        <div className="flex gap-2">
          {(resumes?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
          >
              Switch
            </button>
          )}
          <button
            type="button"
            onClick={onOpenMaster}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            Career record
          </button>
          <button
            type="button"
            onClick={handleCreateApplication}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              isLimitReached && master
                ? 'bg-gray-200 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={isLimitReached && master ? 'Application limit reached.' : 'Copy evidence from the career record'}
          >
            New application
          </button>
          <Link
            href="/discover"
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Discover jobs
          </Link>
        </div>
      </div>

      {isOpen && (resumes?.length ?? 0) > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {master && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Career record</div>
                  {renderRow(master)}
                </>
              )}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Applications</div>
              {applications.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">No applications yet. New application copies the career record.</p>
              )}
              {applications.map(renderRow)}
            </div>
          </div>
        </>
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        action="create_resume"
        plan={plan}
      />
    </div>
  )
}
