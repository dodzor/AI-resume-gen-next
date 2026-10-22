'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Result from './result'
import Form from './form'
import ResumeSwitcher from './ResumeSwitcher'
import MasterCareerPanel from './MasterCareerPanel'
import ResumeEntryGate from './ResumeEntryGate'
import { UserButton } from '@clerk/nextjs'
import { useUsageLimits } from '@/hooks/useUsageLimits'
import UpgradeModal from './UpgradeModal'
import { mergeImportedResume } from '@/lib/mergeResumeImport'
import type { ResumeImportPayload } from '@/lib/resumeImportSchema'
import type { ResumeMergeMode } from '@/lib/mergeResumeImport'
import type { ActionType } from '@/lib/plan-limits'

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
  template: 'modern-minimal' as const,
  kind: 'tailored' as 'master' | 'tailored',
  rawDump: '',
  clarifyingQA: [] as { question: string; answer?: string; askedAt: number }[],
  confirmedFacts: [] as string[],
  masterResumeId: undefined as Id<'resumes'> | undefined,
  extractedRequirements: [] as string[],
  gaps: [] as string[],
  overlapPhrases: [] as string[],
  targetJobs: [] as string[],
  hostileReviews: [] as {
    createdAt: number
    stopReading: string
    verdict: string
    annotations: { target: string; labels: string[]; note: string }[]
  }[],
  jobTitle: '',
  tone: '',
  summary: '',
  keywords: [] as string[],
  keywordsByCategory: {
    mustHaveTechnicalTerms: [] as string[],
    niceToHaveTechnicalTerms: [] as string[],
    toolsFrameworks: [] as string[],
    methodologies: [] as string[],
    domainTerms: [] as string[],
    qualifications: [] as string[],
    responsibilities: [] as string[]
  },
  rawKeywordsByCategory: null as null | {
    mustHaveTechnicalTerms?: string[],
    niceToHaveTechnicalTerms?: string[],
    toolsFrameworks?: string[],
    methodologies?: string[],
    domainTerms?: string[],
    qualifications?: string[],
    responsibilities?: string[]
  },
  keywordsWithCounts: [] as { keyword: string; count: number; weight: number }[],
  themes: [] as string[],
  recommendations: [] as string[],
  thematicSummary: ''
})

// localStorage keys
const LAST_EDITED_RESUME_KEY = 'lastEditedResumeId'
const LOADED_RESUME_DATA_KEY = 'loadedResumeData'

export default function Content() {
    const debugLog = (...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[ResumeFlowDebug]', ...args)
      }
    }

    // Form state - lifted up to parent
    const [formData, setFormData] = useState(getDefaultFormData())
    
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState('')
    const [isFormCompleted, setIsFormCompleted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPreview, setShowPreview] = useState(true)
    const [showForm, setShowForm] = useState(true)
    
    // Resume management state
    const [currentResumeId, setCurrentResumeId] = useState<Id<'resumes'> | null>(null)
    
    // Usage limits and upgrade modal state
    const { canCreateResume, plan } = useUsageLimits()
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)
    const [upgradeModalAction, setUpgradeModalAction] = useState<ActionType>('create_resume')

    /** Pre–step-1 flow: import PDF vs start fresh (`null` until first load resolves). */
    const [resumeEntryPhase, setResumeEntryPhase] = useState<
      'choose' | 'import_upload' | 'import_review' | 'done' | null
    >(null)
    const [resumeImportText, setResumeImportText] = useState('')
    const [resumeImportFileName, setResumeImportFileName] = useState('')
    const [importMeta, setImportMeta] = useState<{ fileName: string; importedAt: number } | null>(null)
    
    // Convex queries and mutations
    const resumes = useQuery(api.resumes.getUserResumes) // Get all user resumes
    const getResume = useQuery(
      api.resumes.getResume,
      currentResumeId ? { resumeId: currentResumeId } : "skip" // Get a single resume when ID is set
    )
    const saveResume = useMutation(api.resumes.saveResume)
    const deleteResume = useMutation(api.resumes.deleteResume)
    const ensureMaster = useMutation(api.resumes.ensureMaster)
    const createApplicationFromMaster = useMutation(api.resumes.createApplicationFromMaster)
    const [tailorUrl, setTailorUrl] = useState<string | null>(null)
    const discoveredJob = useQuery(
      api.softwareJobs.getSoftwareJobByUrl,
      tailorUrl ? { url: tailorUrl } : 'skip'
    )
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [hasStartedEditing, setHasStartedEditing] = useState(false)
    
    // Loading control
    const [isLoadingResume, setIsLoadingResume] = useState(true)
    const [loadedResumeData, setLoadedResumeData] = useState<any>(null)

    const [maxStepReached, setMaxStepReached] = useState<number>(1) // Track the maximum step reached in the form
    
    // Refs for loading control
    const isInitialMount = useRef(true)
    const isLoadingFromConvex = useRef(false)
    const lastLoadedResumeId = useRef<string | null>(null)
    const justCreatedResumeId = useRef<string | null>(null)
    const skipAutoLoad = useRef(false)
    const formDataRef = useRef(formData)
    formDataRef.current = formData
    const currentResumeIdRef = useRef(currentResumeId)
    currentResumeIdRef.current = currentResumeId
    // Bumped when the user opens another record, so an in-flight autosave
    // cannot write the previous id back over that choice.
    const navigationEpoch = useRef(0)

    useEffect(() => {
      const url = new URLSearchParams(window.location.search).get('tailorUrl')
      if (url) setTailorUrl(url)
    }, [])
    
    // Save function - called when user navigates steps
    const handleSave = useCallback(async (override?: Record<string, unknown>) => {
      const formData = { ...formDataRef.current, ...override }
      const savedForId = currentResumeIdRef.current
      const epoch = navigationEpoch.current
      // Don't save if still loading from Convex
      if (isLoadingFromConvex.current) {
        debugLog('handleSave:skipped:isLoadingFromConvex', {
          currentResumeId,
          currentStep,
          maxStepReached,
        })
        return
      }
      
      try {
        debugLog('handleSave:start', {
          currentResumeId,
          currentStep,
          maxStepReached,
          name: formData.name,
        })
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
          keywordsWithCounts: formData.keywordsWithCounts?.length
            ? formData.keywordsWithCounts
            : undefined,
          themes: formData.themes || undefined,
          recommendations: formData.recommendations || undefined,
          thematicSummary: formData.thematicSummary || undefined,
          generatedResume: generatedResume || undefined,
          maxStepReached: maxStepReached || undefined,
          kind: formData.kind === 'master' ? 'master' : 'tailored',
          rawDump: formData.rawDump || undefined,
          clarifyingQA: formData.clarifyingQA?.length ? formData.clarifyingQA : undefined,
          confirmedFacts: formData.confirmedFacts?.length ? formData.confirmedFacts : undefined,
          masterResumeId: formData.masterResumeId,
          extractedRequirements: formData.extractedRequirements?.length ? formData.extractedRequirements : undefined,
          gaps: formData.gaps?.length ? formData.gaps : undefined,
          overlapPhrases: formData.overlapPhrases?.length ? formData.overlapPhrases : undefined,
          targetJobs: formData.targetJobs?.length ? formData.targetJobs : undefined,
          hostileReviews: formData.hostileReviews?.length ? formData.hostileReviews.slice(-3) : undefined,
        })
        
        const switchedAway = navigationEpoch.current !== epoch || (currentResumeIdRef.current !== savedForId && currentResumeIdRef.current !== resumeId)
        debugLog('handleSave:success', {
          previousResumeId: savedForId,
          savedResumeId: resumeId,
          currentStep,
          maxStepReached,
          switchedAway,
        })
        // A click on Career record blurs the field and starts this save.
        // If that click already opened another record, keep the user's selection.
        if (switchedAway) return
        setCurrentResumeId(resumeId)
        setLastSaved(new Date())
        setHasStartedEditing(true)
        
        // Hide preview when creating a new resume
        if (!currentResumeId && resumeId) {
          // Mark this resume as newly created so load effect does not
          // overwrite step navigation that happens right after first save.
          justCreatedResumeId.current = resumeId
          debugLog('handleSave:firstCreate', {
            justCreatedResumeId: resumeId,
            currentStep,
            maxStepReached,
          })
          setShowPreview(false)
        }
        
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
      } catch (error: any) {
        console.error('Failed to save resume:', error)
        debugLog('handleSave:error', {
          error: error?.message,
          code: error?.code,
          upgradeRequired: error?.upgradeRequired,
          currentResumeId,
          currentStep,
          maxStepReached,
        })
        
        // Check if error is due to usage limit
        if (error?.upgradeRequired || error?.code === 'USAGE_LIMIT_EXCEEDED') {
          setUpgradeModalAction('create_resume')
          setShowUpgradeModal(true)
          return
        }
        
        alert(error?.message || 'Failed to save resume. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }, [formData, generatedResume, currentResumeId, maxStepReached, saveResume])
    
    // Load resume on mount
    useEffect(() => {
      const loadResume = async () => {
        if (resumes === undefined) {
          // Still loading resumes
          debugLog('loadResume:waitingForResumes')
          return
        }

        if (skipAutoLoad.current) {
          debugLog('loadResume:skipped:userEditingNewResume')
          return
        }

        // A record is already open. List refreshes after a save, and a brand-new
        // career record is not in the list for a moment. Picking again would
        // replace the editor or undo the click that opened it.
        if (currentResumeId) {
          debugLog('loadResume:skipped:alreadyOpen', { currentResumeId })
          return
        }
        
        debugLog('loadResume:start', {
          resumesCount: resumes.length,
          currentResumeId,
          currentStep,
          maxStepReached,
        })
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
            debugLog('loadResume:resumeSelected', {
              resumeToLoad,
              reason: lastEditedId === resumeToLoad ? 'localStorage' : 'mostRecent',
            })
            setCurrentResumeId(resumeToLoad)
            // The getResume query will be called automatically via useQuery
          } else {
            // No resumes exist - start with empty form
            debugLog('loadResume:noResumes:resetToDefaults')
            setFormData(getDefaultFormData())
            setCurrentResumeId(null)
            setCurrentStep(1)
            setMaxStepReached(1)
            setResumeEntryPhase('choose')
            setImportMeta(null)
            setResumeImportText('')
            setResumeImportFileName('')
            isLoadingFromConvex.current = false
            setIsLoadingResume(false)
          }
        } catch (error) {
          console.error('Error loading resume:', error)
          debugLog('loadResume:error', {
            error,
            currentResumeId,
            currentStep,
            maxStepReached,
          })
          setFormData(getDefaultFormData())
          setCurrentResumeId(null)
          setResumeEntryPhase('choose')
          isLoadingFromConvex.current = false
          setIsLoadingResume(false)
        }
      }
      
      loadResume()
    }, [resumes, currentResumeId])
    
    // Load resume data when currentResumeId or getResume result changes
    useEffect(() => {
      if (currentResumeId && getResume) {
        // The query can still be the previous record for a render after the id changes.
        if (getResume._id !== currentResumeId) return
        // Check if we're actually switching to a different resume
        const isSwitchingResume = lastLoadedResumeId.current !== currentResumeId
        if (!isSwitchingResume) {
          // The open document echoed our own save. Replacing form state here
          // drops focus in the field the user just moved to.
          isLoadingFromConvex.current = false
          setIsLoadingResume(false)
          return
        }
        debugLog('hydrateResume:start', {
          currentResumeId,
          lastLoadedResumeId: lastLoadedResumeId.current,
          isSwitchingResume,
          currentStep,
          maxStepReached,
          savedMaxStep: getResume.maxStepReached,
          justCreatedResumeId: justCreatedResumeId.current,
        })
        
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
          template: (getResume.template || 'modern-minimal') as 'modern-minimal',
          tone: getResume.tone || '',
          summary: getResume.summary || '',
          keywords: getResume.keywords || [],
          keywordsByCategory: (() => {
            const kbc = getResume.keywordsByCategory as
              | {
                  mustHaveTechnicalTerms?: string[]
                  niceToHaveTechnicalTerms?: string[]
                  technicalSkills?: string[]
                  toolsFrameworks?: string[]
                  methodologies?: string[]
                  domainTerms?: string[]
                  qualifications?: string[]
                  responsibilities?: string[]
                }
              | undefined
            if (!kbc) {
              return {
                mustHaveTechnicalTerms: [],
                niceToHaveTechnicalTerms: [],
                toolsFrameworks: [],
                methodologies: [],
                domainTerms: [],
                qualifications: [],
                responsibilities: []
              }
            }
            const must = kbc.mustHaveTechnicalTerms?.length
              ? kbc.mustHaveTechnicalTerms
              : kbc.technicalSkills || []
            return {
              mustHaveTechnicalTerms: must,
              niceToHaveTechnicalTerms: kbc.niceToHaveTechnicalTerms || [],
              toolsFrameworks: kbc.toolsFrameworks || [],
              methodologies: kbc.methodologies || [],
              domainTerms: kbc.domainTerms || [],
              qualifications: kbc.qualifications || [],
              responsibilities: kbc.responsibilities || []
            }
          })(),
          rawKeywordsByCategory: null,
          keywordsWithCounts: getResume.keywordsWithCounts ?? [],
          themes: getResume.themes || [],
          recommendations: getResume.recommendations || [],
          thematicSummary: getResume.thematicSummary || '',
          kind: (getResume.kind === 'master' ? 'master' : 'tailored') as 'master' | 'tailored',
          rawDump: getResume.rawDump || '',
          clarifyingQA: getResume.clarifyingQA || [],
          confirmedFacts: getResume.confirmedFacts || [],
          masterResumeId: getResume.masterResumeId,
          extractedRequirements: getResume.extractedRequirements || [],
          gaps: getResume.gaps || [],
          overlapPhrases: getResume.overlapPhrases || [],
          targetJobs: getResume.targetJobs || [],
          hostileReviews: getResume.hostileReviews || [],
        }
        
        setFormData(mappedFormData)
        setGeneratedResume(getResume.generatedResume || '')
        setResumeEntryPhase('done')
        setImportMeta(null)
        setLoadedResumeData({
          ...mappedFormData,
          generatedResume: getResume.generatedResume || '',
          _id: currentResumeId
        })
        
        const isJustCreatedResume = justCreatedResumeId.current === currentResumeId

        // Only restore step position when actually switching resumes, not when navigating
        if (isSwitchingResume && !isJustCreatedResume) {
          // Restore maxStepReached and set currentStep to next step
          const savedMaxStep = Math.max(1, getResume.maxStepReached || 1)
          setMaxStepReached(savedMaxStep)
          // Set currentStep to maxStepReached or 8 if it's greater than 8
          const nextStep = savedMaxStep >= 8 ? 8 : savedMaxStep
          debugLog('hydrateResume:restoreStep', {
            currentResumeId,
            savedMaxStep,
            nextStep,
            currentStepBeforeSet: currentStep,
          })
          setCurrentStep(nextStep)
        } else {
          // Just restore maxStepReached without changing currentStep
          const savedMaxStep = Math.max(1, getResume.maxStepReached || 1)
          setMaxStepReached(savedMaxStep)
          debugLog('hydrateResume:preserveCurrentStep', {
            currentResumeId,
            savedMaxStep,
            currentStepPreserved: currentStep,
            isSwitchingResume,
            isJustCreatedResume,
          })
        }

        if (isJustCreatedResume) {
          debugLog('hydrateResume:clearJustCreatedFlag', { currentResumeId })
          justCreatedResumeId.current = null
        }
        
        // Update the last loaded resume ID
        lastLoadedResumeId.current = currentResumeId
        
        // Update localStorage
        localStorage.setItem(LAST_EDITED_RESUME_KEY, currentResumeId)
        
        // Mark that we're done loading
        setTimeout(() => {
          isLoadingFromConvex.current = false
          setIsLoadingResume(false)
          debugLog('hydrateResume:done', {
            currentResumeId,
            currentStep,
            maxStepReached,
          })
        }, 100)
      } else if (currentResumeId === null && resumes && resumes.length === 0) {
        // No resumes exist
        debugLog('hydrateResume:none')
        isLoadingFromConvex.current = false
        setIsLoadingResume(false)
      }
    }, [currentResumeId, getResume, resumes])
    
    
    // Mark initial mount as complete
    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false
      }
    }, [])
    
    // Hide preview on step 1 and step 2 only when Full Name is not set
    useEffect(() => {
      if ((currentStep === 1 || currentStep === 2) && !formData.name) {
        setShowPreview(false)
      }
      else if (currentStep >= 3) {
        setShowPreview(true)
      }
    }, [currentStep, formData.name])

    useEffect(() => {
      debugLog('state:stepChanged', {
        currentStep,
        maxStepReached,
        currentResumeId,
        isLoadingFromConvex: isLoadingFromConvex.current,
      })
    }, [currentStep, maxStepReached, currentResumeId])
    
    const resetEditor = useCallback(() => {
      setFormData(getDefaultFormData())
      setGeneratedResume('')
      setCurrentResumeId(null)
      setLoadedResumeData(null)
      setCurrentStep(1)
      setMaxStepReached(1)
      setShowPreview(false)
      setResumeEntryPhase('choose')
      setImportMeta(null)
      setResumeImportText('')
      setResumeImportFileName('')
      lastLoadedResumeId.current = null
      skipAutoLoad.current = true
      localStorage.removeItem(LAST_EDITED_RESUME_KEY)
      isLoadingFromConvex.current = false
      setIsLoadingResume(false)
    }, [])

    const handleDeleteResume = useCallback(async (resumeId: Id<'resumes'>) => {
      const remaining = (resumes ?? []).filter((resume) => resume._id !== resumeId)
      const isCurrent = currentResumeId === resumeId
      const previousLastEdited = localStorage.getItem(LAST_EDITED_RESUME_KEY)

      if (isCurrent && remaining.length > 0) {
        const nextId = remaining[0]._id
        localStorage.setItem(LAST_EDITED_RESUME_KEY, nextId)
        skipAutoLoad.current = false
        isLoadingFromConvex.current = true
        flushSync(() => {
          setCurrentResumeId(nextId)
        })
      } else if (isCurrent) {
        // Unsubscribe before the document is removed so getResume does not throw.
        localStorage.removeItem(LAST_EDITED_RESUME_KEY)
        lastLoadedResumeId.current = null
        flushSync(() => {
          setCurrentResumeId(null)
        })
      } else if (previousLastEdited === resumeId && currentResumeId) {
        localStorage.setItem(LAST_EDITED_RESUME_KEY, currentResumeId)
      }

      try {
        await deleteResume({ resumeId })
        if (isCurrent && remaining.length === 0) {
          resetEditor()
        }
      } catch (error: any) {
        console.error('Failed to delete resume:', error)
        if (isCurrent && currentResumeId) {
          skipAutoLoad.current = false
          localStorage.setItem(LAST_EDITED_RESUME_KEY, currentResumeId)
          isLoadingFromConvex.current = true
          setCurrentResumeId(currentResumeId)
        } else if (previousLastEdited) {
          localStorage.setItem(LAST_EDITED_RESUME_KEY, previousLastEdited)
        }
        alert(error?.message || 'Failed to delete resume. Please try again.')
        throw error
      }
    }, [resumes, currentResumeId, deleteResume, resetEditor])

    const handleOpenMaster = useCallback(async () => {
      const epoch = ++navigationEpoch.current
      try {
        const masterId = await ensureMaster({})
        if (navigationEpoch.current !== epoch) return
        skipAutoLoad.current = false
        isLoadingFromConvex.current = true
        currentResumeIdRef.current = masterId
        setCurrentResumeId(masterId)
        setResumeEntryPhase('done')
      } catch (error: any) {
        alert(error?.message || 'Could not open the career record.')
      }
    }, [ensureMaster])

    const handleCreateApplication = useCallback(async (job?: string, jobTitle?: string) => {
      const epoch = ++navigationEpoch.current
      const master = (resumes ?? []).find((resume) => resume.kind === 'master')
      if (!master) {
        await handleOpenMaster()
        return
      }
      try {
        const resumeId = await createApplicationFromMaster({
          masterResumeId: master._id,
          job,
          jobTitle,
        })
        if (navigationEpoch.current !== epoch) return
        skipAutoLoad.current = false
        isLoadingFromConvex.current = true
        currentResumeIdRef.current = resumeId
        setCurrentResumeId(resumeId)
        setResumeEntryPhase('done')
        setCurrentStep(1)
      } catch (error: any) {
        if (error?.upgradeRequired || error?.code === 'USAGE_LIMIT_EXCEEDED') {
          setUpgradeModalAction('create_resume')
          setShowUpgradeModal(true)
          return
        }
        alert(error?.message || 'Could not create the application.')
      }
    }, [resumes, createApplicationFromMaster, handleOpenMaster])

    const handleStartFreshFromGate = useCallback(() => {
      setImportMeta(null)
      void handleOpenMaster()
    }, [handleOpenMaster])

    const handlePdfParsed = useCallback((text: string, fileName: string) => {
      setResumeImportText(text)
      setResumeImportFileName(fileName)
    }, [])

    const handleClearImport = useCallback(() => {
      setResumeImportText('')
      setResumeImportFileName('')
    }, [])

    const handleFinishImport = useCallback(
      (data: ResumeImportPayload, mode: ResumeMergeMode) => {
        const hasMaster = (resumes ?? []).some((resume) => resume.kind === 'master')
        setFormData((prev) => {
          const merged = mergeImportedResume(prev as Record<string, unknown>, data, mode) as typeof prev
          if (hasMaster) return merged
          return { ...merged, kind: 'master' as const, rawDump: resumeImportText || prev.rawDump }
        })
        setImportMeta({ fileName: resumeImportFileName || 'resume.pdf', importedAt: Date.now() })
        setResumeEntryPhase('done')
      },
      [resumeImportFileName, resumeImportText, resumes]
    )

    const handleImportUpgradeRequired = useCallback(() => {
      setUpgradeModalAction('ai_rewrite')
      setShowUpgradeModal(true)
    }, [])

    const handleReimport = useCallback(() => {
      if (
        !confirm(
          'Re-import a PDF? You can merge extracted data again (by default only empty fields are filled).'
        )
      ) {
        return
      }
      handleClearImport()
      setResumeEntryPhase('import_upload')
    }, [handleClearImport])
    
    // Handler for switching resumes
    const handleSelectResume = useCallback((resumeId: Id<'resumes'>) => {
      navigationEpoch.current += 1
      skipAutoLoad.current = false
      isLoadingFromConvex.current = true
      currentResumeIdRef.current = resumeId
      setCurrentResumeId(resumeId)
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
    const masterRecord = resumes?.find((resume) => resume.kind === 'master')

    const showResumeEntryGate =
      resumeEntryPhase === 'choose' ||
      resumeEntryPhase === 'import_upload' ||
      resumeEntryPhase === 'import_review'
    
    return (
      <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-[1920px] mx-auto">
          {/* Navigation bar */}
          <header className="relative border-b border-gray-200 bg-white/80 backdrop-blur">
            <div className="flex max-w-6xl items-center justify-between gap-4 px-4 pr-14 sm:px-6 sm:pr-16">
              {/* Left: Brand */}
              <div className="min-w-0 flex shrink-0 items-center gap-2">
                {/* <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <span className="text-lg font-semibold">RM</span>
                </div> */}
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src="/logo-mirror.jpg"
                    alt="RoleMirror"
                    className="h-full w-full object-contain"
                  />
                </div>
                {/* <div className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold tracking-tight text-slate-900">
                    RoleMirror
                  </span>
                  <span className="text-xs text-gray-500">
                    Job description intelligence
                  </span>
                </div> */}
              </div>

              {/* Right: Resume switcher + autosave (reserve space for UserButton) */}
              <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
                {showResumeSwitcher && (
                  <ResumeSwitcher
                    resumes={resumes}
                    currentResumeId={currentResumeId}
                    onSelectResume={handleSelectResume}
                    onDeleteResume={handleDeleteResume}
                    onOpenMaster={() => { void handleOpenMaster() }}
                    onCreateApplication={() => { void handleCreateApplication() }}
                    isLoading={isLoadingResume}
                  />
                )}

                {hasStartedEditing && !isLoadingResume && (
                  <div className="text-[11px] text-gray-500">
                    {isSaving ? (
                      <span className="flex items-center justify-end gap-1.5">
                        <span className="animate-spin">💾</span>
                        <span>Saving...</span>
                      </span>
                    ) : lastSaved ? (
                      <span className="flex items-center justify-end gap-1.5">
                        <span>✓</span>
                        <span>Saved {lastSaved.toLocaleTimeString()}</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {/* Pinned to the right edge of the header bar */}
            <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 sm:right-6">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'h-9 w-9',
                  },
                }}
              />
            </div>
          </header>

          <div className="px-4 pt-8 sm:px-6 pb-6">
            {discoveredJob && (
              <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-blue-200 bg-white px-4 py-3 text-sm text-slate-800">
                <p className="font-medium">Use this discovered role: {discoveredJob.title} at {discoveredJob.companyName}</p>
                <p className="mt-1 text-slate-600">The description is copied into a new application. It does not invent experience.</p>
                <button
                  type="button"
                  onClick={() => { void handleCreateApplication(discoveredJob.text, discoveredJob.title) }}
                  className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  New application with this job
                </button>
              </div>
            )}
            {showResumeEntryGate && resumeEntryPhase !== null ? (
              <ResumeEntryGate
                phase={resumeEntryPhase}
                onPhaseChange={setResumeEntryPhase}
                resumeImportText={resumeImportText}
                resumeImportFileName={resumeImportFileName}
                onPdfParsed={handlePdfParsed}
                onClearImport={handleClearImport}
                onStartFresh={handleStartFreshFromGate}
                onFinishImport={handleFinishImport}
                onUpgradeRequired={handleImportUpgradeRequired}
              />
            ) : isLoadingResume ? (
              <div className="max-w-5xl mx-auto mt-12 text-center">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Loading resume...</p>
              </div>
            ) : formData.kind === 'master' ? (
              <MasterCareerPanel
                formData={formData}
                setFormData={setFormData}
                onSave={handleSave}
              />
            ) : isFormCompleted ? (
              // Full-width layout when form is completed
              <div className="max-w-5xl mx-auto space-y-6">
                    {showForm && (
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
                        onSave={handleSave}
                        currentResumeId={currentResumeId}
                        importMeta={importMeta}
                        onReimport={handleReimport}
                        masterRecord={masterRecord}
                      />
                    )}
                <Result 
                  formData={formData} 
                  generatedResume={generatedResume}
                  currentStep={currentStep}
                  showPreview={true}
                  showForm={showForm}
                  setShowForm={setShowForm}
                />
              </div>
            ) : (
              // Responsive side-by-side layout during form filling
              <div className={`grid gap-4 sm:gap-6 ${showForm && showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} ${showPreview ? 'lg:h-[calc(100vh-220px)]' : ''}`}>
                {/* Form Section - Left on desktop, top on mobile */}
                {showForm && (
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
                        maxStepReached={maxStepReached}
                        setMaxStepReached={setMaxStepReached}
                        onSave={handleSave}
                        currentResumeId={currentResumeId}
                        importMeta={importMeta}
                        onReimport={handleReimport}
                        masterRecord={masterRecord}
                      />
                    </div>
                  </div>
                )}
                
                {/* Preview Section - Right on desktop, bottom on mobile */}
                {showPreview && (
                  <div className={`${showForm ? 'lg:order-2' : ''} lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden`}>
                    <div className="lg:flex-1 lg:overflow-y-auto lg:pr-2 lg:-mr-2 custom-scrollbar">
                      <Result 
                        formData={formData} 
                        generatedResume={generatedResume}
                        currentStep={currentStep}
                        showPreview={showPreview}
                        showForm={showForm}
                        setShowForm={setShowForm}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Footer */}
          <div className="text-center py-6 px-4 text-gray-500 text-sm">
            <p>© 2026 RoleMirror. All rights reserved.</p>
          </div>
        </div>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        action={upgradeModalAction}
        plan={plan}
      />
      </>
    )
}
