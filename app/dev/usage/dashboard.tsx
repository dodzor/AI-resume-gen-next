'use client'

import { Component, useEffect, useState, type ReactNode } from 'react'
import { Authenticated, Unauthenticated, useQuery } from 'convex/react'
import { SignInButton, useAuth } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import type { PlanTier } from '@/lib/plan-limits'

const planBadge: Record<PlanTier, string> = {
  free: 'bg-gray-100 text-gray-800',
  search: 'bg-blue-100 text-blue-800',
  pro: 'bg-sky-100 text-sky-800',
  enterprise: 'bg-purple-100 text-purple-800',
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function quota(used: number, limit: number) {
  if (limit === -1) return `${used} · unlimited`
  return `${used} / ${limit}`
}

type Account = { name: string | null; email: string | null }

function UserCell({ userId, account }: { userId: string; account?: Account }) {
  if (!account?.name && !account?.email) {
    return <span className="font-mono text-xs text-gray-700">{userId}</span>
  }
  return (
    <div>
      {account.name && <p className="text-gray-900">{account.name}</p>}
      {account.email && (
        <p className={account.name ? 'text-xs text-gray-500' : 'text-gray-900'}>{account.email}</p>
      )}
    </div>
  )
}

function UsageTable() {
  const { userId } = useAuth()
  const rows = useQuery(api.usage.listUserUsage)
  const [accounts, setAccounts] = useState<Record<string, Account>>({})
  const userIds = rows?.map((row) => row.userId).join('\n') ?? ''

  useEffect(() => {
    if (!userIds) return
    let cancelled = false
    fetch('/api/dev/usage-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: userIds.split('\n') }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { users?: { userId: string; name: string | null; email: string | null }[] } | null) => {
        if (cancelled || !data?.users) return
        const next: Record<string, Account> = {}
        for (const user of data.users) {
          next[user.userId] = { name: user.name, email: user.email }
        }
        setAccounts(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userIds])

  if (rows === undefined) {
    return <p className="text-sm text-gray-500">Loading usage…</p>
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No usage yet. A record is created the first time someone uses the app.
      </p>
    )
  }

  const planCounts = rows.reduce<Partial<Record<PlanTier, number>>>((counts, row) => {
    counts[row.plan] = (counts[row.plan] ?? 0) + 1
    return counts
  }, {})

  const summary = (['free', 'search', 'pro', 'enterprise'] as const)
    .filter((plan) => planCounts[plan])
    .map((plan) => `${planCounts[plan]} ${plan}`)
    .join(' · ')

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {rows.length} {rows.length === 1 ? 'user' : 'users'}
        {summary ? ` · ${summary}` : ''}
      </p>
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={row.userId}
            className={`rounded-lg border border-gray-200 bg-white p-4 ${row.userId === userId ? 'ring-2 ring-blue-200' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <UserCell userId={row.userId} account={accounts[row.userId]} />
              <span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${planBadge[row.plan]}`}>
                {row.plan}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500">Applications</dt>
                <dd className="text-gray-800">{quota(row.applicationsUsed, row.limits.resumes)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Analyses</dt>
                <dd className="text-gray-800">{quota(row.jobAnalysesUsed, row.limits.jobAnalyses)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Rewrites</dt>
                <dd className="text-gray-800">{quota(row.aiRewritesUsed, row.limits.aiRewrites)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Exports</dt>
                <dd className="text-gray-800">{quota(row.exportsUsed, row.limits.exports)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-gray-500">
              {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
            </p>
            <p className="mt-1 text-xs text-gray-400">Updated {formatDateTime(row.updatedAt)}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Applications</th>
              <th className="px-4 py-3 font-medium">Analyses</th>
              <th className="px-4 py-3 font-medium">Rewrites</th>
              <th className="px-4 py-3 font-medium">Exports</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.userId}
                className={`border-t border-gray-100 ${row.userId === userId ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <UserCell userId={row.userId} account={accounts[row.userId]} />
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${planBadge[row.plan]}`}>
                    {row.plan}
                  </span>
                  {row.storedPlan !== row.plan && (
                    <p className="mt-1 text-xs text-gray-500">stored {row.storedPlan}</p>
                  )}
                  {row.periodExpired && (
                    <p className="mt-1 text-xs text-gray-500">resets on next action</p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {quota(row.applicationsUsed, row.limits.resumes)}
                  <p className="mt-1 text-xs text-gray-500">{row.resumesCreated} lifetime</p>
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {quota(row.jobAnalysesUsed, row.limits.jobAnalyses)}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {quota(row.aiRewritesUsed, row.limits.aiRewrites)}
                </td>
                <td className="px-4 py-3 text-gray-800">
                  {quota(row.exportsUsed, row.limits.exports)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                  {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                  {formatDateTime(row.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

class UsageErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null }

  static getDerivedStateFromError(error: Error) {
    return { message: error.message }
  }

  render() {
    if (this.state.message) {
      return <p className="text-sm text-red-600">{this.state.message}</p>
    }
    return this.props.children
  }
}

export function UsageDashboard() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 md:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Plan and counters for each account. This page is only available while developing.
        </p>
        <div className="mt-8">
          <Authenticated>
            <UsageErrorBoundary>
              <UsageTable />
            </UsageErrorBoundary>
          </Authenticated>
          <Unauthenticated>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <p className="text-sm text-gray-600">Sign in to see usage.</p>
              <SignInButton mode="modal">
                <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  Log in
                </button>
              </SignInButton>
            </div>
          </Unauthenticated>
        </div>
      </div>
    </main>
  )
}
