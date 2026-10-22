import { containsPlaceholder, findBannedPhrases, isDutyLine } from '@/lib/evidenceRules'

export default function LineFlags({ text }: { text: string }) {
  if (!text?.trim()) return null
  const placeholder = containsPlaceholder(text)
  const duty = isDutyLine(text)
  const banned = findBannedPhrases(text)
  if (!placeholder && !duty && banned.length === 0) return null

  return (
    <div className="mt-1 space-y-0.5 text-xs">
      {placeholder && (
        <p className="text-amber-800">Contains [X]. Not ready until you replace it with a fact you can defend.</p>
      )}
      {duty && (
        <p className="text-amber-800">This still reads as a duty. What changed because you were there?</p>
      )}
      {banned.length > 0 && (
        <p className="text-rose-700">Stock phrase: {banned.join(', ')}</p>
      )}
    </div>
  )
}
