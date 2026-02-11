'use client'

import { useState } from 'react'
import { Id } from '@/convex/_generated/dataModel'

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

  // Hide component if there's no current resume
  if (!currentResume) {
    return null
  }

  return (
    <div className="relative">
      {/* Current Resume Display */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Editing:</span>{' '}
          <span className="text-gray-800">{currentResume.jobTitle || 'Untitled Resume'}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors"
          >
            Switch
          </button>
          <button
            onClick={onCreateNew}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            New Resume
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
    </div>
  )
}
