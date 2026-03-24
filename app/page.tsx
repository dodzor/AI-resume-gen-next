'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton } from '@clerk/nextjs'

import Content from '../components/content'

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <span className="text-lg font-semibold">RM</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight">
                RoleMirror
              </span>
              <span className="text-xs text-muted-foreground">
                AI resume alignment coach
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <button className="hidden rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60 md:inline-flex">
                Log in
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="inline-flex rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Get started for free
              </button>
            </SignInButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-14">
        {/* Hero Section */}
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              {/* AI-POWERED RESUME COACH */}
              Job description intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-3xl lg:text-4xl">
              Mirror the role. Get the interview.
              <br />
              <span className="text-blue-600">
                Paste a job description and see exactly what your resume
                needs to say
              </span>{' '}
              — and why.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
              RoleMirror analyzes any job description, extracts the skills,
              keywords and themes that truly matter, and helps you tailor your resume to the role.
            </p>
            <p className="mt-2 max-w-lg text-xs text-slate-700 md:text-sm">
              {/* Most resume tools only look at keywords.{' '}*/}
               {/* Most resume tools help you write.{' '} */}
               Most resume tools help you format your resume.<br />
               {/* Most resume tools just offer you pretty templates.{' '} */}
              <span className="font-semibold">
                {/* RoleMirror analyzes what the role actually values. */}
                {/* RoleMirror shows what hiring managers actually expect. */}
                RoleMirror helps you align it to the role.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  Analyze a job description
                </button>
              </SignInButton>
              {/* <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/60">
                  Sign up in 5 seconds
                </button>
              </SignInButton> */}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Designed for real hiring managers. Stop guessing. Start aligning.
            </p>
          </div>

          {/* Right: Product preview */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-sky-400/15 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-700">
                  Job description analysis • Senior Frontend Engineer
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  We pulled out the tone, critical keywords, and themes this
                  role cares about.
                </p>
              </div>
              <div className="grid gap-4 bg-white px-4 py-4 text-xs text-slate-700 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Seniority & tone
                    </p>
                    <p className="mt-1 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                      Senior • Ownership • Systems thinking
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Top keywords (by importance)
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {['React', 'TypeScript', 'System design', 'Mentorship', 'Design systems', 'Cross-functional'].map(
                        (k, idx) => (
                          <span
                            key={k}
                            className={`rounded-full px-2 py-0.5 text-[11px] ${
                              idx < 3
                                ? 'border border-blue-500/70 bg-blue-50 text-blue-700'
                                : 'border border-slate-200 bg-slate-50 text-slate-700'
                            }`}
                          >
                            {k}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-sky-500 p-3 text-[11px] text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-100">
                      What this role really cares about
                    </p>
                    <p className="mt-1 font-medium">
                      This job emphasizes ownership, system design and mentoring
                      other engineers.
                    </p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-indigo-50">
                      <li>Show impact designing and evolving complex systems.</li>
                      <li>Highlight decisions you owned end‑to‑end.</li>
                      <li>Include concrete examples of mentoring and leveling up others.</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Resume alignment
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      We rewrite your bullets, summary and skills to naturally
                      weave in these themes and keywords — without sounding like
                      a robot.
                    </p>
                  </div>
                  <div className="mt-1 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px]">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Resume Match Score
                      </p>
                      <p className="text-[11px] text-slate-700">
                        See how closely your resume mirrors the role.
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                      74%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Analysis Demo Section */}
        {/* <section className="mt-14">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Job description pasted</p>
              <div className="mt-2 text-2xl text-slate-300">↓</div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Detected seniority
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">Senior Engineer</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Top Keywords
                </p>
                <ul className="mt-2 space-y-1">
                  <li className="text-sm text-slate-700">• TypeScript</li>
                  <li className="text-sm text-slate-700">• System design</li>
                  <li className="text-sm text-slate-700">• Mentorship</li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Themes
                </p>
                <ul className="mt-2 space-y-1">
                  <li className="text-sm text-slate-700">• Ownership</li>
                  <li className="text-sm text-slate-700">• Cross-team collaboration</li>
                </ul>
              </div>
            </div>
          </div>
        </section> */}

        {/* Before / After transformation */}
        <section className="mt-20">
          <div className="space-y-6 rounded-2xl border border-slate-300 bg-white px-4 py-5 shadow-md md:px-8 md:py-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900 md:text-xs text-center">
              Before / after: from vague bullet to role‑aligned impact
            </h2>

            <div className="mt-4 flex flex-col items-center gap-4 text-sm text-slate-800 md:flex-row md:justify-center md:gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  1
                </span>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  Job description pasted
                </p>
              </div>

              {/* Arrow 1 */}
              <span className="hidden text-lg text-slate-300 md:inline">
                →
              </span>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  2
                </span>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  RoleMirror analyzes tone, keywords, themes &amp; expectations
                </p>
              </div>

              {/* Arrow 2 */}
              <span className="hidden text-lg text-slate-300 md:inline">
                →
              </span>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                  3
                </span>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  Resume rewritten to match the role
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-800 md:grid-cols-2 md:p-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Before (what most resumes say)
                </p>
                <div className="mt-2 rounded-md border border-slate-100 bg-white px-3 py-2 text-sm text-slate-500">
                  • Worked on frontend features
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  After with RoleMirror (what hiring managers want to see)
                </p>
                <div className="mt-2 flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
                  <span className="mt-1 p-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white">
                    ✓
                  </span>
                  <p>
                    <span className="font-semibold">Developed and enhanced frontend features</span> using TypeScript and React, collaborating with UX designers to deliver scalable solutions that increased user engagement by 25%.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500 md:text-xs text-center">
              Resume tools help you write resumes.{' '}
              <span className="font-semibold text-slate-700">
                RoleMirror helps you understand what the job actually wants.
              </span>
            </p>
          </div>
        </section>

        {/* "Your personal coach" style section */}
        <section className="mt-20 border-t border-slate-200 pt-10">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Your personal resume alignment coach
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground md:text-base">
            Instead of guessing what to say, RoleMirror shows you how well your
            resume matches the job and where to improve — with concrete, AI‑powered
            suggestions.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
            <FeatureCard
              title="Instant job analysis"
              description="Paste a job description and instantly get tone, seniority, keywords and themes — all ranked by importance."
            />
            <FeatureCard
              title="Targeted resume rewrites"
              description="Rewrite bullets and summaries with one click to align with the job’s language, without buzzwords or fluff."
            />
            <FeatureCard
              title="Keyword & theme coverage"
              description="See exactly which skills and themes your resume already covers — and what’s missing — across bullets and skills."
            />
            <FeatureCard
              title="ATS optimization"
              description="Detect missing keywords that ATS systems scan for so your resume mirrors what screening tools expect."
            />
            <FeatureCard
              title="Usage‑based freemium"
              description="Start free with sensible limits. Free plan includes 3 job analyses and 3 AI rewrites each month."
            />
          </div>
        </section>

        {/* Deep-dive section similar to "Score My Resume" */}
        <section className="mt-20 grid gap-10 rounded-2xl border border-slate-300 bg-slate-50/70 px-5 py-8 shadow-md md:grid-cols-[1.2fr,1fr] md:px-8">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
              Get expert‑level guidance on your resume, instantly
            </h3>
            <p className="mt-3 text-sm text-slate-700 md:text-base">
              RoleMirror goes beyond keyword matching. It understands what the
              role truly values — ownership, scope, systems, mentorship — and
              helps you demonstrate that through concrete, well‑written bullets.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>
                  Analyze job descriptions with AI and see seniority, keywords,
                  themes and recommendations in seconds.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>
                  Rewrite bullets and summaries with built‑in buzzword filtering
                  so your resume sounds sharp, not generic.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                <span>
                  Track keyword and theme coverage across your skills and
                  experience, and fill in the gaps with guided suggestions.
                </span>
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  Analyze a job description
                </button>
              </SignInButton>
              <p className="text-xs text-slate-600">
                No credit card required • Built‑in usage limits to control AI
                costs
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-300 bg-white p-4 text-xs text-slate-700 shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              How it works
            </p>
            <ol className="space-y-2">
              <li>
                <span className="font-semibold text-slate-900">1️⃣ Paste a job description</span>{' '}
                Drop in the exact posting you want to target.
              </li>
              <li>
                <span className="font-semibold text-slate-900">
                  2️⃣ RoleMirror analyzes keywords, themes and expectations
                </span>{' '}
                See what the job truly emphasizes, not just raw keyword counts.
              </li>
              <li>
                <span className="font-semibold text-slate-900">
                  3️⃣ Rewrite your resume to match the role
                </span>{' '}
                Generate aligned bullets, summaries and skills that mirror what
                the hiring team is actually looking for.
              </li>
            </ol>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-800 shadow-md">
            <p className="text-[13px] leading-relaxed">
              &quot;RoleMirror helped me realize my resume was missing half the keywords
              recruiters were scanning for.&quot;
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-600">
              — Senior Software Engineer
            </p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-800 shadow-md">
            <p className="text-[13px] leading-relaxed">
              &quot;I stopped blindly tweaking my bullets. RoleMirror showed me what
              this role actually cared about — and my interviews doubled.&quot;
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-600">
              — Product Designer
            </p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-5 text-sm text-slate-800 shadow-md">
            <p className="text-[13px] leading-relaxed">
              &quot;The theme analysis made it obvious why I wasn&apos;t getting callbacks.
              Once my bullets mirrored those themes, I moved to onsites.&quot;
            </p>
            <p className="mt-3 text-xs font-semibold text-slate-600">
              — Data Scientist
            </p>
          </div>
        </section>

        {/* Footer-style CTA */}
        <section className="mt-20 rounded-2xl border border-slate-300 bg-white px-6 py-7 text-center shadow-md md:px-10">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Start seeing exactly how well your resume matches each job
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Paste a job description, get the real signal — seniority, keywords,
            themes and recommendations — and transform your resume with
            profession‑aware AI rewrites.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <SignInButton mode="modal">
              <button className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                Analyze a job description
              </button>
            </SignInButton>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Works best for knowledge workers: engineers, designers, PMs, marketers and more.
          </p>
        </section>
      </main>
    </div>
  )
}

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-300 bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  )
}

/** Automatically called when visiting the root route (/) */
export default function Home() {
  return (
    <>
      <Authenticated>
        <Content />
      </Authenticated>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
    </>
  )
}

