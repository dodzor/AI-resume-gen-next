'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { features } from '@/config/features'

const navLink =
  'hidden rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60 md:inline-flex'

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        >
          <img src="/logo.jpg" alt="RoleMirror" className="h-full w-full object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          {features.discoverJobs && (
            <Link href="/discover" className={navLink}>
              Discover jobs
            </Link>
          )}
          <Link
            href="/free-resume-scanner"
            className="hidden rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 md:inline-flex"
          >
            Free scanner
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={navLink}>Log in</button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="inline-flex rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Get started for free
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/"
              className="inline-flex rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Open app
            </Link>
          </SignedIn>
        </div>
      </div>
    </header>
  )
}
