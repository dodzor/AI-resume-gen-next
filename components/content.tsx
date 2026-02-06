'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Result from './result'
import Form from './form'

export default function Content() {
    
    // Form state - lifted up to parent
    const [formData, setFormData] = useState({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '',
      location: '',
      experiences: [
        {
          role: 'Software Developer',
          company: 'Tech Corp',
          dates: '2020-2023',
          // description: 'Built web applications using React and Node.js.\nImproved system performance by 40%.\nLed a team of 3 developers.'
          description: ''
        },
        // {
          // role: 'Junior Developer',
          // company: 'StartupXYZ',
          // dates: '2019-2020',
          // description: 'Developed mobile apps using React Native.\nCollaborated with cross-functional teams.'
          // description: ''
        // }
      ],
      educationEntries: [
        {
          degree: 'Bachelor of Science in Computer Science',
          school: 'University of Technology',
          dates: '2015–2019',
          gpa: '3.8 / 4.0',
          coursework: 'Data Structures, Algorithms, Software Engineering'
        }
      ],
      certifications: [
        {
          name: 'AWS Certified Developer – Associate',
          dates: '2022'
        },
        {
          name: 'Google Cloud Professional Developer',
          dates: '2021'
        }
      ],
      skills: 'JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Problem Solving, Team Leadership',
      portfolioProjects: [
        {
          name: 'Mobile Banking Redesign',
          toolsSkills: 'UI/UX, Figma, usability testing',
          outcome: 'Increased task success rate by 32%'
        },
        {
          name: 'E-commerce Storefront',
          toolsSkills: 'React, Tailwind, Stripe',
          outcome: '5k+ users, 99.9% uptime'
        }
      ],
      portfolioLink: '',
      job: 'Senior Full Stack Developer position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms.',
      template: 'professional-blue' as const,
      jobTitle: '',
      tone: '',
      summary: ''
    })
    
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState('')
    const [isFormCompleted, setIsFormCompleted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPreview, setShowPreview] = useState(true)
    
    // Convex mutations for auto-save
    const saveResume = useMutation(api.resumes.saveResume)
    const [currentResumeId, setCurrentResumeId] = useState<Id<'resumes'> | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [hasStartedEditing, setHasStartedEditing] = useState(false)
    
    // Ref to track if this is the initial mount (skip auto-save on mount)
    const isInitialMount = useRef(true)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    
    // Auto-save function - memoized with useCallback
    const handleAutoSave = useCallback(async () => {
      console.log('handleAutoSave called', { formData, currentResumeId })
      
      // Mark that editing has started
      setHasStartedEditing(true)
      
      // Don't save if form is empty or missing required fields
      if (!formData.name || !formData.email) {
        console.log('Skipping save - missing required fields')
        return
      }
      
      try {
        setIsSaving(true)
        console.log('Saving resume...', formData)
        const resumeId = await saveResume({
          resumeId: currentResumeId ?? undefined,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          location: formData.location || undefined,
          experiences: formData.experiences || [],
          educationEntries: formData.educationEntries || [],
          certifications: formData.certifications || [],
          skills: formData.skills || '',
          portfolioProjects: formData.portfolioProjects || [],
          portfolioLink: formData.portfolioLink || undefined,
          job: formData.job || undefined,
          jobTitle: formData.jobTitle || undefined,
          template: formData.template || undefined,
          tone: formData.tone || undefined,
          summary: formData.summary || undefined,
          generatedResume: generatedResume || undefined,
        })
        
        setCurrentResumeId(resumeId)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to auto-save resume:', error)
        // Silently fail for auto-save - user can manually save if needed
      } finally {
        setIsSaving(false)
      }
    }, [formData, generatedResume, currentResumeId, saveResume])
    
    // Auto-save effect with 2 second debounce
    useEffect(() => {
      console.log('Auto-save useEffect triggered', { 
        isInitialMount: isInitialMount.current,
        formDataName: formData.name,
        formDataEmail: formData.email 
      })
      
      // Skip on initial mount
      if (isInitialMount.current) {
        console.log('Skipping initial mount')
        isInitialMount.current = false
        return
      }
      
      console.log('Setting up auto-save timeout (2 seconds)')
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        console.log('Clearing existing timeout')
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Set new timeout for 2 seconds
      saveTimeoutRef.current = setTimeout(() => {
        console.log('Timeout fired - calling handleAutoSave')
        handleAutoSave()
      }, 2000)
      
      // Cleanup timeout on unmount or when dependencies change
      return () => {
        if (saveTimeoutRef.current) {
          console.log('Cleaning up timeout')
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }, [formData, generatedResume, handleAutoSave]) // Watch formData and generatedResume directly
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="text-center py-6 px-4 sm:px-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">🤖 AI Resume Generator</h1>
            <p className="text-gray-600 text-base sm:text-lg">Create a professional resume in seconds with AI assistance</p>
            {/* Auto-save status indicator */}
            {hasStartedEditing && (
              <div className="mt-2 text-sm text-gray-500">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">💾</span>
                    <span>Saving...</span>
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center justify-center gap-2">
                    <span>✓</span>
                    <span>Saved {lastSaved.toLocaleTimeString()}</span>
                  </span>
                ) : null}
              </div>
            )}
          </div>
  
          <div className="px-4 sm:px-6 pb-6">
            {isFormCompleted ? (
              // Full-width layout when form is completed
              <div className="max-w-5xl mx-auto space-y-6">
                <Form 
                  formData={formData}
                  setFormData={setFormData}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  setGeneratedResume={setGeneratedResume}
                  isFormCompleted={isFormCompleted}
                  setIsFormCompleted={setIsFormCompleted}
                  currentStep={currentStep}
                  setCurrentStep={setCurrentStep}
                  showPreview={showPreview}
                  setShowPreview={setShowPreview}
                />
                <Result 
                  formData={formData} 
                  generatedResume={generatedResume}
                  currentStep={currentStep}
                  showPreview={true}
                />
              </div>
            ) : (
              // Responsive side-by-side layout during form filling
              <div className={`grid gap-4 sm:gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} ${showPreview ? 'lg:h-[calc(100vh-220px)]' : ''}`}>
                {/* Form Section - Left on desktop, top on mobile */}
                <div className={`${showPreview ? 'lg:order-1' : ''} ${showPreview ? 'lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden' : ''}`}>
                  <div className={`${showPreview ? 'lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:-mr-2 custom-scrollbar' : ''}`}>
                    <Form 
                      formData={formData}
                      setFormData={setFormData}
                      isGenerating={isGenerating}
                      setIsGenerating={setIsGenerating}
                      setGeneratedResume={setGeneratedResume}
                      isFormCompleted={isFormCompleted}
                      setIsFormCompleted={setIsFormCompleted}
                      currentStep={currentStep}
                      setCurrentStep={setCurrentStep}
                      showPreview={showPreview}
                      setShowPreview={setShowPreview}
                    />
                  </div>
                </div>
                
                {/* Preview Section - Right on desktop, bottom on mobile */}
                {showPreview && (
                  <div className="lg:order-2 lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
                    <div className="lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:-mr-2 custom-scrollbar">
                      <Result 
                        formData={formData} 
                        generatedResume={generatedResume}
                        currentStep={currentStep}
                        showPreview={showPreview}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Footer */}
          <div className="text-center py-6 px-4 text-gray-500 text-sm">
            <p>Powered by AI • Generate professional resumes in seconds</p>
          </div>
        </div>
      </div>
    )
}
