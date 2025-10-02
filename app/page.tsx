'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useState } from 'react'

import Content from '../components/content'

/** Automatically called when visiting the root route (/) */
export default function Home() {
  return (
    <>
      <Authenticated>
        <div className="flex justify-end p-4 fixed right-0">
          <UserButton />
        </div>
        <Content />
      </Authenticated>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}
