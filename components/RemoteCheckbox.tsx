"use client"

import { useRouter } from "next/navigation"

export function RemoteCheckbox({ checked, href }: { checked: boolean; href: string }) {
  const router = useRouter()

  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {
          router.push(href)
        }}
        className="h-4 w-4 accent-blue-600"
      />
      Remote
    </label>
  )
}
