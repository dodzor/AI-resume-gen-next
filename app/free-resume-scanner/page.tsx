'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';

interface ScanResponse {
  matchScore: number;
  missingKeywords: Array<{ keyword: string; count: number; score: number }>;
  matchedKeywords: Array<{ keyword: string; count: number; score: number }>;
  mustHaveKeywords: Array<{ keyword: string; count: number; score: number }>;
  importantKeywords: Array<{ keyword: string; count: number; score: number }>;
  secondaryKeywords: Array<{ keyword: string; count: number; score: number }>;
  missingMustHaveKeywords: Array<{ keyword: string; count: number; score: number }>;
  insights: string[];
  keywordCount: number;
}

export default function FreeResumeScannerPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);

  async function handleFileUpload(file: File) {
    setError('');
    setScanResult(null);
    setIsParsingPdf(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scan/parse-resume-pdf', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to parse resume PDF.');
        return;
      }

      setUploadedFileName(payload.fileName || file.name);
      setResumeText(payload.text || '');
    } catch {
      setError('Failed to upload and parse the PDF. Please try again.');
    } finally {
      setIsParsingPdf(false);
    }
  }

  async function handleScan() {
    setError('');
    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await fetch('/api/scan/keyword-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || 'Failed to scan resume.');
        return;
      }

      setScanResult(payload as ScanResponse);
    } catch {
      setError('An unexpected error occurred while scanning your resume.');
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            ← Back to RoleMirror
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                Log in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open full app
            </Link>
          </SignedIn>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Free Resume Keyword Scanner
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            Upload your resume and see what keywords you are missing.
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Get a quick match score, keyword gaps, and actionable insights. Sign up to unlock full resume rewrite.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-semibold text-slate-900">1) Upload resume PDF</label>
              <p className="mt-1 text-xs text-slate-500">
                Supports text-based PDFs only (no OCR/scanned PDFs).
                <br />
                5MB file size limit.
                <br />
                <br />
                <span className="text-xs text-slate-500">
                  Note: This is a free feature and we do not store any of your data.
                </span>
              </p>
              <input
                type="file"
                accept="application/pdf"
                className="mt-3 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) {
                    void handleFileUpload(selected);
                  }
                }}
              />
              {isParsingPdf && <p className="mt-2 text-xs text-blue-700">Parsing PDF...</p>}
              {uploadedFileName && !isParsingPdf && (
                <p className="mt-2 text-xs text-emerald-700">OK - resume uploaded</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label htmlFor="jobDescription" className="text-sm font-semibold text-slate-900">
                2) Paste job description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here..."
                className="mt-3 h-36 w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-800"
              />
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={isScanning || isParsingPdf || !resumeText.trim() || !jobDescription.trim()}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isScanning ? 'Scanning...' : 'Run free keyword scan'}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </section>

        {scanResult && (
          <section className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match score</p>
              <p className="mt-2 text-4xl font-semibold text-slate-900">{scanResult.matchScore}%</p>
              <p className="mt-2 text-xs text-slate-600">
                Based on weighted coverage across {scanResult.keywordCount} extracted keywords.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing must-have keywords</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {scanResult.missingMustHaveKeywords.length === 0 ? (
                  <span className="text-sm text-emerald-700">No must-have or important keyword gaps detected.</span>
                ) : (
                  [...scanResult.missingMustHaveKeywords, ...scanResult.importantKeywords].slice(0, 12).map((item) => (
                    <span
                      key={item.keyword}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                    >
                      {/* {item.keyword}({item.count}) |  tier: {item.tier} | score: {item.score} */}
                      {item.keyword}(score: {item.score})
                    </span>
                  ))
                  
                )}
              </div>
            </div>


            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Insights</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {scanResult.insights.map((insight) => (
                  <li key={insight}>• {insight}</li>
                ))}
              </ul>

              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900">Unlock full rewrite</p>
                <p className="mt-1 text-sm text-blue-800">
                  Sign up to generate full bullet rewrites and role-specific resume improvements.
                </p>
                <div className="mt-3">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Sign up to unlock full rewrite
                      </button>
                    </SignInButton>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href="/"
                      className="inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Go to full rewrite workspace
                    </Link>
                  </SignedIn>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
