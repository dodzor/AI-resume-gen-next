'use client'

import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs'
import { CheckoutButton, usePlans } from '@clerk/nextjs/experimental'
import { OFFER } from '@/lib/plan-limits'
import { planTierFromLabel } from '@/lib/plan-tier'

type ClerkPlan = {
  id: string
  name: string
  slug: string
  isDefault: boolean
  isRecurring: boolean
  hasBaseFee: boolean
  fee: {
    amount: number
    amountFormatted: string
    currencySymbol: string
  }
}

function matchPlan(plans: ClerkPlan[], tier: 'search' | 'pro') {
  const labeled = plans.find(
    (plan) => planTierFromLabel(plan.slug) === tier || planTierFromLabel(plan.name) === tier
  )
  if (labeled) return labeled
  const isEnterprise = (plan: ClerkPlan) =>
    planTierFromLabel(plan.slug) === 'enterprise' || planTierFromLabel(plan.name) === 'enterprise'
  if (tier === 'search') {
    return plans.find((plan) => !plan.isDefault && !plan.isRecurring && plan.hasBaseFee && !isEnterprise(plan))
  }
  return plans.find(
    (plan) =>
      !plan.isDefault &&
      plan.isRecurring &&
      !isEnterprise(plan) &&
      planTierFromLabel(plan.slug) !== 'search' &&
      planTierFromLabel(plan.name) !== 'search'
  )
}

function priceFromPlan(plan: ClerkPlan | undefined, fallback: string) {
  if (!plan?.fee || plan.fee.amount <= 0) return fallback
  const symbol = plan.fee.currencySymbol || '$'
  const formatted = plan.fee.amountFormatted
  const withSymbol = formatted.startsWith(symbol) ? formatted : `${symbol}${formatted}`
  return withSymbol.replace(/\.00$/, '')
}

function PayButton({
  plan,
  children,
  className,
}: {
  plan: ClerkPlan | undefined
  children: string
  className: string
}) {
  if (!plan) {
    return (
      <button type="button" disabled className={`${className} cursor-not-allowed opacity-60`}>
        {children}
      </button>
    )
  }

  const button = (
    <button type="button" className={className}>
      {children}
    </button>
  )

  return (
    <>
      <SignedIn>
        <CheckoutButton
          planId={plan.id}
          planPeriod="month"
          newSubscriptionRedirectUrl="/"
        >
          {button}
        </CheckoutButton>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" fallbackRedirectUrl="/pricing">
          {button}
        </SignInButton>
      </SignedOut>
    </>
  )
}

export function PricingOffers() {
  const { data, isLoading } = usePlans({ for: 'user' })
  const plans = (data ?? []) as ClerkPlan[]
  const searchPlan = matchPlan(plans, 'search')
  const monthlyPlan = matchPlan(plans, 'pro')
  const searchPrice = priceFromPlan(searchPlan, OFFER.searchPrice)
  const monthlyPrice = priceFromPlan(monthlyPlan, OFFER.monthlyPrice)

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Pricing</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          One resume is free. The search is {searchPrice}.
        </h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          The scanner needs no account. A free account includes one tailored resume and a PDF.
          Eight more applications are the one-time pass.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Free</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">$0</p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
            <li>Scanner, no account</li>
            <li>One tailored resume</li>
            <li>PDF included</li>
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/free-resume-scanner"
              className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              Try the scanner
            </Link>
            <SignedOut>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Create the free resume
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Open the app
              </Link>
            </SignedIn>
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Default</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">This search</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {searchPrice}
            <span className="ml-1 text-base font-medium text-slate-500">once</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
            <li>{OFFER.searchDays} days</li>
            <li>Up to {OFFER.paidApplications} tailored applications</li>
            <li>PDF export included</li>
            <li>Does not renew</li>
          </ul>
          <div className="mt-6">
            <PayButton
              plan={searchPlan}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {`Get this search · ${searchPrice}`}
            </PayButton>
            {!isLoading && !searchPlan && (
              <p className="mt-2 text-xs text-slate-500">This pass is not open for payment yet.</p>
            )}
          </div>
        </article>

        <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Still looking</h2>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {monthlyPrice}
            <span className="ml-1 text-base font-medium text-slate-500">/month</span>
          </p>
          <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
            <li>Same access as This search</li>
            <li>{OFFER.paidApplications} applications each billing period</li>
            <li>PDF export included</li>
            <li>Cancel any time</li>
          </ul>
          <div className="mt-6">
            <PayButton
              plan={monthlyPlan}
              className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {`Continue monthly · ${monthlyPrice}`}
            </PayButton>
            {!isLoading && !monthlyPlan && (
              <p className="mt-2 text-xs text-slate-500">Monthly billing is not open yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
