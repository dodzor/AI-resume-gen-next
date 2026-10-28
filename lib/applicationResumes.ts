import { features } from '../config/features'

type ResumeLike = {
  _id: string
  kind?: 'master' | 'tailored'
  masterResumeId?: string
}

/**
 * Resumes that count toward the application limit.
 * With the career record hidden, a master that was never copied is the application.
 * Once New application has copied it, only the copies count.
 */
export function applicationResumes<T extends ResumeLike>(resumes: T[]): T[] {
  if (features.careerRecord) {
    return resumes.filter((resume) => resume.kind !== 'master')
  }
  return resumes.filter((resume) => {
    if (resume.kind !== 'master') return true
    return !resumes.some((other) => other.masterResumeId === resume._id)
  })
}
