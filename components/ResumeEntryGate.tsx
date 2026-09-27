'use client'

import { useEffect, useState } from 'react'
import type { ResumeImportPayload } from '@/lib/resumeImportSchema'
import type { ResumeMergeMode } from '@/lib/mergeResumeImport'

export type ResumeEntryPhase = 'choose' | 'import_upload' | 'import_review'

interface ResumeEntryGateProps {
  phase: ResumeEntryPhase
  onPhaseChange: (phase: ResumeEntryPhase) => void
  resumeImportText: string
  resumeImportFileName: string
  onPdfParsed: (text: string, fileName: string, pageCount?: number) => void
  onClearImport: () => void
  onStartFresh: () => void
  onFinishImport: (data: ResumeImportPayload, mode: ResumeMergeMode) => void
  onUpgradeRequired: () => void
}

function sectionChips(data: ResumeImportPayload | null) {
  if (!data) return []
  const chips: { label: string; ok: boolean }[] = [
    {
      label: 'Personal',
      ok: !!(data.name?.trim() || data.email?.trim() || data.phone?.trim() || data.location?.trim()),
    },
    {
      label: 'Experience',
      ok:
        Array.isArray(data.experiences) &&
        data.experiences.some(
          (e) =>
            e.role?.trim() ||
            e.company?.trim() ||
            e.dates?.trim() ||
            e.description?.trim()
        ),
    },
    {
      label: 'Education',
      ok:
        Array.isArray(data.educationEntries) &&
        data.educationEntries.some((e) => e.degree?.trim() || e.school?.trim()),
    },
    { label: 'Skills', ok: !!data.skills?.trim() },
    {
      label: 'Certifications',
      ok: Array.isArray(data.certifications) && data.certifications.length > 0,
    },
    {
      label: 'Portfolio',
      ok:
        !!(data.portfolioLink?.trim()) ||
        (Array.isArray(data.portfolioProjects) && data.portfolioProjects.length > 0),
    },
    { label: 'Summary', ok: !!data.summary?.trim() },
  ]
  return chips
}

export default function ResumeEntryGate({
  phase,
  onPhaseChange,
  resumeImportText,
  resumeImportFileName,
  onPdfParsed,
  onClearImport,
  onStartFresh,
  onFinishImport,
  onUpgradeRequired,
}: ResumeEntryGateProps) {
  const [isParsingPdf, setIsParsingPdf] = useState(false)
  const [parseError, setParseError] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extracted, setExtracted] = useState<ResumeImportPayload | null>(null)
  const [mergeMode, setMergeMode] = useState<ResumeMergeMode>('fillEmpty')
  const [extractAttempt, setExtractAttempt] = useState(0)

  useEffect(() => {
    if (phase !== 'import_review' || !resumeImportText.trim()) return

    let cancelled = false
    setExtractError('')
    setIsExtracting(true)
    setExtracted(null)

    ;(async () => {
      try {
        console.log('resumeImportText', resumeImportText);
        const response = await fetch('/api/resume/import-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText: resumeImportText }),
        })
        const payload = await response.json()
        console.log('payload', payload);
        if (cancelled) return
        if (!response.ok) {
          if (response.status === 403 && payload.code === 'USAGE_LIMIT_EXCEEDED') {
            onUpgradeRequired()
          }
          setExtractError(payload.message || payload.error || 'Failed to extract resume data.')
          return
        }
        if (payload.data) {
          setExtracted(payload.data as ResumeImportPayload)
        } else {
          setExtractError('Unexpected response from server.')
        }
      } catch {
        if (!cancelled) setExtractError('Network error. Please try again.')
      } finally {
        if (!cancelled) setIsExtracting(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [phase, resumeImportText, extractAttempt, onUpgradeRequired])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setParseError('')
    setIsParsingPdf(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/scan/parse-resume-pdf', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        setParseError(payload.error || 'Failed to parse PDF.')
        return
      }
      onPdfParsed(payload.text || '', payload.fileName || file.name, payload.pageCount)
      onPhaseChange('import_review')
    } catch {
      setParseError('Failed to upload PDF. Please try again.')
    } finally {
      setIsParsingPdf(false)
    }
  }

  const hasSolidExperience =
    extracted?.experiences?.some(
      (e) =>
        e.role?.trim() ||
        e.company?.trim() ||
        e.dates?.trim() ||
        e.description?.trim()
    ) ?? false

  const lowConfidence =
    extracted &&
    (!extracted.name?.trim() || !extracted.email?.trim()) &&
    !hasSolidExperience

  if (phase === 'choose') {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
          New resume
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
          How would you like to start?
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Import a text-based PDF to pre-fill your details, or start with a blank resume. Text-based PDFs only
          (no scanned images), up to 5&nbsp;MB — same limits as the free scanner.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onPhaseChange('import_upload')}
            className="rounded-xl border-2 border-blue-200 bg-blue-50/80 p-6 text-left transition hover:border-blue-400 hover:bg-blue-50"
          >
            <p className="text-lg font-semibold text-gray-900">Import existing resume (PDF)</p>
            <p className="mt-2 text-sm text-gray-600">
              We&apos;ll extract your contact info, experience, education, and skills. You&apos;ll still add the
              job description in the next step.
            </p>
          </button>
          <button
            type="button"
            onClick={onStartFresh}
            className="rounded-xl border border-gray-200 bg-gray-50/80 p-6 text-left transition hover:border-gray-300 hover:bg-white"
          >
            <p className="text-lg font-semibold text-gray-900">Start from scratch</p>
            <p className="mt-2 text-sm text-gray-600">
              Empty form — fill everything manually. Best if you don&apos;t have a PDF handy.
            </p>
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'import_upload') {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
        <button
          type="button"
          onClick={() => {
            onClearImport()
            onPhaseChange('choose')
          }}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">Upload resume PDF</h1>
        <p className="mt-2 text-sm text-gray-600">
          Select a PDF with selectable text. Scanned image PDFs are not supported.
        </p>
        <input
          type="file"
          accept="application/pdf"
          className="mt-4 block w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
          disabled={isParsingPdf}
          onChange={(e) => {
            const f = e.target.files?.[0]
            void handleFile(f)
            e.target.value = ''
          }}
        />
        {isParsingPdf && <p className="mt-3 text-sm text-blue-700">Parsing PDF…</p>}
        {parseError && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {parseError}
          </div>
        )}
      </div>
    )
  }

  // import_review
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-10">
      <button
        type="button"
        onClick={() => {
          onClearImport()
          setExtracted(null)
          setExtractError('')
          onPhaseChange('import_upload')
        }}
        className="text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        ← Re-upload
      </button>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">Review import</h1>
      <p className="mt-2 text-sm text-gray-600">
        File: <span className="font-medium text-gray-800">{resumeImportFileName || '—'}</span>
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Extraction uses one AI rewrite credit (same pool as bullet rewrites). Job targeting fields are never taken
        from your PDF — you&apos;ll enter the job in the next step.
      </p>

      {isExtracting && (
        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
          Extracting structured data from your resume…
        </div>
      )}

      {extractError && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {extractError}
          <button
            type="button"
            onClick={() => setExtractAttempt((n) => n + 1)}
            className="ml-2 font-semibold text-rose-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {extracted && !isExtracting && (
        <>
          {lowConfidence && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              We couldn&apos;t confidently detect contact info or work history. Check the PDF quality or continue
              and edit manually in the workspace.
            </div>
          )}
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sections detected</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {sectionChips(extracted).map((c) => (
                <span
                  key={c.label}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {c.label}
                  {c.ok ? ' ✓' : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-800">
              <input
                type="checkbox"
                className="mt-1"
                checked={mergeMode === 'replaceSections'}
                onChange={(e) => setMergeMode(e.target.checked ? 'replaceSections' : 'fillEmpty')}
              />
              <span>
                <span className="font-semibold">Replace imported sections</span> — overwrite profile, experience,
                education, skills, and related fields with this import. Leave unchecked to only fill empty fields
                (recommended if you already typed something).
              </span>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!extracted}
              onClick={() => extracted && onFinishImport(extracted, mergeMode)}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Continue to workspace
            </button>
          </div>
        </>
      )}
    </div>
  )
}
