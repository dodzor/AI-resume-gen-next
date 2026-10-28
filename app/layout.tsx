import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { PlanSync } from '@/components/PlanSync'
import { AnalyticsGate, CookieBanner, LegalFooter } from '@/components/CookieConsent'

// Self-hosted so production builds do not fetch Google Fonts.
// next/font/google fails when Google returns extensionless /l/font?kit= URLs.
const geistSans = localFont({
  src: '../fonts/Geist-latin.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})

const geistMono = localFont({
  src: '../fonts/GeistMono-latin.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

const dmSans = localFont({
  src: '../fonts/DMSans-latin.woff2',
  variable: '--font-dm-sans',
  weight: '100 1000',
  display: 'swap',
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
              <PlanSync />
              {children}
              <LegalFooter />
              <CookieBanner />
              <AnalyticsGate />
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
