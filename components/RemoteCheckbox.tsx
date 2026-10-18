"use client"

import { useRouter } from "next/navigation"
import { useBeginDiscoverRequest } from "@/components/DiscoverRequestSpinner"

export function RemoteCheckbox({ checked, href }: { checked: boolean; href: string }) {
  const router = useRouter()
  const beginDiscoverRequest = useBeginDiscoverRequest()

  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          beginDiscoverRequest(href)
          router.push(href)
        }}
        className="h-4 w-4 accent-blue-600"
      />
      Remote
    </label>
  )
}
