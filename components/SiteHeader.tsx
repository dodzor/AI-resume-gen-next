'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { features } from '@/config/features'

const navLink =
  'hidden rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted/60 active:bg-muted md:inline-flex md:h-11 md:items-center'

const menuLink =
  'flex min-h-11 items-center rounded-md px-3 text-base font-medium text-foreground active:bg-muted'

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 md:px-6">
        <Link
          href="/"
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg md:h-24 md:w-24"
          onClick={() => setMenuOpen(false)}
        >
          <img src="/logo.jpg" alt="RoleMirror" className="h-full w-full object-contain" />
        </Link>
        <nav className="hidden items-center gap-3 md:flex" aria-label="Primary">
          {features.discoverJobs && (
            <Link href="/discover" className={navLink}>
              Discover jobs
            </Link>
          )}
          <Link
            href="/free-resume-scanner"
            className="hidden h-11 items-center rounded-md border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100 active:bg-blue-200 md:inline-flex"
          >
            Free scanner
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={navLink}>Log in</button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800">
                Get started for free
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800"
            >
              Open app
            </Link>
          </SignedIn>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="inline-flex h-11 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm active:bg-blue-800">
                <span className="sm:hidden">Start free</span>
                <span className="hidden sm:inline">Get started for free</span>
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm active:bg-blue-800"
            >
              Open app
            </Link>
          </SignedIn>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground active:bg-muted"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="site-menu" aria-label="Mobile" className="border-t border-border px-3 py-2 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col">
            {features.discoverJobs && (
              <Link href="/discover" className={menuLink} onClick={() => setMenuOpen(false)}>
                Discover jobs
              </Link>
            )}
            <Link href="/free-resume-scanner" className={menuLink} onClick={() => setMenuOpen(false)}>
              Free scanner
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button type="button" className={`${menuLink} text-left`} onClick={() => setMenuOpen(false)}>
                  Log in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      )}
    </header>
  )
}
