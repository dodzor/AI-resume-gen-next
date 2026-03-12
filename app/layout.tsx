import type { Metadata } from 'next'
import { Geist, Geist_Mono, DM_Sans } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Analytics } from '@vercel/analytics/react'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

  const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'AI Resume Generator',
  description: 'Paste a job description. We show you exactly what your resume needs to say — and why."',
}

// Force dynamic rendering to avoid build-time Clerk issues
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // ConvexProviderWithClerk requires ClerkProvider to be an ancestor
  // Always wrap with ClerkProvider when publishableKey is available
  if (!publishableKey) {
    console.error('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing. Clerk and Convex authentication will not work.');
  }
  
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} antialiased`}>
        {publishableKey ? (
          <ClerkProvider publishableKey={publishableKey}>
            <ConvexClientProvider>
              {children}
              <Analytics />
            </ConvexClientProvider>
          </ClerkProvider>
        ) : (
          // Without Clerk, we can't use ConvexProviderWithClerk
          // Show an error message instead of crashing
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Configuration Error</h1>
            <p>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured.</p>
            <p>Please set this environment variable in your Vercel project settings.</p>
          </div>
        )}
      </body>
    </html>
  )
}
