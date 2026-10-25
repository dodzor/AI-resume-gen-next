'use client'

import { useState } from 'react'
import { PRODUCT_RULE } from '@/lib/evidenceRules'
import LineFlags from './LineFlags'

type QA = { question: string; answer?: string; askedAt: number }

type MasterForm = {
  name?: string
  email?: string
  phone?: string
  location?: string
  rawDump?: string
  clarifyingQA?: QA[]
  confirmedFacts?: string[]
  experiences?: Array<{ role: string; company: string; dates: string; description: string }>
  educationEntries?: Array<{ degree?: string; school?: string; dates?: string; gpa?: string; coursework?: string }>
  skills?: string
  summary?: string
}

export default function MasterCareerPanel({
  formData,
  setFormData,
  onSave,
}: {
  formData: MasterForm
  setFormData: React.Dispatch<React.SetStateAction<any>>
  onSave: (next?: Record<string, unknown>) => Promise<void>
}) {
  const [busy, setBusy] = useState<'ask' | 'structure' | null>(null)
  const [error, setError] = useState('')
  const [showAskInfo, setShowAskInfo] = useState(false)
  const qa = formData.clarifyingQA || []

  async function persist(next: MasterForm) {
    setFormData((prev: MasterForm) => ({ ...prev, ...next, kind: 'master' }))
    await onSave({ ...formData, ...next, kind: 'master' } as MasterForm)
  }

  async function askQuestions() {
    setError('')
    setBusy('ask')
    try {
      const response = await fetch('/api/interview-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dump: formData.rawDump || '', prior: qa }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || payload.error || 'Could not ask questions')
      const askedAt = Date.now()
      const nextQa = [
        ...qa,
        ...payload.questions.map((question: string) => ({ question, answer: '', askedAt })),
      ]
      await persist({ clarifyingQA: nextQa })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not ask questions')
    } finally {
      setBusy(null)
    }
  }

  async function structureRecord() {
    setError('')
    setBusy('structure')
    try {
      const response = await fetch('/api/structure-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dump: formData.rawDump || '',
          qa: qa.filter((item) => item.answer?.trim()),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || payload.error || 'Could not update the career record')
      await persist({
        name: payload.name || formData.name,
        email: payload.email || formData.email,
        phone: payload.phone || formData.phone,
        location: payload.location || formData.location,
        skills: payload.skills,
        summary: payload.summary,
        experiences: payload.experiences,
        educationEntries: payload.educationEntries,
        confirmedFacts: payload.confirmedFacts,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the career record')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-lg sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Career record</p>
      <h2 className="mt-1 text-2xl font-semibold text-slate-900">Dump the work before anyone drafts a resume</h2>
      <p className="mt-2 text-sm text-slate-600">
        Jobs, projects, promotions, hard problems, tools, metrics, rescues, customers. Volume over format. This record is never exported.
      </p>
      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{PRODUCT_RULE}</p>

      <label className="mt-6 block text-sm font-medium text-slate-800" htmlFor="career-dump">Career dump</label>
      <textarea
        id="career-dump"
        value={formData.rawDump || ''}
        onChange={(event) => setFormData((prev: MasterForm) => ({ ...prev, rawDump: event.target.value, kind: 'master' }))}
        onBlur={(event) => { void onSave({ rawDump: event.target.value, kind: 'master' }) }}
        rows={12}
        placeholder="I ran onboarding at Northwind from 2019 to 2022. The queue was three weeks. We got it to four days. I don't remember the headcount..."
        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-900"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        
        
        <button
          type="button"
          onClick={() => void structureRecord()}
          disabled={busy !== null || !(formData.rawDump || '').trim()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          {busy === 'structure' ? 'Updating…' : qa.length ? 'Update career record from confirmed answers' : 'Update career record'}
        </button>
        <button
          type="button"
          onClick={() => void askQuestions()}
          disabled={busy !== null || (formData.rawDump || '').trim().length < 40}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === 'ask' ? 'Reading…' : qa.length ? 'Ask more questions' : 'Ask clarifying questions'}
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="About clarifying questions"
            onMouseEnter={() => setShowAskInfo(true)}
            onMouseLeave={() => setShowAskInfo(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition duration-200 hover:bg-gray-200 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </button>
          {showAskInfo && (
            <div className="absolute left-0 top-9 z-20 w-96 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-xl">
              These answers become your strongest resume bullets. Because they&apos;re yours. Not AI&apos;s.
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

      {qa.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Clarifying questions</h3>
          <p className="text-xs text-slate-500">Only answered facts can appear on a resume. Leave a question blank if you do not have the number.</p>
          {qa.map((item, index) => (
            <div key={`${item.askedAt}-${index}`} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-900">{item.question}</p>
              <textarea
                value={item.answer || ''}
                rows={2}
                onChange={(event) => {
                  const next = qa.map((row, rowIndex) => rowIndex === index ? { ...row, answer: event.target.value } : row)
                  setFormData((prev: MasterForm) => ({ ...prev, clarifyingQA: next }))
                }}
                onBlur={(event) => {
                  const next = qa.map((row, rowIndex) => rowIndex === index ? { ...row, answer: event.target.value } : row)
                  void onSave({ clarifyingQA: next, kind: 'master' })
                }}
                placeholder="Your answer. This is the fact."
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      {(formData.confirmedFacts || []).length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-900">Confirmed facts</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {formData.confirmedFacts!.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </div>
      )}

      {(formData.experiences || []).some((exp) => exp.role || exp.description) && (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Structured record</h3>
          {(formData.experiences || []).map((exp) => (
            <div key={`${exp.company}-${exp.role}`} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">{exp.role}{exp.company ? `, ${exp.company}` : ''} {exp.dates ? `(${exp.dates})` : ''}</p>
              {exp.description.split('\n').filter(Boolean).map((line) => (
                <div key={line} className="mt-1">
                  <p className="text-slate-700">{line}</p>
                  <LineFlags text={line} />
                </div>
              ))}
            </div>
          ))}
          {formData.summary && (
            <div>
              <p className="text-sm text-slate-700">{formData.summary}</p>
              <LineFlags text={formData.summary} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
