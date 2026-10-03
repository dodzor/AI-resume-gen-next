"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SignInButton, useAuth } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { discoverHref } from "@/lib/discoverHref"
import { LAST_EDITED_RESUME_KEY, resumeMatchLabel } from "@/lib/resumeMatch"

export function ResumeMatchToggle({
  activeResumeId,
  category,
  query,
  remote,
  country,
}: {
  activeResumeId?: string
  category?: string
  query?: string
  remote?: boolean
  country?: string
}) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()
  const resumes = useQuery(api.resumes.getUserResumes, isLoaded && isSignedIn ? {} : "skip")
  const [storedId, setStoredId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setStoredId(window.localStorage.getItem(LAST_EDITED_RESUME_KEY))
    setReady(true)
  }, [])

  if (!ready || !isLoaded || (isSignedIn && resumes === undefined)) {
    return <span className="text-sm text-muted-foreground">Loading resume…</span>
  }

  if (!isSignedIn || !resumes) {
    return (
      <SignInButton mode="modal">
        <button type="button" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          Login to match resume
        </button>
      </SignInButton>
    )
  }

  const selected =
    resumes.find((resume) => resume._id === activeResumeId) ??
    resumes.find((resume) => resume._id === storedId) ??
    resumes.reduce<(typeof resumes)[number] | undefined>((latest, resume) => {
      if (!latest || resume.updatedAt > latest.updatedAt) return resume
      return latest
    }, undefined)

  if (!selected) {
    return (
      <Link href="/" className="text-sm font-medium text-blue-700 hover:text-blue-800">
        Create a resume to match
      </Link>
    )
  }

  const checked = selected._id === activeResumeId
  const href = discoverHref(1, category, query, remote, country, checked ? undefined : selected._id)

  return (
    <label className="inline-flex max-w-xs items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => router.push(href)}
        className="h-4 w-4 accent-blue-600"
      />
      <span className="truncate">{resumeMatchLabel(selected)}</span>
    </label>
  )
}
