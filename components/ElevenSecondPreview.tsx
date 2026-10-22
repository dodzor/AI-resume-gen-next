import type { HostileAnnotation } from '@/lib/evidenceRules'
import { bulletLines } from '@/lib/evidenceRules'

type Experience = { role?: string; company?: string; dates?: string; description?: string }

function labelsFor(text: string, annotations: HostileAnnotation[]): HostileAnnotation[] {
  const lower = text.toLowerCase()
  return annotations.filter((note) => note.target && lower.includes(note.target.toLowerCase().slice(0, 48)))
}

function Marked({ text, annotations }: { text: string; annotations: HostileAnnotation[] }) {
  const hits = labelsFor(text, annotations)
  if (hits.length === 0) return <>{text}</>
  return (
    <span>
      {text}
      <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
        {hits.flatMap((hit) => hit.labels).map((label) => (
          <span key={label} className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-800">
            {label}
          </span>
        ))}
      </span>
    </span>
  )
}

export default function ElevenSecondPreview({
  formData,
  annotations = [],
}: {
  formData: {
    name?: string
    experiences?: Experience[]
    skills?: string
    summary?: string
    educationEntries?: Array<{ degree?: string; school?: string }>
  }
  annotations?: HostileAnnotation[]
}) {
  const experiences = (formData.experiences || []).filter((exp) => exp.role || exp.company || exp.description)
  const current = experiences[0]
  const previous = experiences[1]
  const bullets = bulletLines(current?.description || '')
  const rest = experiences.slice(1)

  return (
    <div className="mb-4 rounded-lg border border-slate-300 bg-white p-4" data-testid="eleven-second-preview">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">11-second scan</p>
      <p className="mt-1 text-xs text-slate-500">
        Bright lines are what a recruiter reads. Everything else is dimmed.
      </p>
      <div className="mt-3 space-y-2 text-sm text-slate-900">
        {current ? (
          <>
            <p className="font-semibold" data-scan="role"><Marked text={current.role || 'Current role missing'} annotations={annotations} /></p>
            <p data-scan="company-dates">
              <Marked text={[current.company, current.dates].filter(Boolean).join(' · ') || 'Company and dates missing'} annotations={annotations} />
            </p>
            {previous?.company && (
              <p data-scan="previous-company">
                Previous company: <Marked text={previous.company} annotations={annotations} />
                {previous.dates ? <span className="text-slate-700"> · {previous.dates}</span> : null}
              </p>
            )}
            <ul className="list-disc space-y-1 pl-5">
              {bullets.slice(0, 2).map((bullet) => (
                <li key={bullet} data-scan="bullet"><Marked text={bullet} annotations={annotations} /></li>
              ))}
              {bullets.slice(2).map((bullet) => (
                <li key={bullet} className="text-slate-300">{bullet}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-slate-500">Add a role to see the scan.</p>
        )}
        <p data-scan="skills">
          <span className="font-medium">Skills: </span>
          {formData.skills?.trim() || 'None yet'}
        </p>
        {formData.summary?.trim() && (
          <p className="text-slate-300">{formData.summary}</p>
        )}
        {rest.map((exp, index) => (
          <p key={`${exp.company}-${exp.role}-${index}`} className="text-slate-300">
            {index === 0
              ? exp.role
              : [exp.role, exp.company, exp.dates].filter(Boolean).join(' · ')}
          </p>
        ))}
        {(formData.educationEntries || []).map((edu) => (
          <p key={`${edu.school}-${edu.degree}`} className="text-slate-300">
            {[edu.degree, edu.school].filter(Boolean).join(', ')}
          </p>
        ))}
      </div>
    </div>
  )
}
