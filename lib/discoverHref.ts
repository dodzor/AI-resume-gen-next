export function discoverHref(
  page: number,
  category?: string,
  query?: string,
  remote?: boolean,
  country?: string,
  resume?: string,
) {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (query) params.set("q", query)
  if (remote) params.set("remote", "1")
  if (country) params.set("country", country)
  if (resume) params.set("resume", resume)
  if (page > 1) params.set("page", String(page))
  const search = params.toString()
  return search ? `/discover?${search}` : "/discover"
}
