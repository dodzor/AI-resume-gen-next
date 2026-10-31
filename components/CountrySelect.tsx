"use client"

import { useRouter } from "next/navigation"
import { useBeginDiscoverRequest } from "@/components/DiscoverRequestSpinner"

export function CountrySelect({
  value,
  options,
}: {
  value: string
  options: Array<{ value: string; label: string; href: string }>
}) {
  const router = useRouter()
  const beginDiscoverRequest = useBeginDiscoverRequest()

  return (
    <label className="flex min-h-11 w-full items-center gap-3 text-sm text-foreground sm:inline-flex sm:w-auto">
      <span className="shrink-0">Country</span>
      <select
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (!next) return
          beginDiscoverRequest(next.href)
          router.push(next.href)
        }}
        className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-white px-3 text-base text-foreground outline-none focus:border-blue-600 sm:max-w-xs sm:flex-none sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value || "any"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
