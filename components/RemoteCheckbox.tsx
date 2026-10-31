"use client"

import { useRouter } from "next/navigation"
import { useBeginDiscoverRequest } from "@/components/DiscoverRequestSpinner"

export function RemoteCheckbox({ checked, href }: { checked: boolean; href: string }) {
  const router = useRouter()
  const beginDiscoverRequest = useBeginDiscoverRequest()

  return (
    <label className="inline-flex min-h-11 items-center gap-3 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          beginDiscoverRequest(href)
          router.push(href)
        }}
        className="h-5 w-5 accent-blue-600"
      />
      Remote
    </label>
  )
}
