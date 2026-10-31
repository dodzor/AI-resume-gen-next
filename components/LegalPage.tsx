import Link from 'next/link'
import type { ReactNode } from 'react'
import { legal, legalContactReady } from '@/config/legal'
import { SiteHeader } from '@/components/SiteHeader'

export function LegalPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed text-slate-700 md:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
        {legal.productName}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
      <p className="mt-2 text-slate-500">Last updated {legal.lastUpdated}</p>
      {!legalContactReady() && (
        <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950">
          This draft is not ready to publish. The operator&apos;s legal name, postal address,
          privacy email, legal email, and governing law are empty in{' '}
          <span className="font-mono">config/legal.ts</span>. Privacy law in the EU and UK
          requires the controller&apos;s identity and a real contact address.
        </p>
      )}
      <div className="mt-8 space-y-8">{children}</div>
    </main>
    </>
  )
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      {children}
    </section>
  )
}

export function LegalContact() {
  if (!legal.controllerName || !legal.postalAddress || !legal.privacyEmail || !legal.legalEmail) {
    return (
      <p>
        No contact address is published yet. Add the controller name, postal address,
        and inboxes in <span className="font-mono">config/legal.ts</span>. Until then,
        do not treat this page as notice to people in the EU or UK.
      </p>
    )
  }

  return (
    <address className="not-italic">
      <span className="block font-medium text-slate-900">{legal.controllerName}</span>
      <span className="block whitespace-pre-line">{legal.postalAddress}</span>
      <span className="mt-2 block">
        Privacy requests:{' '}
        <a className="text-blue-700 underline" href={`mailto:${legal.privacyEmail}`}>
          {legal.privacyEmail}
        </a>
      </span>
      <span className="block">
        Legal requests:{' '}
        <a className="text-blue-700 underline" href={`mailto:${legal.legalEmail}`}>
          {legal.legalEmail}
        </a>
      </span>
    </address>
  )
}

export function LegalBackLink() {
  return (
    <p>
      <Link href="/" className="text-blue-700 underline">
        Back to {legal.productName}
      </Link>
    </p>
  )
}
