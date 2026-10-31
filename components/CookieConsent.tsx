'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/react'
import { legal } from '@/config/legal'

const CONSENT_KEY = 'rolemirror-analytics-consent'
const CHANGE_EVENT = 'rolemirror-consent-change'
const OPEN_EVENT = 'rolemirror-consent-open'

type Choice = 'accepted' | 'rejected'

function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY)
    if (value === 'accepted' || value === 'rejected') return value
  } catch {
    return null
  }
  return null
}

function writeChoice(choice: Choice) {
  localStorage.setItem(CONSENT_KEY, choice)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/** Loads Vercel Web Analytics only after the visitor accepts. */
export function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const sync = () => setAllowed(readChoice() === 'accepted')
    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (!allowed) return null
  return <Analytics />
}

export function CookieBanner() {
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(readChoice() === null)
    setReady(true)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  if (!ready || !open) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-300 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.08)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:flex-row md:items-end md:justify-between md:px-6">
        <div className="max-w-3xl">
          <h2 id="cookie-banner-title" className="text-sm font-semibold text-slate-900">
            Cookies and measurement for {legal.productName}
          </h2>
          <p id="cookie-banner-body" className="mt-1 text-sm leading-relaxed text-slate-600">
            Sign-in uses a Clerk cookie. That cookie is required to keep you logged in and stays on when you use an account.
            Optional page measurement from Vercel is off until you accept. It does not set its own cookie.
            It records the page, referrer, browser, device, and country. We do not use advertising cookies or session replay.
            Rejecting still lets you use the site. Read the{' '}
            <Link href="/privacy" className="font-medium text-blue-700 underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              writeChoice('rejected')
              setOpen(false)
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 active:bg-slate-100"
          >
            Reject analytics
          </button>
          <button
            type="button"
            onClick={() => {
              writeChoice('accepted')
              setOpen(false)
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  )
}

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-white px-4 py-5 text-xs text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 hover:text-slate-800">
          Privacy policy
        </Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 hover:text-slate-800">
          Terms of service
        </Link>
        <button type="button" onClick={openCookieSettings} className="inline-flex min-h-11 items-center px-2 hover:text-slate-800">
          Cookie settings
        </button>
      </div>
    </footer>
  )
}
