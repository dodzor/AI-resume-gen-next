const GREENHOUSE_BOARD_TOKEN = "stripe"

export type GreenhouseJobListing = {
  id: number
  title: string
  companyName: string
  location: string
  url: string
  updatedAt: string
}

type GreenhouseJobsResponse = {
  jobs?: Array<{
    id?: number
    title?: string
    company_name?: string
    absolute_url?: string
    updated_at?: string
    location?: { name?: string }
  }>
}

export async function fetchGreenhouseJobs(limit = 10): Promise<GreenhouseJobListing[]> {
  const response = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${GREENHOUSE_BOARD_TOKEN}/jobs`,
    { next: { revalidate: 300 } }
  )

  if (!response.ok) {
    throw new Error(`Greenhouse responded with ${response.status}`)
  }

  const data = (await response.json()) as GreenhouseJobsResponse
  const jobs = Array.isArray(data.jobs) ? data.jobs : []

  return jobs.slice(0, limit).flatMap((job) => {
    if (typeof job.id !== "number" || !job.title || !job.absolute_url) {
      return []
    }

    return [{
      id: job.id,
      title: job.title,
      companyName: job.company_name || GREENHOUSE_BOARD_TOKEN,
      location: job.location?.name || "Location not listed",
      url: job.absolute_url,
      updatedAt: job.updated_at || "",
    }]
  })
}
