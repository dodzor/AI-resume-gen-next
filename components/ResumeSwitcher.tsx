'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Id } from '@/convex/_generated/dataModel'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import { isUnlimited } from '@/lib/plan-limits'
import UpgradeModal from './UpgradeModal'
import { features } from '@/config/features'
import { applicationResumes } from '@/lib/applicationResumes'

interface Resume {
  _id: Id<'resumes'>
  _creationTime: number
  name: string
  email: string
  jobTitle?: string
  updatedAt: number
  kind?: 'master' | 'tailored'
  masterResumeId?: Id<'resumes'>
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
  const { canCreateResume, limits, plan, isLoading: usageLoading } = useUsageLimits()

  const master = resumes?.find((resume) => resume.kind === 'master')
  const applications = applicationResumes(resumes ?? [])
  const applicationCount = applications.length
  const limit = limits.resumes
  const isLimitReached = !usageLoading && (!canCreateResume || (!isUnlimited(limit) && applicationCount >= limit))

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="animate-spin">⏳</span>
        <span>Loading...</span>
      </div>
    )
  }

  const currentResume = resumes?.find(r => r._id === currentResumeId)
  const currentLabel = features.careerRecord && currentResume?.kind === 'master'
    ? 'Career record'
    : (currentResume?.jobTitle || 'New application')

  const handleCreateApplication = () => {
    if (isLimitReached) {
      setShowUpgradeModal(true)
      return
    }
    if (!master) {
      if (features.careerRecord) onOpenMaster()
      else onCreateApplication()
      return
    }
    onCreateApplication()
  }

  const handleDelete = async (resume: Resume) => {
    const isApplication = applications.some((item) => item._id === resume._id)
    if (isApplication && !features.deleteApplication) return
    const title = features.careerRecord && resume.kind === 'master'
      ? 'Career record'
      : (resume.jobTitle || 'Untitled application')
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

  const renderRow = (resume: Resume, allowDelete: boolean) => {
    const isCurrent = resume._id === currentResumeId
    const title = features.careerRecord && resume.kind === 'master'
      ? 'Career record'
      : (resume.jobTitle || 'Untitled application')
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
          className={`min-h-11 min-w-0 flex-1 px-3 py-2 text-left ${isCurrent ? 'text-blue-700' : 'text-gray-700'}`}
        >
          <div className="font-medium truncate">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {features.careerRecord && resume.kind === 'master'
              ? 'Not exported'
              : new Date(resume.updatedAt).toLocaleDateString()}
          </div>
        </button>
        {allowDelete && (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          title="Delete"
          disabled={deletingId !== null}
          onClick={() => { void handleDelete(resume) }}
          className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 active:bg-red-100 disabled:opacity-50"
        >
          {isDeleting ? (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
        )}
      </div>
    )
  }

  const actionButton =
    'inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm transition-colors md:min-h-0 md:py-1.5'

  return (
    <div className="relative w-full sm:w-auto">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
        <p className="min-w-0 text-sm text-gray-600">
          <span className="font-medium">Editing</span>
          <span className="mt-0.5 block truncate text-gray-800 sm:ml-1 sm:inline">{currentLabel}</span>
          <span className="mt-0.5 block text-xs text-gray-500 sm:ml-1 sm:inline sm:text-sm">({formatLimitText()})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {(resumes?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className={`${actionButton} min-w-[calc(50%-0.25rem)] flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 sm:min-w-0 sm:flex-none`}
          >
              Switch
            </button>
          )}
          {features.careerRecord && (
          <button
            type="button"
            onClick={onOpenMaster}
            className={`${actionButton} min-w-[calc(50%-0.25rem)] flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 sm:min-w-0 sm:flex-none`}
          >
            Career record
          </button>
          )}
          {features.discoverJobs && (
          <Link
            href="/discover"
            className={`${actionButton} min-w-[calc(50%-0.25rem)] flex-1 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 sm:min-w-0 sm:flex-none`}
          >
            Discover jobs
          </Link>
          )}
          <button
            type="button"
            onClick={handleCreateApplication}
            className={`${actionButton} w-full sm:w-auto ${
              isLimitReached
                ? 'bg-gray-200 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
            title={isLimitReached ? 'Application limit reached.' : features.careerRecord ? 'Copy evidence from the career record' : 'Start a new application'}
          >
            New application
          </button>
        </div>
      </div>

      {isOpen && (resumes?.length ?? 0) > 0 && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[min(24rem,70dvh)] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg sm:inset-x-auto sm:right-0 sm:w-80">
            <div className="p-2">
              {features.careerRecord && master && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Career record</div>
                  {renderRow(master, true)}
                </>
              )}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Applications</div>
              {applications.length === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">{features.careerRecord ? 'No applications yet. New application copies the career record.' : 'No applications yet.'}</p>
              )}
              {applications.map((resume) => renderRow(resume, features.deleteApplication))}
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
