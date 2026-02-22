'use client'

import { useQuery, useMutation, Authenticated, Unauthenticated } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { SignInButton } from '@clerk/nextjs'

function TestUsageContent() {
  const { userId } = useAuth()
  const [testResults, setTestResults] = useState<string[]>([])

  // Queries - these will only run when authenticated
  const userUsage = useQuery(api.usage.getUserUsage)
  const canAnalyze = useQuery(api.usage.canPerformAction, { action: 'job_analysis' })
  const canRewrite = useQuery(api.usage.canPerformAction, { action: 'ai_rewrite' })
  const canCreateResume = useQuery(api.usage.canPerformAction, { action: 'create_resume' })
  const canExport = useQuery(api.usage.canPerformAction, { action: 'export' })

  // Mutations
  const incrementUsage = useMutation(api.usage.incrementUsage)
  const updateUserPlan = useMutation(api.usage.updateUserPlan)
  const initializeUserUsage = useMutation(api.usage.initializeUserUsage)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testInitialize = async () => {
    try {
      addResult('Testing initializeUserUsage...')
      const result = await initializeUserUsage({})
      addResult(`✅ initializeUserUsage: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ initializeUserUsage error: ${error.message}`)
    }
  }

  const testIncrementJobAnalysis = async () => {
    try {
      addResult('Testing incrementUsage (job_analysis)...')
      const result = await incrementUsage({ action: 'job_analysis' })
      addResult(`✅ incrementUsage: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ incrementUsage error: ${error.message}`)
    }
  }

  const testIncrementRewrite = async () => {
    try {
      addResult('Testing incrementUsage (ai_rewrite)...')
      const result = await incrementUsage({ action: 'ai_rewrite' })
      addResult(`✅ incrementUsage: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ incrementUsage error: ${error.message}`)
    }
  }

  const testIncrementResume = async () => {
    try {
      addResult('Testing incrementUsage (create_resume)...')
      const result = await incrementUsage({ action: 'create_resume' })
      addResult(`✅ incrementUsage: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ incrementUsage error: ${error.message}`)
    }
  }

  const testUpgradeToPro = async () => {
    if (!userId) {
      addResult('❌ No user ID available')
      return
    }
    try {
      addResult('Testing updateUserPlan (free → pro)...')
      const result = await updateUserPlan({ 
        userId, 
        plan: 'pro',
        resetCounters: true 
      })
      addResult(`✅ updateUserPlan: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ updateUserPlan error: ${error.message}`)
    }
  }

  const testDowngradeToFree = async () => {
    if (!userId) {
      addResult('❌ No user ID available')
      return
    }
    try {
      addResult('Testing updateUserPlan (pro → free)...')
      const result = await updateUserPlan({ 
        userId, 
        plan: 'free',
        resetCounters: false 
      })
      addResult(`✅ updateUserPlan: ${JSON.stringify(result)}`)
    } catch (error: any) {
      addResult(`❌ updateUserPlan error: ${error.message}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Usage Tracking Test Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Usage Display */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current Usage</h2>
            
            {userUsage === undefined ? (
              <p className="text-gray-500">Loading...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Plan: <span className="text-blue-600">{userUsage.plan}</span></p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Usage:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Job Analyses: {userUsage.usage.jobAnalyses} / {userUsage.limits.jobAnalyses === -1 ? 'Unlimited' : userUsage.limits.jobAnalyses}</li>
                    <li>AI Rewrites: {userUsage.usage.aiRewrites} / {userUsage.limits.aiRewrites === -1 ? 'Unlimited' : userUsage.limits.aiRewrites}</li>
                    <li>Exports: {userUsage.usage.exports} / {userUsage.limits.exports === -1 ? 'Unlimited' : userUsage.limits.exports}</li>
                    <li>Resumes: {userUsage.usage.resumes} / {userUsage.limits.resumes === -1 ? 'Unlimited' : userUsage.limits.resumes}</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Billing Period:</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(userUsage.periodInfo.start).toLocaleDateString()} - {new Date(userUsage.periodInfo.end).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Checks */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Action Checks</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Job Analysis</span>
                {canAnalyze === undefined ? (
                  <span className="text-gray-400">Loading...</span>
                ) : canAnalyze.allowed ? (
                  <span className="text-green-600">✅ Allowed ({canAnalyze.remaining === -1 ? 'Unlimited' : `${canAnalyze.remaining} left`})</span>
                ) : (
                  <span className="text-red-600">❌ {canAnalyze.reason}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>AI Rewrite</span>
                {canRewrite === undefined ? (
                  <span className="text-gray-400">Loading...</span>
                ) : canRewrite.allowed ? (
                  <span className="text-green-600">✅ Allowed ({canRewrite.remaining === -1 ? 'Unlimited' : `${canRewrite.remaining} left`})</span>
                ) : (
                  <span className="text-red-600">❌ {canRewrite.reason}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Create Resume</span>
                {canCreateResume === undefined ? (
                  <span className="text-gray-400">Loading...</span>
                ) : canCreateResume.allowed ? (
                  <span className="text-green-600">✅ Allowed ({canCreateResume.remaining === -1 ? 'Unlimited' : `${canCreateResume.remaining} left`})</span>
                ) : (
                  <span className="text-red-600">❌ {canCreateResume.reason}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Export PDF</span>
                {canExport === undefined ? (
                  <span className="text-gray-400">Loading...</span>
                ) : canExport.allowed ? (
                  <span className="text-green-600">✅ Allowed ({canExport.remaining === -1 ? 'Unlimited' : `${canExport.remaining} left`})</span>
                ) : (
                  <span className="text-red-600">❌ {canExport.reason}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <button
              onClick={testInitialize}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Initialize Usage
            </button>
            <button
              onClick={testIncrementJobAnalysis}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Increment Job Analysis
            </button>
            <button
              onClick={testIncrementRewrite}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Increment AI Rewrite
            </button>
            <button
              onClick={testIncrementResume}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Increment Resume
            </button>
            <button
              onClick={testUpgradeToPro}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={testDowngradeToFree}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Downgrade to Free
            </button>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Test Results</h3>
              <button
                onClick={clearResults}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No test results yet. Click buttons above to test.</p>
              ) : (
                <ul className="space-y-1">
                  {testResults.map((result, idx) => (
                    <li key={idx} className="text-sm font-mono">{result}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">
            <strong>User ID:</strong> {userId}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function TestUsagePage() {
  return (
    <div>
      <Authenticated>
        <TestUsageContent />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen p-8 flex items-center justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Usage Tracking Test Page</h1>
            <p className="text-gray-600 mb-4">Please sign in to test usage tracking functions.</p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
    </div>
  )
}
