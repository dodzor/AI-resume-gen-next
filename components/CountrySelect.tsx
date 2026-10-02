"use client"

import { useRouter } from "next/navigation"

export function CountrySelect({
  value,
  options,
}: {
  value: string
  options: Array<{ value: string; label: string; href: string }>
}) {
  const router = useRouter()

  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground">
      Country
      <select
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (next) router.push(next.href)
        }}
        className="max-w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground outline-none focus:border-blue-600"
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
