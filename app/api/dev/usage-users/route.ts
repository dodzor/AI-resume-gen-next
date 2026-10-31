import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { features } from '@/config/features'
import { requireAuth } from '@/lib/api-auth'

const BATCH = 100

function displayName(user: {
  firstName: string | null
  lastName: string | null
  username: string | null
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return name || user.username || null
}

function primaryEmail(user: {
  primaryEmailAddressId: string | null
  emailAddresses?: { id: string; emailAddress: string }[]
}) {
  const emails = user.emailAddresses ?? []
  const primary = emails.find((email) => email.id === user.primaryEmailAddressId)
  return primary?.emailAddress ?? emails[0]?.emailAddress ?? null
}

export async function POST(request: Request) {
  if (!features.usageDashboard) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const authResult = await requireAuth()
  if ('error' in authResult) return authResult.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawIds = (body as { userIds?: unknown }).userIds
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: 'userIds required' }, { status: 400 })
  }

  const userIds = [...new Set(
    rawIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200)
  )].slice(0, 500)

  const client = await clerkClient()
  const users: { userId: string; name: string | null; email: string | null }[] = []

  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH)
    const page = await client.users.getUserList({ userId: batch, limit: BATCH })
    for (const user of page.data) {
      users.push({
        userId: user.id,
        name: displayName(user),
        email: primaryEmail(user),
      })
    }
  }

  return NextResponse.json({ users })
}
