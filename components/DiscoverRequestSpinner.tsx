"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { DiscoverSpinner } from "@/components/DiscoverSpinner"

const BeginContext = createContext<(href: string) => void>(() => {})

function locationKey(url: URL) {
  const params = [...url.searchParams.entries()].sort(([left], [right]) => left.localeCompare(right))
  const search = new URLSearchParams(params).toString()
  return `${url.pathname}${search ? `?${search}` : ""}`
}

function destinationChanged(href: string) {
  const next = new URL(href, window.location.href)
  if (next.origin !== window.location.origin) return false
  return locationKey(next) !== locationKey(new URL(window.location.href))
}

export function useBeginDiscoverRequest() {
  return useContext(BeginContext)
}

export function DiscoverRequestSpinner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const renderedLocation = locationKey(new URL(search ? `${pathname}?${search}` : pathname, "http://discover.local"))
  const [seenLocation, setSeenLocation] = useState(renderedLocation)
  const [pending, setPending] = useState(false)

  if (seenLocation !== renderedLocation) {
    setSeenLocation(renderedLocation)
    setPending(false)
  }

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(false), 20000)
    return () => window.clearTimeout(timer)
  }, [pending])

  useEffect(() => {
    const beginIfChanged = (href: string) => {
      if (destinationChanged(href)) setPending(true)
    }

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest("a")
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!href) return
      beginIfChanged(anchor.href)
    }

    const onSubmit = (event: Event) => {
      const form = event.target
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented) return
      const params = new URLSearchParams()
      for (const [key, value] of new FormData(form).entries()) {
        if (typeof value === "string") params.set(key, value)
      }
      const action = new URL(form.action, window.location.href)
      const search = params.toString()
      beginIfChanged(`${action.pathname}${search ? `?${search}` : ""}`)
    }

    document.addEventListener("click", onClick, true)
    document.addEventListener("submit", onSubmit, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("submit", onSubmit, true)
    }
  }, [])

  return (
    <BeginContext.Provider value={(href) => {
      if (destinationChanged(href)) setPending(true)
    }}>
      {children}
      {pending ? <DiscoverSpinner overlay /> : null}
    </BeginContext.Provider>
  )
}
