import { auth } from "@clerk/nextjs/server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export type MatchResume = {
  name: string
  jobTitle?: string
  skills: string
  experiences: Array<{ role: string }>
  portfolioProjects: Array<{ toolsSkills: string }>
}

export type MatchResumeResult =
  | { status: "ok"; resume: MatchResume }
  | { status: "signed-out" }
  | { status: "missing" }

export async function loadMatchResume(resumeId: string): Promise<MatchResumeResult> {
  const { userId, getToken } = await auth()
  if (!userId) return { status: "signed-out" }
  const token = await getToken({ template: "convex" })
  if (!token) return { status: "signed-out" }
  try {
    const resume = await fetchQuery(
      api.resumes.getResume,
      { resumeId: resumeId as Id<"resumes"> },
      { token },
    )
    return { status: "ok", resume }
  } catch {
    return { status: "missing" }
  }
}
