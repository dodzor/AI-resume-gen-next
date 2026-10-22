'use client'

import { useState } from 'react'
import { generateSimplePreview } from '@/lib/utils'
import type { HostileReview } from '@/lib/evidenceRules'

export default function HostileReviewPanel({
  formData,
  currentStep,
  setFormData,
}: {
  formData: any
  currentStep?: number
  setFormData: React.Dispatch<React.SetStateAction<any>>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const reviews: HostileReview[] = formData.hostileReviews || []

  async function runReview() {
    setError('')
    setBusy(true)
    try {
      const resumeText = generateSimplePreview(formData, currentStep).replace(/<[^>]+>/g, ' ')
      const response = await fetch('/api/hostile-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || payload.error || 'Review failed')
      setFormData((prev: any) => ({
        ...prev,
        hostileReviews: [...(prev.hostileReviews || []), payload.review].slice(-3),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Hostile reader</h3>
          <p className="text-xs text-slate-500">A hiring manager looking for a reason to stop. This pass does not rewrite the resume.</p>
        </div>
        <button
          type="button"
          onClick={() => void runReview()}
          disabled={busy}
          className="shrink-0 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Reading…' : reviews.length ? 'Review again' : 'Run hostile review'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-3 space-y-3">
        {[...reviews].reverse().map((review) => (
          <article key={review.createdAt} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
            <p className="text-xs text-slate-400">{new Date(review.createdAt).toLocaleString()}</p>
            <p className="mt-1 font-medium text-rose-800">Stops reading: {review.stopReading}</p>
            <p className="mt-1 text-slate-800">{review.verdict}</p>
            <ul className="mt-2 space-y-1">
              {review.annotations.map((note) => (
                <li key={`${note.target}-${note.note}`} className="text-slate-700">
                  <span className="font-medium">{note.labels.join(', ') || 'note'}:</span> {note.target}
                  {note.note ? ` — ${note.note}` : ''}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
