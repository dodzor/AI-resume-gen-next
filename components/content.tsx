'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Result from './result'
import Form from './form'
import ResumeSwitcher from './ResumeSwitcher'

// Default empty form data
const getDefaultFormData = () => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  experiences: [{ role: '', company: '', dates: '', description: '' }],
  educationEntries: [{ degree: '', school: '', dates: '', gpa: '', coursework: '' }],
  certifications: [] as { name: string; dates: string }[],
  skills: '',
  portfolioProjects: [] as { name: string; toolsSkills: string; outcome: string }[],
  portfolioLink: '',
  job: '',
  template: 'professional-blue' as const,
  jobTitle: '',
  tone: '',
  summary: '',
  keywords: [] as string[],
  keywordsByCategory: {
    technicalSkills: [] as string[],
    toolsFrameworks: [] as string[],
    methodologies: [] as string[],
    domainTerms: [] as string[],
    qualifications: [] as string[],
    responsibilities: [] as string[]
  }
})

// localStorage keys
const LAST_EDITED_RESUME_KEY = 'lastEditedResumeId'
const LOADED_RESUME_DATA_KEY = 'loadedResumeData'

export default function Content() {
    // Form state - lifted up to parent
    const [formData, setFormData] = useState(getDefaultFormData())
    
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState('')
    const [isFormCompleted, setIsFormCompleted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPreview, setShowPreview] = useState(true)
    
    // Resume management state
    const [currentResumeId, setCurrentResumeId] = useState<Id<'resumes'> | null>(null)
    
    // Convex queries and mutations
    const resumes = useQuery(api.resumes.getUserResumes) // Get all user resumes
    const getResume = useQuery(
      api.resumes.getResume,
      currentResumeId ? { resumeId: currentResumeId } : "skip" // Get a single resume when ID is set
    )
    const saveResume = useMutation(api.resumes.saveResume)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [hasStartedEditing, setHasStartedEditing] = useState(false)
    
    // Loading and auto-save control
    const [isLoadingResume, setIsLoadingResume] = useState(true)
    const [hasUserEdited, setHasUserEdited] = useState(false)
    const [loadedResumeData, setLoadedResumeData] = useState<any>(null)
    
    // Refs for auto-save control
    const isInitialMount = useRef(true)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isLoadingFromConvex = useRef(false)
    
    // Helper function to check if formData has changed from loaded data
    const hasFormDataChanged = useCallback(() => {
      if (!loadedResumeData) return true // If no loaded data, consider it changed
      
      // Deep comparison of key fields
      const current = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        experiences: JSON.stringify(formData.experiences),
        educationEntries: JSON.stringify(formData.educationEntries),
        certifications: JSON.stringify(formData.certifications),
        skills: formData.skills,
        portfolioProjects: JSON.stringify(formData.portfolioProjects),
        portfolioLink: formData.portfolioLink,
        job: formData.job,
        jobTitle: formData.jobTitle,
        template: formData.template,
        tone: formData.tone,
        summary: formData.summary,
        keywords: JSON.stringify(formData.keywords || []),
        keywordsByCategory: JSON.stringify(formData.keywordsByCategory || {}),
        generatedResume: generatedResume
      }
      
      const loaded = {
        name: loadedResumeData.name || '',
        email: loadedResumeData.email || '',
        phone: loadedResumeData.phone || '',
        location: loadedResumeData.location || '',
        experiences: JSON.stringify(loadedResumeData.experiences || []),
        educationEntries: JSON.stringify(loadedResumeData.educationEntries || []),
        certifications: JSON.stringify(loadedResumeData.certifications || []),
        skills: loadedResumeData.skills || '',
        portfolioProjects: JSON.stringify(loadedResumeData.portfolioProjects || []),
        portfolioLink: loadedResumeData.portfolioLink || '',
        job: loadedResumeData.job || '',
        jobTitle: loadedResumeData.jobTitle || '',
        template: loadedResumeData.template || '',
        tone: loadedResumeData.tone || '',
        summary: loadedResumeData.summary || '',
        keywords: JSON.stringify(loadedResumeData.keywords || []),
        keywordsByCategory: JSON.stringify(loadedResumeData.keywordsByCategory || {}),
        generatedResume: loadedResumeData.generatedResume || ''
      }
      
      return JSON.stringify(current) !== JSON.stringify(loaded)
    }, [formData, generatedResume, loadedResumeData])
    
    // Auto-save function - memoized with useCallback
    const handleAutoSave = useCallback(async () => {
      // Don't save if still loading from Convex
      if (isLoadingFromConvex.current) {
        return
      }
      
      // Don't save if user hasn't edited yet
      if (!hasUserEdited) {
        return
      }
      
      // Don't save if form hasn't actually changed
      if (!hasFormDataChanged()) {
        return
      }
      
      // Mark that editing has started
      setHasStartedEditing(true)
      
      // Don't save if form is empty or missing required fields
      if (!formData.name || !formData.email) {
        return
      }
      
      try {
        setIsSaving(true)
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
          keywords: formData.keywords || undefined,
          keywordsByCategory: formData.keywordsByCategory || undefined,
          generatedResume: generatedResume || undefined,
        })
        
        setCurrentResumeId(resumeId)
        setLastSaved(new Date())
        
        // Update localStorage
        if (resumeId) {
          localStorage.setItem(LAST_EDITED_RESUME_KEY, resumeId)
          // Update loaded data to current state to prevent false change detection
          setLoadedResumeData({
            ...formData,
            generatedResume,
            _id: resumeId
          })
        }
      } catch (error) {
        console.error('Failed to auto-save resume:', error)
        // Silently fail for auto-save - user can manually save if needed
      } finally {
        setIsSaving(false)
      }
    }, [formData, generatedResume, currentResumeId, saveResume, hasUserEdited, hasFormDataChanged])
    
    // Load resume on mount
    useEffect(() => {
      const loadResume = async () => {
        if (resumes === undefined) {
          // Still loading resumes
          return
        }
        
        setIsLoadingResume(true)
        isLoadingFromConvex.current = true
        
        try {
          // 1. Check localStorage for last edited resume
          const lastEditedId = localStorage.getItem(LAST_EDITED_RESUME_KEY) as Id<'resumes'> | null
          
          let resumeToLoad: Id<'resumes'> | null = null
          
          if (lastEditedId) {
            // Check if resume still exists
            const resumeExists = resumes.some(r => r._id === lastEditedId)
            if (resumeExists) {
              resumeToLoad = lastEditedId
            }
          }
          
          // 2. If no resume from localStorage, use most recent
          if (!resumeToLoad && resumes.length > 0) {
            resumeToLoad = resumes[0]._id
          }
          
          // 3. Load the resume
          if (resumeToLoad) {
            setCurrentResumeId(resumeToLoad)
            // The getResume query will be called automatically via useQuery
          } else {
            // No resumes exist - start with empty form
            setFormData(getDefaultFormData())
            setCurrentResumeId(null)
            isLoadingFromConvex.current = false
            setIsLoadingResume(false)
          }
        } catch (error) {
          console.error('Error loading resume:', error)
          setFormData(getDefaultFormData())
          setCurrentResumeId(null)
          isLoadingFromConvex.current = false
          setIsLoadingResume(false)
        }
      }
      
      loadResume()
    }, [resumes])
    
    // Load resume data when currentResumeId or getResume result changes
    useEffect(() => {
      if (currentResumeId && getResume) {
        isLoadingFromConvex.current = true
        
        // Map Convex resume to form data
        const mappedFormData = {
          name: getResume.name || '',
          email: getResume.email || '',
          phone: getResume.phone || '',
          location: getResume.location || '',
          experiences: getResume.experiences || [],
          educationEntries: (getResume.educationEntries || []).map(edu => ({
            degree: edu.degree || '',
            school: edu.school || '',
            dates: edu.dates || '',
            gpa: edu.gpa || '',
            coursework: edu.coursework || ''
          })),
          certifications: getResume.certifications || [],
          skills: getResume.skills || '',
          portfolioProjects: getResume.portfolioProjects || [],
          portfolioLink: getResume.portfolioLink || '',
          job: getResume.job || '',
          jobTitle: getResume.jobTitle || '',
          template: (getResume.template || 'professional-blue') as 'professional-blue',
          tone: getResume.tone || '',
          summary: getResume.summary || '',
          keywords: getResume.keywords || [],
          keywordsByCategory: getResume.keywordsByCategory || {
            technicalSkills: [],
            toolsFrameworks: [],
            methodologies: [],
            domainTerms: [],
            qualifications: [],
            responsibilities: []
          }
        }
        
        setFormData(mappedFormData)
        setGeneratedResume(getResume.generatedResume || '')
        setLoadedResumeData({
          ...mappedFormData,
          generatedResume: getResume.generatedResume || '',
          _id: currentResumeId
        })
        
        // Update localStorage
        localStorage.setItem(LAST_EDITED_RESUME_KEY, currentResumeId)
        
        // Mark that we're done loading
        setTimeout(() => {
          isLoadingFromConvex.current = false
          setIsLoadingResume(false)
          setHasUserEdited(false) // Reset user edit flag
        }, 100)
      } else if (currentResumeId === null && resumes && resumes.length === 0) {
        // No resumes exist
        isLoadingFromConvex.current = false
        setIsLoadingResume(false)
      }
    }, [currentResumeId, getResume, resumes])
    
    // Track user edits
    useEffect(() => {
      if (!isLoadingFromConvex.current && !isInitialMount.current) {
        setHasUserEdited(true)
      }
    }, [formData, generatedResume])
    
    // Auto-save effect with 2 second debounce
    useEffect(() => {
      // Skip on initial mount or while loading
      if (isInitialMount.current || isLoadingFromConvex.current) {
        if (isInitialMount.current) {
          isInitialMount.current = false
        }
        return
      }
      
      // Only auto-save if user has edited
      if (!hasUserEdited) {
        return
      }
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Set new timeout for 2 seconds
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave()
      }, 2000)
      
      // Cleanup timeout on unmount or when dependencies change
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }, [formData, generatedResume, handleAutoSave, hasUserEdited])
    
    // Handler for creating new resume
    const handleCreateNew = useCallback(() => {
      console.log('Creating new resume')
      setFormData(getDefaultFormData())
      setGeneratedResume('')
      setCurrentResumeId(null)
      setLoadedResumeData(null)
      setHasUserEdited(false)
      localStorage.removeItem(LAST_EDITED_RESUME_KEY)
      isLoadingFromConvex.current = false
      setIsLoadingResume(false)
    }, [])
    
    // Handler for switching resumes
    const handleSelectResume = useCallback((resumeId: Id<'resumes'>) => {
      setCurrentResumeId(resumeId)
      isLoadingFromConvex.current = true
      setIsLoadingResume(true)
      setHasUserEdited(false)
    }, [])
    
    // Get current resume data for switcher
    const currentResumeForSwitcher = currentResumeId 
      ? resumes?.find(r => r._id === currentResumeId)
      : null
  
    // Show loading state
    if (isLoadingResume && resumes === undefined) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading your resumes...</p>
          </div>
        </div>
      )
    }
    
    // Show resume switcher if resumes exist or if we're not in initial loading
    const showResumeSwitcher = (resumes && resumes.length > 0) || (!isLoadingResume && resumes !== undefined)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="text-center py-6 px-4 sm:px-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">🤖 AI Resume Generator</h1>
            <p className="text-gray-600 text-base sm:text-lg">Create a professional resume in seconds with AI assistance</p>
            
            {/* Resume Switcher */}
            {showResumeSwitcher && (
              <div className="mt-4 flex justify-center">
                <ResumeSwitcher
                  resumes={resumes}
                  currentResumeId={currentResumeId}
                  onSelectResume={handleSelectResume}
                  onCreateNew={handleCreateNew}
                  isLoading={isLoadingResume}
                />
              </div>
            )}
            
            {/* Auto-save status indicator */}
            {hasStartedEditing && !isLoadingResume && (
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
            {isLoadingResume ? (
              <div className="max-w-5xl mx-auto mt-12 text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading resume...</p>
              </div>
            ) : isFormCompleted ? (
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
