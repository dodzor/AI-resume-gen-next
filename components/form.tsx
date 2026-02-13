'use client'

import { useState, useEffect } from 'react'
import { TEMPLATES, TemplateId } from '../lib/templates'

import { generateFileName } from '../lib/pdfUtils'
import { validatePDFContent } from '../lib/pdfErrorHandler'
import { generateSimplePreview } from '../lib/utils'

interface FormProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  setGeneratedResume: (resume: string) => void
  isFormCompleted: boolean
  setIsFormCompleted: (completed: boolean) => void
  currentStep?: number
  setCurrentStep?: (step: number) => void
  showPreview?: boolean
  setShowPreview?: (show: boolean) => void
  maxStepReached?: number
  setMaxStepReached?: (step: number) => void
  onSave?: () => Promise<void>
  currentResumeId?: string | null
}

const STEPS = [
  { id: 1, title: 'Target Job', description: 'Analyze the job description to determine the CV tone and extract important keywords' },
  { id: 2, title: 'Template', description: 'Choose your resume style' },
  { id: 3, title: 'Personal Info', description: 'Basic information about you' },
  { id: 4, title: 'Experience', description: 'Your work history' },
  { id: 5, title: 'Education', description: 'Your educational background' },
  { id: 6, title: 'Skills', description: 'Your technical and soft skills' },
  { id: 7, title: 'Portfolio', description: 'Your projects and work samples (optional)' },
  { id: 8, title: 'Summary', description: 'A summary of your work experience, education, and skills tailored to the job you\'re applying for' }
]

export default function Form({ 
  formData, 
  setFormData, 
  isGenerating, 
  setIsGenerating,
  setGeneratedResume,
  isFormCompleted,
  setIsFormCompleted,
  currentStep: externalCurrentStep,
  setCurrentStep: setExternalCurrentStep,
  showPreview: externalShowPreview,
  setShowPreview: setExternalShowPreview,
  maxStepReached: externalMaxStepReached,
  setMaxStepReached: setExternalMaxStepReached,
  onSave,
  currentResumeId
}: FormProps) {
    const [internalCurrentStep, setInternalCurrentStep] = useState(1)
    const [internalShowPreview, setInternalShowPreview] = useState(true)
    const [internalMaxStepReached, setInternalMaxStepReached] = useState(1)

    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)   
    const [isDownloading, setIsDownloading] = useState(false)
    const [improvingExperienceIndex, setImprovingExperienceIndex] = useState<number | null>(null)    
    const [rewritingBullet, setRewritingBullet] = useState<{ experienceIndex: number; bulletIndex: number } | null>(null)
    const [isAnalyzingJobDescription, setIsAnalyzingJobDescription] = useState(false)
    const [analyzedTone, setAnalyzedTone] = useState<string | null>(null)
    const [analyzedThemes, setAnalyzedThemes] = useState<{
        themes: string[];
        recommendations: string[];
        summary: string;
    } | null>(null)
    // Track selected keywords for each bullet: key = `${experienceIndex}-${bulletIndex}`
    const [selectedKeywords, setSelectedKeywords] = useState<Record<string, string[]>>({})
    // Track expanded state for showing all keywords: key = `${experienceIndex}-${bulletIndex}`
    const [expandedKeywords, setExpandedKeywords] = useState<Record<string, boolean>>({})
    // Track which bullet just got rewritten to show tooltip: key = `${experienceIndex}-${bulletIndex}`
    const [showRewriteTooltip, setShowRewriteTooltip] = useState<Record<string, boolean>>({})
    // Track expanded state of rewrite tooltip: key = `${experienceIndex}-${bulletIndex}`
    const [expandedRewriteTooltip, setExpandedRewriteTooltip] = useState<Record<string, boolean>>({})
    // Track rewrite reasoning/details: key = `${experienceIndex}-${bulletIndex}`
    const [rewriteReasoning, setRewriteReasoning] = useState<Record<string, {
        themes: string[];
        keywords: string[];
        tone: string | null;
        hasThemes: boolean;
        hasKeywords: boolean;
    }>>({})
    // Track info icon hover state: key = `${experienceIndex}-${bulletIndex}`
    const [showInfoTooltip, setShowInfoTooltip] = useState<Record<string, boolean>>({})
    // Track tooltip positions: key = `${experienceIndex}-${bulletIndex}`
    const [tooltipPositions, setTooltipPositions] = useState<Record<string, { top: number; right: number }>>({})
    // Track tone info tooltip visibility
    const [showToneInfoTooltip, setShowToneInfoTooltip] = useState(false)
    // Track tone tooltip position
    const [toneTooltipPosition, setToneTooltipPosition] = useState<{ top: number; left: number } | null>(null)
    // Track keywords info tooltip visibility
    const [showKeywordsInfoTooltip, setShowKeywordsInfoTooltip] = useState(false)
    // Track keywords tooltip position
    const [keywordsTooltipPosition, setKeywordsTooltipPosition] = useState<{ top: number; left: number } | null>(null)
    // Track summary info tooltip visibility
    const [showSummaryInfoTooltip, setShowSummaryInfoTooltip] = useState(false)
    // Track summary tooltip position
    const [summaryTooltipPosition, setSummaryTooltipPosition] = useState<{ top: number; left: number } | null>(null)    

    // Use external state if provided, otherwise use internal state
    const currentStep = externalCurrentStep ?? internalCurrentStep
    const setCurrentStep = setExternalCurrentStep ?? setInternalCurrentStep
    const maxStepReached = externalMaxStepReached ?? internalMaxStepReached
    const setMaxStepReached = setExternalMaxStepReached ?? setInternalMaxStepReached
    const showPreview = externalShowPreview ?? internalShowPreview
    const setShowPreview = setExternalShowPreview ?? setInternalShowPreview

    // Sync maxStepReached with currentStep - ensures it's always at least equal to currentStep
    useEffect(() => {
        const currentMax = externalMaxStepReached ?? internalMaxStepReached
        if (currentStep > currentMax) {
            if (setExternalMaxStepReached) {
                setExternalMaxStepReached(currentStep)
            } else {
                setInternalMaxStepReached(currentStep)
            }
        }
    }, [currentStep, externalMaxStepReached, internalMaxStepReached, setExternalMaxStepReached])

    // Restore analyzedThemes from formData when resume is loaded, or clear when reset
    useEffect(() => {
        if (formData.thematicSummary && formData.recommendations && formData.themes && formData.themes.length > 0) {
            setAnalyzedThemes({
                themes: formData.themes || [],
                recommendations: formData.recommendations || [],
                summary: formData.thematicSummary || ""
            })
        } else if (!formData.thematicSummary && (!formData.themes || formData.themes.length === 0)) {
            // Clear themes when formData is reset (new resume)
            setAnalyzedThemes(null)
        }
        if (formData.tone) {
            setAnalyzedTone(formData.tone)
        } else {
            // Clear tone when formData is reset (new resume)
            setAnalyzedTone(null)
        }
    }, [formData.thematicSummary, formData.recommendations, formData.themes, formData.tone])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({
          ...prev,
          [name]: value
        }))
    }

    // Initialize experiences array if it doesn't exist
    const getExperiences = () => {
        if (formData.experiences && formData.experiences.length > 0) {
            return formData.experiences
        }
        // Always return at least one empty experience entry
        return [{ role: '', company: '', dates: '', description: '' }]
    }
    const experiences = getExperiences()

    const handleExperienceChange = (index: number, field: string, value: string) => {
        setFormData((prev: any) => {
            const experiences = prev.experiences || []
            const updatedExperiences = [...experiences]
            if (!updatedExperiences[index]) {
                updatedExperiences[index] = { role: '', company: '', dates: '', description: '' }
            }
            updatedExperiences[index] = {
                ...updatedExperiences[index],
                [field]: value
            }
            return {
                ...prev,
                experiences: updatedExperiences
            }
        })
    }

    const addExperience = () => {
        setFormData((prev: any) => ({
            ...prev,
            experiences: [...(prev.experiences || []), { role: '', company: '', dates: '', description: '' }]
        }))
    }

    const removeExperience = (index: number) => {
        setFormData((prev: any) => {
            const experiences = prev.experiences || []
            const updatedExperiences = experiences.filter((_: any, i: number) => i !== index)
            return {
                ...prev,
                experiences: updatedExperiences
            }
        })
    }

    // Initialize education array if it doesn't exist
    const getEducationEntries = () => {
        if (formData.educationEntries && formData.educationEntries.length > 0) {
            return formData.educationEntries
        }
        // Always return at least one empty education entry
        return [{ degree: '', school: '', dates: '', gpa: '', coursework: '' }]
    }
    const educationEntries = getEducationEntries()

    const handleEducationChange = (index: number, field: string, value: string) => {
        setFormData((prev: any) => {
            const educationEntries = prev.educationEntries || []
            const updatedEntries = [...educationEntries]
            if (!updatedEntries[index]) {
                updatedEntries[index] = { degree: '', school: '', dates: '', gpa: '', coursework: '' }
            }
            updatedEntries[index] = {
                ...updatedEntries[index],
                [field]: value
            }
            return {
                ...prev,
                educationEntries: updatedEntries
            }
        })
    }

    const addEducation = () => {
        setFormData((prev: any) => ({
            ...prev,
            educationEntries: [...(prev.educationEntries || []), { degree: '', school: '', dates: '', gpa: '', coursework: '' }]
        }))
    }

    const removeEducation = (index: number) => {
        setFormData((prev: any) => {
            const educationEntries = prev.educationEntries || []
            const updatedEntries = educationEntries.filter((_: any, i: number) => i !== index)
            return {
                ...prev,
                educationEntries: updatedEntries
            }
        })
    }

    // Initialize certifications array if it doesn't exist
    const getCertifications = () => {
        if (formData.certifications && formData.certifications.length > 0) {
            return formData.certifications
        }
        return []
    }
    const certifications = getCertifications()

    const handleCertificationChange = (index: number, field: string, value: string) => {
        setFormData((prev: any) => {
            const certifications = prev.certifications || []
            const updatedCertifications = [...certifications]
            if (!updatedCertifications[index]) {
                updatedCertifications[index] = { name: '', dates: '' }
            }
            updatedCertifications[index] = {
                ...updatedCertifications[index],
                [field]: value
            }
            return {
                ...prev,
                certifications: updatedCertifications
            }
        })
    }

    const addCertification = () => {
        setFormData((prev: any) => ({
            ...prev,
            certifications: [...(prev.certifications || []), { name: '', dates: '' }]
        }))
    }

    const removeCertification = (index: number) => {
        setFormData((prev: any) => {
            const certifications = prev.certifications || []
            const updatedCertifications = certifications.filter((_: any, i: number) => i !== index)
            return {
                ...prev,
                certifications: updatedCertifications
            }
        })
    }

    // Initialize portfolio projects array if it doesn't exist
    const getPortfolioProjects = () => {
        if (formData.portfolioProjects && formData.portfolioProjects.length > 0) {
            return formData.portfolioProjects
        }
        return []
    }
    const portfolioProjects = getPortfolioProjects()

    const handlePortfolioProjectChange = (index: number, field: string, value: string) => {
        setFormData((prev: any) => {
            const portfolioProjects = prev.portfolioProjects || []
            const updatedProjects = [...portfolioProjects]
            if (!updatedProjects[index]) {
                updatedProjects[index] = { name: '', toolsSkills: '', outcome: '' }
            }
            updatedProjects[index] = {
                ...updatedProjects[index],
                [field]: value
            }
            return {
                ...prev,
                portfolioProjects: updatedProjects
            }
        })
    }

    const addPortfolioProject = () => {
        setFormData((prev: any) => ({
            ...prev,
            portfolioProjects: [...(prev.portfolioProjects || []), { name: '', toolsSkills: '', outcome: '' }]
        }))
    }

    const removePortfolioProject = (index: number) => {
        setFormData((prev: any) => {
            const portfolioProjects = prev.portfolioProjects || []
            const updatedProjects = portfolioProjects.filter((_: any, i: number) => i !== index)
            return {
                ...prev,
                portfolioProjects: updatedProjects
            }
        })
    }

    // Convert experiences array to formatted string for API compatibility
    const formatExperiencesForAPI = (experiences: any[]): string => {
        if (!experiences || experiences.length === 0) return ''
        return experiences
            .filter(exp => exp.role?.trim() || exp.company?.trim() || exp.description?.trim())
            .map(exp => {
                const parts = []
                if (exp.role && exp.company) {
                    parts.push(`${exp.role} at ${exp.company}`)
                } else if (exp.role) {
                    parts.push(exp.role)
                } else if (exp.company) {
                    parts.push(exp.company)
                }
                if (exp.dates) {
                    parts.push(`(${exp.dates})`)
                }
                const header = parts.length > 0 ? `• ${parts.join(' ')}` : '• Experience'
                const description = exp.description ? exp.description.split('\n').map((line: string) => `  ${line}`).join('\n') : ''
                return `${header}\n${description}`
            })
            .join('\n\n')
    }

    // Convert education entries and certifications to formatted string for API compatibility
    const formatEducationForAPI = (educationEntries: any[], certifications: any[]): string => {
        const parts: string[] = []
        
        // Format education entries
        const validEntries = educationEntries?.filter((entry: any) => entry.degree?.trim() || entry.school?.trim()) || []
        if (validEntries.length > 0) {
            validEntries.forEach((entry: any) => {
                const entryParts: string[] = []
                if (entry.degree) {
                    entryParts.push(entry.degree)
                }
                if (entry.school || entry.dates) {
                    const schoolParts = []
                    if (entry.school) schoolParts.push(entry.school)
                    if (entry.dates) schoolParts.push(entry.dates)
                    entryParts.push(schoolParts.join(' — '))
                }
                if (entry.gpa) {
                    entryParts.push(`GPA: ${entry.gpa}`)
                }
                if (entry.coursework) {
                    entryParts.push(`Relevant Coursework: ${entry.coursework}`)
                }
                if (entryParts.length > 0) {
                    parts.push(entryParts.join('\n'))
                }
            })
        }
        
        // Format certifications as separate section
        const validCerts = certifications?.filter((cert: any) => cert.name?.trim()) || []
        if (validCerts.length > 0) {
            parts.push('Certifications')
            validCerts.forEach((cert: any) => {
                if (cert.name && cert.dates) {
                    parts.push(`${cert.name} (${cert.dates})`)
                } else if (cert.name) {
                    parts.push(cert.name)
                }
            })
        }
        
        return parts.join('\n\n')
    }

    // Convert portfolio projects array to formatted string for API compatibility
    const formatPortfolioForAPI = (portfolioProjects: any[]): string => {
        if (!portfolioProjects || portfolioProjects.length === 0) return ''
        return portfolioProjects
            .filter(project => project.name?.trim() || project.outcome?.trim())
            .map(project => {
                const parts = []
                if (project.name && project.toolsSkills) {
                    parts.push(`${project.name} — ${project.toolsSkills}`)
                } else if (project.name) {
                    parts.push(project.name)
                } else if (project.toolsSkills) {
                    parts.push(project.toolsSkills)
                }
                if (project.outcome) {
                    parts.push(`→ ${project.outcome}`)
                }
                return parts.join('\n')
            })
            .join('\n')
    }

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return formData.jobTitle?.trim() && formData.job?.trim() && formData.tone
            case 2:
                return !!formData.template
            case 3:
                return formData.name?.trim() && formData.email?.trim()
            case 4:
                const experiences = formData.experiences || []
                return experiences.length > 0 && experiences.some((exp: any) => 
                    (exp.role?.trim() || exp.company?.trim()) && exp.description?.trim()
                )
            case 5:
                const educationEntries = formData.educationEntries || []
                return educationEntries.length > 0 && educationEntries.some((entry: any) => 
                    entry.degree?.trim() || entry.school?.trim()
                )
            case 6:
                return formData.skills?.trim()
            case 7:
                return true // Portfolio is optional
            case 8:
                return formData.job?.trim()
            default:
                return false
        }
    }

    // Check if all steps from currentStep to targetStep (inclusive) are valid
    const areAllStepsValid = (fromStep: number, toStep: number): boolean => {
        if (fromStep > toStep) return false
        for (let step = fromStep; step <= toStep; step++) {
            if (!validateStep(step)) {
                return false
            }
        }
        return true
    }

    const handleTemplateSelect = (templateId: TemplateId) => {
        setFormData((prev: any) => ({
            ...prev,
            template: templateId
        }))
    }

    const nextStep = async () => {
        if (validateStep(currentStep) && currentStep < STEPS.length) {
            // Save before navigating to next step
            if (onSave) {
                await onSave()
            }
            const nextStepNum = currentStep + 1
            setCurrentStep(nextStepNum)
            if (setExternalMaxStepReached) {
                setExternalMaxStepReached(Math.max(externalMaxStepReached ?? 1, nextStepNum))
            } else {
                setInternalMaxStepReached(prev => Math.max(prev, nextStepNum))
            }
        }
    }

    const prevStep = async () => {
        if (currentStep > 1) {
            // Save before navigating to previous step
            if (onSave) {
                await onSave()
            }
            setCurrentStep(currentStep - 1)
        }
    }

    const goToStep = async (step: number) => {
        // Allow going to any step that has been completed (step <= maxStepReached)
        // Or allow going forward:
        //   - If on maxStepReached: can jump to any forward step if all steps are valid
        //   - Otherwise: can only go to maxStepReached + 1 if current step is valid
        const canGoToStep = step <= maxStepReached || 
            (currentStep === maxStepReached && step > currentStep && areAllStepsValid(currentStep, step)) ||
            (currentStep < maxStepReached && step === maxStepReached + 1 && validateStep(currentStep))
        
        if (canGoToStep) {
            // Save before navigating to step
            if (onSave) {
                await onSave()
            }
            setCurrentStep(step)
            // Only update maxStepReached if moving forward beyond it
            if (step > maxStepReached) {
                if (setExternalMaxStepReached) {
                    setExternalMaxStepReached(step)
                } else {
                    setInternalMaxStepReached(step)
                }
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsGenerating(true)
        
        try {
            // Convert experiences, education, and portfolio arrays to formatted strings for API compatibility
            const submitData = {
                ...formData,
                experience: formatExperiencesForAPI(formData.experiences || []),
                education: formatEducationForAPI(formData.educationEntries || [], formData.certifications || []),
                portfolio: formatPortfolioForAPI(formData.portfolioProjects || [])
            }
            
            // First, generate the resume HTML
            const response = await fetch('/api/generate-resume', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate resume')
            }
        
            // Set the generated resume
            setGeneratedResume(data.resume)
            setIsFormCompleted(true) // Mark form as completed

            // Immediately download as PDF
            const templateId: TemplateId = formData.template || 'professional-blue'
            const fileName = generateFileName(formData)
            
            const pdfResponse = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: data.resume,
                    templateId,
                    fileName,
                }),
            })

            if (!pdfResponse.ok) {
                const errorData = await pdfResponse.json()
                throw new Error(errorData.message || 'Failed to generate PDF')
            }

            // Get the PDF blob and trigger download
            const blob = await pdfResponse.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Error generating resume or PDF:', error)
            setGeneratedResume(`
                <div class="text-red-600 p-4 border border-red-300 rounded-lg bg-red-50">
                <h3 class="font-semibold mb-2">Error Generating Resume</h3>
                <p>${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}</p>
                </div>
            `)
            setIsFormCompleted(true) // Still show result section even on error
        } finally {
            setIsGenerating(false)
        }
    }

    const handleDownloadPDF = async () => {
        const previewContent = generateSimplePreview(formData, currentStep)
        
        // Validate content before proceeding
        const validation = validatePDFContent(previewContent)
        if (!validation.isValid) {
            alert(validation.error)
            return
        }

        setIsDownloading(true)

        try {
            // Generate filename from form data
            const fileName = generateFileName(formData)
            
            // Get template ID
            const templateId: TemplateId = formData.template || 'professional-blue'
            
            // Call the server-side PDF generation API
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: previewContent,
                    templateId,
                    fileName,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || 'Failed to generate PDF')
            }

            // Get the PDF blob and trigger download
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            
        } catch (error: any) {
            console.error('PDF generation error:', error)
            alert(error.message || 'An error occurred while generating the PDF. Please try again.')
        } finally {
            setIsDownloading(false)
        }
    }

    const handleEditInfo = () => {
        setIsFormCompleted(false)
        setCurrentStep(8) // Reset to template step when editing
    }

    const handleAnalyzeJobDescription = async () => {
        if (!formData.jobTitle?.trim() || !formData.job?.trim()) {
            alert('Please enter both job title and description first.')
            return
        }

        setIsAnalyzingJobDescription(true)
        setAnalyzedTone(null)
        setAnalyzedThemes(null)
        
        try {
            const response = await fetch('/api/analyze-job-description', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: formData.jobTitle,
                    job: formData.job,
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to analyze job description')
            }
        
            // Update formData with the analyzed tone, keywords, and themes
            const tone = data.tone || 'mid'
            const keywords = data.keywords || []
            const keywordsByCategory = data.keywordsByCategory || {
                technicalSkills: [],
                toolsFrameworks: [],
                methodologies: [],
                domainTerms: [],
                qualifications: [],
                responsibilities: []
            }
            const themes = {
                themes: data.themes || [],
                recommendations: data.recommendations || [],
                summary: data.summary || ""
            }
            setAnalyzedTone(tone)
            setAnalyzedThemes(themes)
            setFormData((prev: any) => ({
                ...prev,
                tone: tone,
                keywords: keywords, // Keep for backward compatibility
                keywordsByCategory: keywordsByCategory,
                themes: themes.themes,
                recommendations: themes.recommendations,
                thematicSummary: themes.summary
            }))
        } catch (error) {
            console.error('Error analyzing job description:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setIsAnalyzingJobDescription(false)
        }
    }

    const handleToneChange = (tone: 'junior' | 'mid' | 'senior') => {
        setFormData((prev: any) => ({
            ...prev,
            tone: tone
        }))
        setAnalyzedTone(tone)
    }

    const countKeywordOccurrences = (keyword: string): number => {
        const title = formData.jobTitle || ''
        const description = formData.job || ''
        const combinedText = `${title} ${description}`
        const keywordLower = keyword.toLowerCase()
        
        // Escape special regex characters in the keyword
        const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // Use word boundaries to match whole words only (case-insensitive)
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi')
        const matches = combinedText.match(regex)
        return matches ? matches.length : 0
    }

    const isKeywordInSkills = (keyword: string): boolean => {
        if (!formData.skills) return false
        const skillsLower = formData.skills.toLowerCase()
        const keywordLower = keyword.toLowerCase()
        
        // Split skills by comma and check for exact match (case-insensitive)
        const skillsList = skillsLower.split(',').map((s: string) => s.trim())
        return skillsList.some((skill: string) => skill === keywordLower)
    }

    const addKeywordToSkills = (keyword: string) => {
        if (isKeywordInSkills(keyword)) return // Don't add if already present
        
        setFormData((prev: any) => {
            const currentSkills = prev.skills || ''
            const trimmedSkills = currentSkills.trim()
            
            // Add keyword with proper comma separation
            if (trimmedSkills) {
                return {
                    ...prev,
                    skills: `${trimmedSkills}, ${keyword}`
                }
            } else {
                return {
                    ...prev,
                    skills: keyword
                }
            }
        })
    }

    const getSkillsRelevantKeywords = (): string[] => {
        if (!formData.keywordsByCategory) {
            // Fallback to flat keywords array if categories don't exist
            return formData.keywords || []
        }
        
        // Only include Technical skills and Tools & frameworks for Skills section
        const technicalSkills = formData.keywordsByCategory.technicalSkills || []
        const toolsFrameworks = formData.keywordsByCategory.toolsFrameworks || []
        
        return [...technicalSkills, ...toolsFrameworks]
    }

    const calculateKeywordCoverage = () => {
        const skillsKeywords = getSkillsRelevantKeywords()
        
        if (skillsKeywords.length === 0) {
            return { matched: 0, total: 0, percentage: 0 }
        }
        
        const matched = skillsKeywords.filter((keyword: string) => isKeywordInSkills(keyword)).length
        const total = skillsKeywords.length
        const percentage = total > 0 ? Math.round((matched / total) * 100) : 0
        
        return { matched, total, percentage }
    }

    const handleGenerateSummary = async () => {
        if (!formData.job?.trim()) {
            alert('Please enter a target job description first.')
            return
        }

        setIsGeneratingSummary(true)
        
        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    experience: formatExperiencesForAPI(formData.experiences || []),
                    education: formatEducationForAPI(formData.educationEntries || [], formData.certifications || []),
                    skills: formData.skills,
                    job: formData.job,
                    tone: formData.tone,
                    themes: formData.themes || [],
                    recommendations: formData.recommendations || [],
                    thematicSummary: formData.thematicSummary || '',
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate summary')
            }
        
            // Update formData with the generated summary
            setFormData((prev: any) => ({
                ...prev,
                summary: data.summary
            }))
        } catch (error) {
            console.error('Error generating summary:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setIsGeneratingSummary(false)
        }
    }

    const handleModifySummary = async (modifyType: 'concise' | 'verbose' | 'senior') => {
        if (!formData.summary?.trim()) {
            alert('Please generate a summary first.')
            return
        }

        if (!formData.job?.trim()) {
            alert('Please enter a target job description first.')
            return
        }

        setIsGeneratingSummary(true)
        
        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    experience: formatExperiencesForAPI(formData.experiences || []),
                    education: formatEducationForAPI(formData.educationEntries || [], formData.certifications || []),
                    skills: formData.skills,
                    job: formData.job,
                    existingSummary: formData.summary,
                    modifyType: modifyType,
                    tone: formData.tone,
                    themes: formData.themes || [],
                    recommendations: formData.recommendations || [],
                    thematicSummary: formData.thematicSummary || '',
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to modify summary')
            }
        
            // Update formData with the modified summary
            setFormData((prev: any) => ({
                ...prev,
                summary: data.summary
            }))
        } catch (error) {
            console.error('Error modifying summary:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setIsGeneratingSummary(false)
        }
    }

    const handleImproveExperience = async (index: number) => {
        const experience = experiences[index]
        if (!experience?.description?.trim()) {
            alert('Please enter a description first.')
            return
        }

        setImprovingExperienceIndex(index)
        
        try {
            const response = await fetch('/api/improve-experience', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: experience.description,
                    role: experience.role,
                    company: experience.company,
                    themes: formData.themes || [],
                    recommendations: formData.recommendations || [],
                    thematicSummary: formData.thematicSummary || '',
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to improve description')
            }
        
            // Update the experience description with the improved version
            handleExperienceChange(index, 'description', data.improvedDescription)
        } catch (error) {
            console.error('Error improving experience:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setImprovingExperienceIndex(null)
        }
    }

    // Parse description into bullet points
    // Preserves empty lines to maintain UI structure
    const parseBullets = (description: string): string[] => {
        if (!description) return []
        // Split by newlines and preserve all lines (including empty ones)
        return description.split('\n')
            .map(line => {
                // Remove bullet point symbols if present at the start, but preserve all other content including spaces
                return line.replace(/^[-*•]\s*/, '')
            })
        // Don't filter out empty lines - preserve structure for UI
    }

    // Handle updating a single bullet point
    const handleBulletChange = (experienceIndex: number, bulletIndex: number, value: string) => {
        console.log('handleBulletChange', experienceIndex, bulletIndex, value)
        const experience = experiences[experienceIndex]
        const bullets = parseBullets(experience.description || '')
        
        // Ensure we have enough bullets
        while (bullets.length <= bulletIndex) {
            bullets.push('')
        }
        
        bullets[bulletIndex] = value
        
        // Reconstruct the description with newlines (keep all bullets, including empty ones)
        const updatedDescription = bullets.join('\n')
        handleExperienceChange(experienceIndex, 'description', updatedDescription)
        
        // Auto-select/deselect keywords based on what's detected in the text
        if (formData.keywords && formData.keywords.length > 0) {
            const detectedKeywords = detectKeywordsInText(value)
            const key = `${experienceIndex}-${bulletIndex}`
            setSelectedKeywords((prev) => {
                const current = prev[key] || []
                // Set selected keywords to exactly match detected keywords
                // This will auto-select new keywords and deselect removed ones
                const detectedSet = new Set(detectedKeywords)
                const currentSet = new Set(current)
                
                // Only update if there's a difference (to avoid unnecessary re-renders)
                const hasChanges = detectedKeywords.length !== current.length ||
                    detectedKeywords.some(k => !currentSet.has(k)) ||
                    current.some(k => !detectedSet.has(k))
                
                if (hasChanges) {
                    return {
                        ...prev,
                        [key]: detectedKeywords
                    }
                }
                return prev
            })
        }
    }

    // Handle adding a new bullet point
    const handleAddBullet = (experienceIndex: number) => {
        const experience = experiences[experienceIndex]
        const bullets = parseBullets(experience.description || '')
        bullets.push('')
        
        // Reconstruct the description with newlines
        const updatedDescription = bullets.join('\n')
        handleExperienceChange(experienceIndex, 'description', updatedDescription)
    }

    // Handle removing a bullet point
    const handleRemoveBullet = (experienceIndex: number, bulletIndex: number) => {
        const experience = experiences[experienceIndex]
        const bullets = parseBullets(experience.description || '')
        
        if (bullets.length <= 1) {
            // If only one bullet, just clear it
            handleExperienceChange(experienceIndex, 'description', '')
            return
        }
        
        bullets.splice(bulletIndex, 1)
        
        // Reconstruct the description with newlines
        const updatedDescription = bullets.join('\n')
        handleExperienceChange(experienceIndex, 'description', updatedDescription)
    }

    // Get keywords that could be relevant for a bullet point
    const getRelevantKeywordsForBullet = (bulletText: string): string[] => {
        if (!formData.keywords || formData.keywords.length === 0) {
            return []
        }
        
        const bulletLower = bulletText.toLowerCase()
        
        // Return keywords that are not already in the bullet point
        // This helps the AI know which keywords to potentially incorporate
        // return formData.keywords.filter((keyword: string) => {
        //     const keywordLower = keyword.toLowerCase()
        //     // Check if keyword is not already in the bullet (case-insensitive)
        //     return !bulletLower.includes(keywordLower)
        // })
        return formData.keywords
    }

    // Detect which keywords are present in the bullet text
    const detectKeywordsInText = (text: string): string[] => {
        if (!formData.keywords || formData.keywords.length === 0 || !text.trim()) {
            return []
        }
        
        const textLower = text.toLowerCase()
        const detectedKeywords: string[] = []
        
        formData.keywords.forEach((keyword: string) => {
            const keywordLower = keyword.toLowerCase()
            // Use word boundaries to match whole words (case-insensitive)
            const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i')
            if (regex.test(textLower)) {
                detectedKeywords.push(keyword)
            }
        })
        
        return detectedKeywords
    }

    // Get selected keywords for a specific bullet
    const getSelectedKeywords = (experienceIndex: number, bulletIndex: number): string[] => {
        const key = `${experienceIndex}-${bulletIndex}`
        return selectedKeywords[key] || []
    }

    // Toggle keyword selection for a specific bullet
    const toggleKeywordSelection = (experienceIndex: number, bulletIndex: number, keyword: string) => {
        const key = `${experienceIndex}-${bulletIndex}`
        setSelectedKeywords((prev) => {
            const current = prev[key] || []
            const isSelected = current.includes(keyword)
            
            if (isSelected) {
                // Remove keyword
                return {
                    ...prev,
                    [key]: current.filter((k: string) => k !== keyword)
                }
            } else {
                // Add keyword
                return {
                    ...prev,
                    [key]: [...current, keyword]
                }
            }
        })
    }

    // Toggle expanded state for showing all keywords
    const toggleExpandedKeywords = (experienceIndex: number, bulletIndex: number) => {
        const key = `${experienceIndex}-${bulletIndex}`
        setExpandedKeywords((prev) => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    // Handle rewriting a single bullet point
    const handleRewriteBullet = async (experienceIndex: number, bulletIndex: number) => {
        const experience = experiences[experienceIndex]
        const bullets = parseBullets(experience.description || '')
        
        if (bulletIndex >= bullets.length || bulletIndex < 0) {
            alert('Invalid bullet point index.')
            return
        }

        const bulletToRewrite = bullets[bulletIndex]
        if (!bulletToRewrite?.trim()) {
            alert('This bullet point is empty.')
            return
        }

        setRewritingBullet({ experienceIndex, bulletIndex })
        
        try {
            // Get selected keywords for this bullet, or fall back to all relevant keywords if none selected
            const selected = getSelectedKeywords(experienceIndex, bulletIndex)
            const keywordsToUse = selected.length > 0 
                ? selected 
                : getRelevantKeywordsForBullet(bulletToRewrite)
            
            const response = await fetch('/api/rewrite-bullet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bullet: bulletToRewrite,
                    role: experience.role,
                    company: experience.company,
                    allBullets: bullets,
                    keywords: keywordsToUse,
                    tone: formData.tone,
                    themes: formData.themes || [],
                    recommendations: formData.recommendations || [],
                    thematicSummary: formData.thematicSummary || '',
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to rewrite bullet')
            }
        
            // Update the specific bullet point
            handleBulletChange(experienceIndex, bulletIndex, data.rewrittenBullet)
            
            // If no keywords were pre-selected and the API returned incorporated keywords, auto-select them
            if (selected.length === 0 && data.incorporatedKeywords && Array.isArray(data.incorporatedKeywords) && data.incorporatedKeywords.length > 0) {
                const key = `${experienceIndex}-${bulletIndex}`
                setSelectedKeywords((prev) => ({
                    ...prev,
                    [key]: data.incorporatedKeywords
                }))
            }
            
            // Store rewrite reasoning if available
            const key = `${experienceIndex}-${bulletIndex}`
            if (data.reasoning) {
                setRewriteReasoning((prev) => ({
                    ...prev,
                    [key]: data.reasoning
                }))
            }
            
            // Show tooltip after successful rewrite
            setShowRewriteTooltip((prev) => ({
                ...prev,
                [key]: true
            }))
        } catch (error) {
            console.error('Error rewriting bullet:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setRewritingBullet(null)
        }
    }

    const ProgressIndicator = () => {
        // Helper function to determine if a step is accessible
        const isStepAccessible = (stepId: number): boolean => {
            // All steps up to maxStepReached are always accessible
            if (stepId <= maxStepReached) {
                return true
            }
            // Forward navigation rules
            if (currentStep === maxStepReached && areAllStepsValid(currentStep, stepId)) {
                return true
            }
            if (currentStep < maxStepReached && stepId === maxStepReached + 1 && validateStep(currentStep)) {
                return true
            }
            return false
        }

        return (
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    {STEPS.map((step, index) => {
                        const isAccessible = isStepAccessible(step.id)
                        return (
                            <div key={step.id} className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => goToStep(step.id)}
                                    title={step.title}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                                        step.id === currentStep
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : step.id <= maxStepReached
                                            ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                                            : isAccessible
                                            ? 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={!isAccessible}
                        >
                            {step.id < currentStep ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                step.id
                            )}
                        </button>
                        {index < STEPS.length - 1 && (
                            <div className={`w-16 h-1 mx-1 rounded-full transition-all duration-200 ${
                                step.id <= maxStepReached ? 'bg-green-500' : 'bg-gray-200'
                            }`} />
                        )}
                    </div>
                    )
                    })}
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    {STEPS[currentStep - 1].title}
                </h2>
                <p className="text-gray-600">
                    {STEPS[currentStep - 1].description}
                </p>
            </div>
        </div>
        )
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                            <input 
                                name="jobTitle" 
                                type="text"
                                placeholder="Senior Full Stack Developer"
                                required
                                value={formData.jobTitle || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea 
                                name="job" 
                                placeholder="Position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms."
                                required
                                rows={7}
                                value={formData.job || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                            />
                        </div>
                        
                        <button
                            type="button"
                            onClick={handleAnalyzeJobDescription}
                            disabled={isAnalyzingJobDescription || !formData.jobTitle?.trim() || !formData.job?.trim()}
                            className={`w-full px-4 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center space-x-2 ${
                                isAnalyzingJobDescription || !formData.jobTitle?.trim() || !formData.job?.trim()
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                        >
                            {isAnalyzingJobDescription ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Analyzing Job Description...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                                    </svg>
                                    <span>Analyze Job Description</span>
                                </>
                            )}
                        </button>

                        {(analyzedTone || formData.tone) && (
                            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    Based on my analysis, you are applying to a <strong className="text-gray-900">{(analyzedTone || formData.tone)}</strong> role.
                                </p>
                                
                                <div className="flex items-center space-x-4">
                                    <label className="text-sm font-medium text-gray-700">CV Tone:</label>
                                    <div className="flex items-center space-x-2">
                                        {(['junior', 'mid', 'senior'] as const).map((tone) => (
                                            <button
                                                key={tone}
                                                type="button"
                                                onClick={() => handleToneChange(tone)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-200 ${
                                                    (formData.tone || analyzedTone) === tone
                                                        ? 'bg-blue-600 text-white shadow-md'
                                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                            </button>
                                        ))}
                                        {/* Info Icon */}
                                        <button
                                            type="button"
                                            onMouseEnter={(e) => {
                                                setShowToneInfoTooltip(true)
                                                // Store button position for tooltip positioning
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                setToneTooltipPosition({ 
                                                    top: rect.top - 220, 
                                                    left: rect.right + 8 
                                                })
                                            }}
                                            onMouseLeave={() => {
                                                setShowToneInfoTooltip(false)
                                                setToneTooltipPosition(null)
                                            }}
                                            className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 flex items-center justify-center transition duration-200"
                                            title=""
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {/* Tone Info Tooltip */}
                                    {showToneInfoTooltip && (
                                        <div 
                                            className="fixed w-[520px] bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[9999] pointer-events-auto"
                                            style={{ 
                                                maxWidth: 'min(520px, calc(100vw - 2rem))',
                                                top: toneTooltipPosition ? `${toneTooltipPosition.top}px` : 'auto',
                                                left: toneTooltipPosition ? `${toneTooltipPosition.left}px` : 'auto',
                                                bottom: toneTooltipPosition ? 'auto' : '1rem'
                                            }}
                                        >
                                            <h4 className="font-semibold text-sm text-gray-900 mb-3">Tone Adjustment</h4>
                                            <p className="text-xs text-gray-700 mb-4">
                                                The tone adjusts the language, verbs, scope, and ownership level in your resume summary and bullet points to match the seniority level of the role you're applying for.
                                            </p>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <h5 className="font-semibold text-xs text-gray-900 mb-2">Junior Level</h5>
                                                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                        <li>Uses entry-level or junior positioning (e.g., "Junior developer", "Associate engineer", "Entry-level")</li>
                                                        <li>Focuses on foundational skills, learning ability, and growth potential</li>
                                                        <li>Emphasizes education, projects, and eagerness to contribute</li>
                                                        <li>Uses language appropriate for someone early in their career</li>
                                                    </ul>
                                                </div>
                                                
                                                <div>
                                                    <h5 className="font-semibold text-xs text-gray-900 mb-2">Mid Level</h5>
                                                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                        <li>Uses mid-level positioning (e.g., "Engineer", "Developer", "Software engineer")</li>
                                                        <li>Balances technical depth with collaboration and impact</li>
                                                        <li>Emphasizes hands-on experience and concrete achievements</li>
                                                        <li>Uses confident but not overly authoritative language</li>
                                                    </ul>
                                                </div>
                                                
                                                <div>
                                                    <h5 className="font-semibold text-xs text-gray-900 mb-2">Senior Level</h5>
                                                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                        <li>Uses senior-level positioning (e.g., "Senior engineer", "Lead developer", "Principal architect", "Staff engineer")</li>
                                                        <li>Emphasizes leadership, strategic impact, architectural decisions, and mentoring</li>
                                                        <li>Highlights experience with complex systems, scale, and cross-functional influence</li>
                                                        <li>Uses authoritative language that reflects deep expertise and decision-making authority</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {analyzedThemes && analyzedThemes.summary && (
                                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900 mb-2">
                                                    {analyzedThemes.summary}
                                                </p>
                                                <p className="text-xs text-gray-700 mb-3">Your resume should show:</p>
                                                <ul className="space-y-1.5">
                                                    {analyzedThemes.recommendations.map((rec, index) => (
                                                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                                                            <span className="text-purple-600 mt-0.5">•</span>
                                                            <span>{rec}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.keywords && formData.keywords.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Extracted Keywords:</label>
                                            {/* Info Icon */}
                                            <button
                                                type="button"
                                                onMouseEnter={(e) => {
                                                    setShowKeywordsInfoTooltip(true)
                                                    // Store button position for tooltip positioning
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setKeywordsTooltipPosition({ 
                                                        top: rect.top - 220, 
                                                        left: rect.right + 8 
                                                    })
                                                }}
                                                onMouseLeave={() => {
                                                    setShowKeywordsInfoTooltip(false)
                                                    setKeywordsTooltipPosition(null)
                                                }}
                                                className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 flex items-center justify-center transition duration-200"
                                                title=""
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {formData.keywords
                                                .map((keyword: string) => ({
                                                    keyword,
                                                    count: countKeywordOccurrences(keyword)
                                                }))
                                                .filter((item: { keyword: string; count: number }) => item.count > 0)
                                                .sort((a: { keyword: string; count: number }, b: { keyword: string; count: number }) => b.count - a.count)
                                                .map((item: { keyword: string; count: number }, index: number) => (
                                                    <span
                                                        key={index}
                                                        className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-full text-xs font-medium"
                                                    >
                                                        {item.keyword} ({item.count})
                                                    </span>
                                                ))}
                                        </div>
                                        
                                        {/* Keywords Info Tooltip */}
                                        {showKeywordsInfoTooltip && (
                                            <div 
                                                className="fixed w-[520px] bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[9999] pointer-events-auto"
                                                style={{ 
                                                    maxWidth: 'min(520px, calc(100vw - 2rem))',
                                                    top: keywordsTooltipPosition ? `${keywordsTooltipPosition.top}px` : 'auto',
                                                    left: keywordsTooltipPosition ? `${keywordsTooltipPosition.left}px` : 'auto',
                                                    bottom: keywordsTooltipPosition ? 'auto' : '1rem'
                                                }}
                                            >
                                                <h4 className="font-semibold text-sm text-gray-900 mb-3">Extracted Keywords</h4>
                                                <p className="text-xs text-gray-700 mb-4">
                                                    Keywords are important terms and phrases extracted from the job description that help match your resume to the role.
                                                </p>
                                                
                                                <div className="space-y-3">
                                                    <div>
                                                        <h5 className="font-semibold text-xs text-gray-900 mb-2">Purpose</h5>
                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                            <li>Help your resume pass Applicant Tracking Systems (ATS)</li>
                                                            <li>Increase keyword matching with the job description</li>
                                                            <li>Improve your resume's relevance to recruiters</li>
                                                            <li>Guide you to naturally incorporate important terms into your bullet points</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className="font-semibold text-xs text-gray-900 mb-2">How to Use</h5>
                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                            <li>When rewriting bullet points, select relevant keywords to incorporate</li>
                                                            <li>Keywords are automatically suggested based on the bullet point content</li>
                                                            <li>Only include keywords that naturally fit the context of your work</li>
                                                            <li>The numbers show how many times each keyword appears in your resume</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            case 2:
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">Choose a Resume Template</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {TEMPLATES.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => handleTemplateSelect(template.id)}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                                        formData.template === template.id
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {/* Template Preview */}
                                    <div className={`template-preview mb-4 ${
                                        formData.template === template.id ? 'selected' : ''
                                    } template-preview-${template.id}`}>
                                        <div className="preview-header">
                                            <div className="preview-name">John Doe</div>
                                            <div className="text-gray-400 text-[8px]">john@example.com</div>
                                        </div>
                                        <div className="preview-section-title">Summary</div>
                                        <div className="text-gray-400 h-3 bg-gray-100 rounded mb-2"></div>
                                        <div className="text-gray-400 h-3 bg-gray-100 rounded w-3/4 mb-3"></div>
                                        <div className="preview-section-title">Experience</div>
                                        <div className="text-gray-400 h-3 bg-gray-100 rounded mb-2"></div>
                                        <div className="text-gray-400 h-3 bg-gray-100 rounded w-2/3"></div>
                                    </div>
                                    
                                    {/* Template Info */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{template.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                        </div>
                                        {formData.template === template.id && (
                                            <div className="flex-shrink-0 ml-3">
                                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input 
                                name="name" 
                                type="text"
                                placeholder="John Doe"
                                required
                                value={formData.name || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input 
                                name="email" 
                                type="email"
                                placeholder="john.doe@example.com" 
                                required
                                value={formData.email || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Optional</span>
                                </div>
                                <input 
                                    name="phone" 
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    value={formData.phone || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                />
                            </div>
                            
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Optional</span>
                                </div>
                                <input 
                                    name="location" 
                                    type="text"
                                    placeholder="San Francisco, CA"
                                    value={formData.location || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                />
                            </div>
                        </div>
                    </div>
                )
            case 4:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Work Experience</label>
                            <button
                                type="button"
                                onClick={addExperience}
                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Experience</span>
                            </button>
                        </div>
                        
                        {experiences.map((exp: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50" style={{ overflow: 'visible' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Experience #{index + 1}</h3>
                                    {experiences.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeExperience(index)}
                                            className="text-red-600 hover:text-red-700 transition duration-200"
                                            title="Remove this experience"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Role / Job Title</label>
                                            <input
                                                type="text"
                                                placeholder="Software Developer"
                                                value={exp.role || ''}
                                                onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                                            <input
                                                type="text"
                                                placeholder="Tech Corp"
                                                value={exp.company || ''}
                                                onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Dates</label>
                                        <input
                                            type="text"
                                            placeholder="2020-2023 or Jan 2020 - Present"
                                            value={exp.dates || ''}
                                            onChange={(e) => handleExperienceChange(index, 'dates', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                        
                                        {/* Individual input fields for each bullet point */}
                                        {(() => {
                                            const bullets = parseBullets(exp.description || '')
                                            // Ensure at least one input field is always shown
                                            const displayBullets = bullets.length > 0 ? bullets : ['']
                                            
                                            return (
                                                <div className="space-y-2">
                                                    {displayBullets.map((bullet, bulletIndex) => {
                                                        const relevantKeywords = bullet.trim() ? getRelevantKeywordsForBullet(bullet) : (formData.keywords || [])
                                                        const hasKeywords = formData.keywords && formData.keywords.length > 0
                                                        const showKeywordPreview = hasKeywords && relevantKeywords.length > 0
                                                        const selected = getSelectedKeywords(index, bulletIndex)
                                                        const isExpanded = expandedKeywords[`${index}-${bulletIndex}`] || false
                                                        const displayKeywords = isExpanded ? relevantKeywords : relevantKeywords.slice(0, 6)
                                                        const hasMore = relevantKeywords.length > 6
                                                        
                                                        return (
                                                            <div key={bulletIndex} className="space-y-1">
                                                                {showKeywordPreview && (
                                                                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                        <span className="text-gray-500 font-medium">Keywords to incorporate:</span>
                                                                        {displayKeywords.map((keyword: string, kwIndex: number) => {
                                                                            const isSelected = selected.includes(keyword)
                                                                            return (
                                                                                <button
                                                                                    key={kwIndex}
                                                                                    type="button"
                                                                                    onClick={() => toggleKeywordSelection(index, bulletIndex, keyword)}
                                                                                    className={`px-2 py-0.5 rounded text-xs transition-all duration-200 cursor-pointer ${
                                                                                        isSelected
                                                                                            ? 'bg-blue-600 border border-blue-700 text-white font-medium'
                                                                                            : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                                                                                    }`}
                                                                                    title={isSelected ? 'Click to deselect' : 'Click to select this keyword'}
                                                                                >
                                                                                    {keyword}
                                                                                    {isSelected && (
                                                                                        <span className="ml-1">✓</span>
                                                                                    )}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                        {hasMore && !isExpanded && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExpandedKeywords(index, bulletIndex)}
                                                                                className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                                                                title="Click to show all keywords"
                                                                            >
                                                                                +{relevantKeywords.length - 6} more
                                                                            </button>
                                                                        )}
                                                                        {isExpanded && hasMore && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleExpandedKeywords(index, bulletIndex)}
                                                                                className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                                                                title="Click to show fewer keywords"
                                                                            >
                                                                                Show less
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-2" style={{ overflow: 'visible' }}>
                                                                    <textarea
                                                                        cols={2}
                                                                        placeholder={`Bullet point ${bulletIndex + 1} (e.g., Built web applications using React and Node.js)`}
                                                                        value={bullet}
                                                                        onChange={(e) => handleBulletChange(index, bulletIndex, e.target.value)}
                                                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                                                    />
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-1 relative" style={{ overflow: 'visible' }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRewriteBullet(index, bulletIndex)}
                                                                                disabled={rewritingBullet?.experienceIndex === index && rewritingBullet?.bulletIndex === bulletIndex || !bullet.trim()}
                                                                                className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded transition duration-200 flex items-center space-x-1 ${
                                                                                    rewritingBullet?.experienceIndex === index && rewritingBullet?.bulletIndex === bulletIndex || !bullet.trim()
                                                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                                                                }`}
                                                                                title={hasKeywords && selected.length > 0
                                                                                    ? `Rewrite with ${selected.length} selected keyword${selected.length !== 1 ? 's' : ''}`
                                                                                    : hasKeywords && relevantKeywords.length > 0
                                                                                    ? `Rewrite with ${relevantKeywords.length} relevant keyword${relevantKeywords.length !== 1 ? 's' : ''} (select keywords above to customize)`
                                                                                    : 'Rewrite this bullet point'}
                                                                            >
                                                                                {rewritingBullet?.experienceIndex === index && rewritingBullet?.bulletIndex === bulletIndex ? (
                                                                                    <>
                                                                                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                        </svg>
                                                                                        <span>Rewriting...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                                                        </svg>
                                                                                        <span>Rewrite</span>
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                            
                                                                            {/* Info Icon */}
                                                                            <button
                                                                                type="button"
                                                                                onMouseEnter={(e) => {
                                                                                    const key = `${index}-${bulletIndex}`
                                                                                    setShowInfoTooltip((prev) => ({ ...prev, [key]: true }))
                                                                                    // Store button position for tooltip positioning
                                                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                                                    setTooltipPositions((prev) => ({
                                                                                        ...prev,
                                                                                        [key]: { 
                                                                                            top: rect.bottom + 4, 
                                                                                            right: window.innerWidth - rect.right 
                                                                                        }
                                                                                    }))
                                                                                }}
                                                                                onMouseLeave={() => {
                                                                                    const key = `${index}-${bulletIndex}`
                                                                                    setShowInfoTooltip((prev) => {
                                                                                        const updated = { ...prev }
                                                                                        delete updated[key]
                                                                                        return updated
                                                                                    })
                                                                                    setTooltipPositions((prev) => {
                                                                                        const updated = { ...prev }
                                                                                        delete updated[key]
                                                                                        return updated
                                                                                    })
                                                                                }}
                                                                                className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 flex items-center justify-center transition duration-200"
                                                                                title="Learn about the rewrite format"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                </svg>
                                                                            </button>
                                                                            
                                                                            {/* Info Tooltip (persistent on hover) - using fixed positioning */}
                                                                            {showInfoTooltip[`${index}-${bulletIndex}`] && (() => {
                                                                                const key = `${index}-${bulletIndex}`
                                                                                const position = tooltipPositions[key]
                                                                                const reasoning = rewriteReasoning[key]
                                                                                const hasJobAnalysis = formData.themes && formData.themes.length > 0
                                                                                
                                                                                return (
                                                                                    <div 
                                                                                        className="fixed w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[9999] pointer-events-auto"
                                                                                        style={{ 
                                                                                            maxWidth: 'min(320px, calc(100vw - 2rem))',
                                                                                            top: position ? `${position.top}px` : 'auto',
                                                                                            right: position ? `${position.right}px` : '1rem',
                                                                                            bottom: position ? 'auto' : '1rem'
                                                                                        }}
                                                                                    >
                                                                                        <div className="flex items-start justify-between mb-2">
                                                                                            <h4 className="font-semibold text-sm text-gray-900">Why this format?</h4>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    setShowInfoTooltip((prev) => {
                                                                                                        const updated = { ...prev }
                                                                                                        delete updated[key]
                                                                                                        return updated
                                                                                                    })
                                                                                                    setTooltipPositions((prev) => {
                                                                                                        const updated = { ...prev }
                                                                                                        delete updated[key]
                                                                                                        return updated
                                                                                                    })
                                                                                                }}
                                                                                                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
                                                                                            >
                                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                                                </svg>
                                                                                            </button>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-700 mb-3">
                                                                                            We use the format: <strong>Action verb + what you did + how + result/impact</strong>
                                                                                        </p>
                                                                                        <p className="text-xs text-gray-600 mb-2">
                                                                                            Recruiters think in terms of:
                                                                                        </p>
                                                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside mb-4">
                                                                                            <li><strong>Impact</strong> - What changed or improved?</li>
                                                                                            <li><strong>Results</strong> - What were the measurable outcomes?</li>
                                                                                            <li><strong>Scale</strong> - How many people/systems/projects?</li>
                                                                                            <li><strong>Improvement</strong> - What got better?</li>
                                                                                        </ul>
                                                                                        
                                                                                        {hasJobAnalysis && (
                                                                                            <div className="pt-3 border-t border-gray-200 space-y-2">
                                                                                                <p className="text-xs font-semibold text-gray-900 mb-2">Job-specific enhancements:</p>
                                                                                                
                                                                                                {formData.themes && formData.themes.length > 0 && (
                                                                                                    <div>
                                                                                                        <p className="text-xs font-medium text-gray-700 mb-1">Themes to emphasize:</p>
                                                                                                        <div className="flex flex-wrap gap-1">
                                                                                                            {formData.themes.slice(0, 3).map((theme: string, themeIndex: number) => (
                                                                                                                <span key={themeIndex} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                                                                                                                    {theme}
                                                                                                                </span>
                                                                                                            ))}
                                                                                                            {formData.themes.length > 3 && (
                                                                                                                <span className="px-2 py-0.5 text-gray-500 text-xs">+{formData.themes.length - 3} more</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {formData.keywords && formData.keywords.length > 0 && (
                                                                                                    <div>
                                                                                                        <p className="text-xs font-medium text-gray-700 mb-1">Keywords to incorporate:</p>
                                                                                                        <div className="flex flex-wrap gap-1">
                                                                                                            {formData.keywords.slice(0, 5).map((keyword: string, kwIndex: number) => (
                                                                                                                <span key={kwIndex} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                                                                                                    {keyword}
                                                                                                                </span>
                                                                                                            ))}
                                                                                                            {formData.keywords.length > 5 && (
                                                                                                                <span className="px-2 py-0.5 text-gray-500 text-xs">+{formData.keywords.length - 5} more</span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {formData.tone && (
                                                                                                    <div>
                                                                                                        <p className="text-xs font-medium text-gray-700 mb-1">Tone level:</p>
                                                                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium capitalize">
                                                                                                            {formData.tone}
                                                                                                        </span>
                                                                                                        <p className="text-xs text-gray-600 mt-1 italic">
                                                                                                            {formData.tone === 'senior' && 'Emphasizes leadership and strategic impact'}
                                                                                                            {formData.tone === 'mid' && 'Balances technical depth with collaboration'}
                                                                                                            {formData.tone === 'junior' && 'Focuses on foundational skills and growth'}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )}
                                                                                                
                                                                                                {reasoning && (reasoning.hasThemes || reasoning.hasKeywords || reasoning.tone) && (
                                                                                                    <div className="pt-2 border-t border-gray-200">
                                                                                                        <p className="text-xs font-medium text-gray-700 mb-1">This bullet incorporates:</p>
                                                                                                        <ul className="text-xs text-gray-600 space-y-0.5">
                                                                                                            {reasoning.hasThemes && reasoning.themes.length > 0 && (
                                                                                                                <li className="flex items-center gap-1">
                                                                                                                    <span className="text-purple-600">•</span>
                                                                                                                    <span>{reasoning.themes.length} theme{reasoning.themes.length !== 1 ? 's' : ''}</span>
                                                                                                                </li>
                                                                                                            )}
                                                                                                            {reasoning.hasKeywords && reasoning.keywords.length > 0 && (
                                                                                                                <li className="flex items-center gap-1">
                                                                                                                    <span className="text-blue-600">•</span>
                                                                                                                    <span>{reasoning.keywords.length} keyword{reasoning.keywords.length !== 1 ? 's' : ''}</span>
                                                                                                                </li>
                                                                                                            )}
                                                                                                            {reasoning.tone && (
                                                                                                                <li className="flex items-center gap-1">
                                                                                                                    <span className="text-indigo-600">•</span>
                                                                                                                    <span>{reasoning.tone}-level tone</span>
                                                                                                                </li>
                                                                                                            )}
                                                                                                        </ul>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        <p className="text-xs text-gray-600 mt-3">
                                                                                            This format helps your resume pass ATS systems and catch recruiters' attention.
                                                                                        </p>
                                                                                    </div>
                                                                                )
                                                                            })()}
                                                                            
                                                                            {/* Post-rewrite Tooltip - Enhanced Expandable */}
                                                                            {showRewriteTooltip[`${index}-${bulletIndex}`] && (() => {
                                                                                const key = `${index}-${bulletIndex}`
                                                                                const reasoning = rewriteReasoning[key]
                                                                                const isExpanded = expandedRewriteTooltip[key] || false
                                                                                const hasDetails = reasoning && (reasoning.hasThemes || reasoning.hasKeywords || reasoning.tone)
                                                                                
                                                                                return (
                                                                                    <div className="absolute right-0 top-full mt-1 w-80 bg-blue-50 border border-blue-200 rounded-lg shadow-lg z-50 transition-all duration-300 opacity-100">
                                                                                        <div className="p-4">
                                                                                            <div className="flex items-start justify-between">
                                                                                                <div className="flex-1">
                                                                                                    <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                                                                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                                                        </svg>
                                                                                                        Rewritten with impact-focused format
                                                                                                    </h4>
                                                                                                    <p className="text-xs text-blue-800 mb-2">
                                                                                                        Format: <strong>Action verb + what you did + how + result/impact</strong>
                                                                                                    </p>
                                                                                                    <p className="text-xs text-blue-700 mb-3">
                                                                                                        Recruiters focus on: Impact, Results, Scale, Improvement
                                                                                                    </p>
                                                                                                    
                                                                                                    {hasDetails && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                setExpandedRewriteTooltip((prev) => ({
                                                                                                                    ...prev,
                                                                                                                    [key]: !isExpanded
                                                                                                                }))
                                                                                                            }}
                                                                                                            className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 transition-colors"
                                                                                                        >
                                                                                                            {isExpanded ? (
                                                                                                                <>
                                                                                                                    <span>Hide details</span>
                                                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                                                                                                                    </svg>
                                                                                                                </>
                                                                            ) : (
                                                                                                                <>
                                                                                                                    <span>Show details</span>
                                                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                                                                                    </svg>
                                                                                                                </>
                                                                            )}
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        setShowRewriteTooltip((prev) => {
                                                                                                            const updated = { ...prev }
                                                                                                            delete updated[key]
                                                                                                            return updated
                                                                                                        })
                                                                                                        setExpandedRewriteTooltip((prev) => {
                                                                                                            const updated = { ...prev }
                                                                                                            delete updated[key]
                                                                                                            return updated
                                                                                                        })
                                                                                                    }}
                                                                                                    className="flex-shrink-0 ml-2 text-blue-600 hover:text-blue-800"
                                                                                                >
                                                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                                                    </svg>
                                                                                                </button>
                                                                                            </div>
                                                                                            
                                                                                            {/* Expanded Details Section */}
                                                                                            {isExpanded && reasoning && (
                                                                                                <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                                                                                                    <div className="text-xs font-semibold text-blue-900 mb-2">Why this rewrite?</div>
                                                                                                    
                                                                                                    {reasoning.hasThemes && reasoning.themes.length > 0 && (
                                                                                                        <div>
                                                                                                            <div className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1">
                                                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                                                                                                </svg>
                                                                                                                Themes emphasized:
                                                                                                            </div>
                                                                                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                                                                                {reasoning.themes.map((theme, themeIndex) => (
                                                                                                                    <span key={themeIndex} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                                                                                        {theme}
                                                                                                                    </span>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                            {formData.recommendations && formData.recommendations.length > 0 && (
                                                                                                                <p className="text-xs text-blue-700 italic">
                                                                                                                    This bullet demonstrates: {formData.recommendations.slice(0, 2).join(', ')}
                                                                                                                    {formData.recommendations.length > 2 && '...'}
                                                                                                                </p>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    
                                                                                                    {reasoning.hasKeywords && reasoning.keywords.length > 0 && (
                                                                                                        <div>
                                                                                                            <div className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1">
                                                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                                                                                                                </svg>
                                                                                                                Keywords incorporated:
                                                                                                            </div>
                                                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                                                {reasoning.keywords.map((keyword, kwIndex) => (
                                                                                                                    <span key={kwIndex} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                                                                                        {keyword}
                                                                                                                    </span>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                            <p className="text-xs text-blue-700 italic mt-1">
                                                                                                                Added to improve ATS matching and relevance
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    
                                                                                                    {reasoning.tone && (
                                                                                                        <div>
                                                                                                            <div className="text-xs font-medium text-blue-800 mb-1.5 flex items-center gap-1">
                                                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                                                                                                                </svg>
                                                                                                                Tone adjustment:
                                                                                                            </div>
                                                                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium capitalize">
                                                                                                                {reasoning.tone}-level language used
                                                                                                            </span>
                                                                                                            <p className="text-xs text-blue-700 italic mt-1">
                                                                                                                {reasoning.tone === 'senior' && 'Emphasizes leadership, strategic impact, and decision-making authority'}
                                                                                                                {reasoning.tone === 'mid' && 'Balances technical depth with collaboration and impact'}
                                                                                                                {reasoning.tone === 'junior' && 'Focuses on foundational skills, learning ability, and growth potential'}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    )}
                                                                                                    
                                                                                                    {!reasoning.hasThemes && !reasoning.hasKeywords && !reasoning.tone && (
                                                                                                        <div>
                                                                                                            <p className="text-xs text-blue-700 mb-1">
                                                                                                                Rewritten to follow impact-focused format:
                                                                                                            </p>
                                                                                                            <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside ml-2">
                                                                                                                <li>Stronger action verbs</li>
                                                                                                                <li>Quantifiable results</li>
                                                                                                                <li>Clear impact statements</li>
                                                                                                            </ul>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })()}
                                                                        </div>
                                                                        {displayBullets.length > 1 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveBullet(index, bulletIndex)}
                                                                                className="flex-shrink-0 px-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition duration-200"
                                                                                title="Remove this bullet point"
                                                                            >
                                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                    
                                                    {/* Add new bullet button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddBullet(index)}
                                                        className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200 flex items-center justify-center space-x-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span>Add Bullet Point</span>
                                                    </button>
                                                </div>
                                            )
                                        })()}
                                        
                                        {/* <button
                                            type="button"
                                            onClick={() => handleImproveExperience(index)}
                                            disabled={improvingExperienceIndex === index || !exp.description?.trim()}
                                            className={`w-full px-4 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center space-x-2 bg-purple-600 text-white hover:bg-purple-700 ${
                                                improvingExperienceIndex === index || !exp.description?.trim()
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                                            }`}
                                        >
                                            {improvingExperienceIndex === index ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Improving...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                    </svg>
                                                    <span>Improve description</span>
                                                </>
                                            )}
                                        </button> */}
                                        {/* <p className="mt-1 text-xs text-gray-500">Use bullet points to describe your responsibilities and achievements</p> */}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {experiences.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No work experience added yet. Click "Add Experience" to get started.</p>
                            </div>
                        )}
                    </div>
                )
            case 5:
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">Education</label>
                            <button
                                type="button"
                                onClick={addEducation}
                                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Add Education</span>
                            </button>
                        </div>
                        
                        {educationEntries.map((entry: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Education #{index + 1}</h3>
                                    {educationEntries.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeEducation(index)}
                                            className="text-red-600 hover:text-red-700 transition duration-200"
                                            title="Remove this education entry"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                                        <input
                                            type="text"
                                            placeholder="Bachelor of Science in Computer Science"
                                            value={entry.degree || ''}
                                            onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">School / Institution</label>
                                            <input
                                                type="text"
                                                placeholder="University of Technology"
                                                value={entry.school || ''}
                                                onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Dates</label>
                                            <input
                                                type="text"
                                                placeholder="2015-2019"
                                                value={entry.dates || ''}
                                                onChange={(e) => handleEducationChange(index, 'dates', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">GPA</label>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Optional</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="3.8 / 4.0"
                                            value={entry.gpa || ''}
                                            onChange={(e) => handleEducationChange(index, 'gpa', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">If your GPA is strong, including it is a good call.</p>
                                    </div>
                                    
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Relevant Coursework</label>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Optional</span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Data Structures, Algorithms, Software Engineering"
                                            value={entry.coursework || ''}
                                            onChange={(e) => handleEducationChange(index, 'coursework', e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {educationEntries.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No education entries added yet. Click "Add Education" to get started.</p>
                            </div>
                        )}

                        {/* Certifications Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-medium text-gray-700">Certifications</label>
                                <button
                                    type="button"
                                    onClick={addCertification}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200 flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Add Certification</span>
                                </button>
                            </div>
                            
                            {certifications.map((cert: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-3">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-gray-700">Certification #{index + 1}</h4>
                                        <button
                                            type="button"
                                            onClick={() => removeCertification(index)}
                                            className="text-red-600 hover:text-red-700 transition duration-200"
                                            title="Remove this certification"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Certification Name</label>
                                            <input
                                                type="text"
                                                placeholder="AWS Certified Developer – Associate"
                                                value={cert.name || ''}
                                                onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                            <input
                                                type="text"
                                                placeholder="2022"
                                                value={cert.dates || ''}
                                                onChange={(e) => handleCertificationChange(index, 'dates', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {certifications.length === 0 && (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    <p>No certifications added yet. Click "Add Certification" to add one.</p>
                                </div>
                            )}

                                                    {/* Common Mistakes to Avoid */}
                        <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-amber-900 mb-3">Common Mistakes to Avoid</h4>
                                    <ul className="space-y-2 text-sm text-amber-800">
                                        <li className="flex items-start space-x-2">
                                            <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                            <span>Listing high school once you have a degree</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                            <span>Long coursework lists</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                            <span>Mixing certifications into education bullets</span>
                                        </li>
                                        <li className="flex items-start space-x-2">
                                            <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                            <span>Putting education at the top of your resume when you have 5+ years experience</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )
            case 6:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                            <textarea 
                                name="skills" 
                                placeholder="JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Team Leadership"
                                required
                                rows={6}
                                value={formData.skills || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Add your skills in a comma-separated list.
                            </p>
                        </div>

                        {(() => {
                            const skillsKeywords = getSkillsRelevantKeywords()
                            return skillsKeywords.length > 0 && (
                                <>
                                    {(() => {
                                        const coverage = calculateKeywordCoverage()
                                        return (
                                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                        <label className="block text-sm font-semibold text-gray-800">
                                                            Keyword Coverage
                                                        </label>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-blue-700">
                                                            {coverage.percentage}%
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            {coverage.matched} of {coverage.total} keywords
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                                                    <div 
                                                        className={`h-3 rounded-full transition-all duration-500 ease-out ${
                                                            coverage.percentage >= 80 
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                                                : coverage.percentage >= 50 
                                                                ? 'bg-gradient-to-r from-yellow-400 to-orange-400' 
                                                                : 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                        }`}
                                                        style={{ width: `${coverage.percentage}%` }}
                                                    />
                                                </div>
                                                
                                                {/* Status Message */}
                                                <p className="text-xs text-gray-600 mt-2">
                                                    {coverage.percentage === 100 
                                                        ? '🎉 Perfect! All keywords are covered.' 
                                                        : coverage.percentage >= 80 
                                                        ? 'Great! You have strong keyword coverage.' 
                                                        : coverage.percentage >= 50 
                                                        ? 'Good start! Add more keywords to improve your match.' 
                                                        : 'Add keywords below to improve your resume match.'}
                                                </p>
                                            </div>
                                        )
                                    })()}
                                    
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Suggested Keywords (Technical Skills & Tools)
                                        </label>
                                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        {skillsKeywords
                                            .map((keyword: string) => ({
                                                keyword,
                                                count: countKeywordOccurrences(keyword),
                                                isAdded: isKeywordInSkills(keyword)
                                            }))
                                            .sort((a: { keyword: string; count: number; isAdded: boolean }, b: { keyword: string; count: number; isAdded: boolean }) => {
                                                // Sort: added keywords first, then by count
                                                if (a.isAdded !== b.isAdded) {
                                                    return a.isAdded ? 1 : -1
                                                }
                                                return b.count - a.count
                                            })
                                            .map((item: { keyword: string; count: number; isAdded: boolean }, index: number) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => !item.isAdded && addKeywordToSkills(item.keyword)}
                                                disabled={item.isAdded}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                                    item.isAdded
                                                        ? 'bg-green-100 border border-green-300 text-green-700 cursor-default'
                                                        : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 cursor-pointer active:scale-95'
                                                }`}
                                                title={item.isAdded ? 'Already in your skills' : `Click to add "${item.keyword}" (appears ${item.count} time${item.count !== 1 ? 's' : ''} in job description)`}
                                            >
                                                {item.keyword}
                                                {item.isAdded && (
                                                    <span className="ml-1.5">✓</span>
                                                )}
                                            </button>
                                        ))}
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Click on keywords to add them to your skills. Green badges indicate keywords already in your list.
                                </p>
                                </div>
                                </>
                            )
                        })()}
                    </div>
                )
            case 7:
                return (
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <label className="block text-sm font-medium text-gray-700">Portfolio / Website Link</label>
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Optional</span>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <input 
                                    name="portfolioLink" 
                                    type="url"
                                    placeholder="https://yourportfolio.com"
                                    value={formData.portfolioLink || ''}
                                    onChange={handleInputChange}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                />
                            </div>
                            {/* <p className="mt-2 text-xs text-gray-500 flex items-center gap-1"> */}
                                {/* <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg> */}
                                {/* This link will be <strong className="text-gray-700">clickable</strong> in your resume header and downloaded PDF. */}
                            {/* </p> */}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-medium text-gray-700">Portfolio / Projects Details</label>
                                <button
                                    type="button"
                                    onClick={addPortfolioProject}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition duration-200 flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Add Project</span>
                                </button>
                            </div>
                            
                            {portfolioProjects.map((project: any, index: number) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50 mb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700">Project #{index + 1}</h3>
                                        <button
                                            type="button"
                                            onClick={() => removePortfolioProject(index)}
                                            className="text-red-600 hover:text-red-700 transition duration-200"
                                            title="Remove this project"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                                            <input
                                                type="text"
                                                placeholder="Mobile Banking Redesign"
                                                value={project.name || ''}
                                                onChange={(e) => handlePortfolioProjectChange(index, 'name', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tools & Skills</label>
                                            <input
                                                type="text"
                                                placeholder="UI/UX, Figma, usability testing"
                                                value={project.toolsSkills || ''}
                                                onChange={(e) => handlePortfolioProjectChange(index, 'toolsSkills', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Measurable Outcome</label>
                                            <input
                                                type="text"
                                                placeholder="Increased task success rate by 32%"
                                                value={project.outcome || ''}
                                                onChange={(e) => handlePortfolioProjectChange(index, 'outcome', e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {portfolioProjects.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No projects added yet. Click "Add Project" to get started.</p>
                                </div>
                            )}

                            {portfolioProjects.length > 0 && (
                            <>
                            {/* Common Mistakes to Avoid */}
                            <div className="mt-6 p-5 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-amber-900 mb-3">Common Mistakes to Avoid</h4>
                                        <ul className="space-y-2 text-sm text-amber-800">
                                            {/* <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Turning the Portfolio Into a Mini Essay</span>
                                            </li> */}
                                            <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Listing Projects With No Outcomes</span>
                                            </li>
                                            <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Fake or Vague Metrics</span>
                                            </li>
                                            <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>6–10 projects in a CV</span>
                                            </li>
                                            <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Including Irrelevant Projects</span>
                                            </li>
                                            {/* <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Mixing Personal, Client, and Work Projects Without Context</span>
                                            </li> */}
                                            <li className="flex items-start space-x-2">
                                                <span className="text-amber-600 font-bold mt-0.5">❌</span>
                                                <span>Overloading With Tools</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            </>
                        )}
                        </div>

                    </div>
                )
            case 8:
                return (
                    <div className="space-y-4">
                        <div className="space-y-3">
                        {formData.summary && (
                            <>
                                    <div>
                                        <div className="flex items-center space-x-2 mb-2">
                                            <label className="block text-sm font-medium text-gray-700">Summary</label>
                                            {/* Info Icon */}
                                            <button
                                                type="button"
                                                onMouseEnter={(e) => {
                                                    setShowSummaryInfoTooltip(true)
                                                    // Store button position for tooltip positioning
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    setSummaryTooltipPosition({ 
                                                        top: rect.top - 220, 
                                                        left: rect.right + 8 
                                                    })
                                                }}
                                                onMouseLeave={() => {
                                                    setShowSummaryInfoTooltip(false)
                                                    setSummaryTooltipPosition(null)
                                                }}
                                                className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-700 flex items-center justify-center transition duration-200"
                                                title=""
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </button>
                                        </div>
                                        <textarea 
                                            name="summary" 
                                            placeholder={formData.summary}
                                            rows={6}
                                            value={formData.summary || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                                        />
                                        
                                        {/* Summary Info Tooltip */}
                                        {showSummaryInfoTooltip && (
                                            <div 
                                                className="fixed w-[520px] bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[9999] pointer-events-auto"
                                                style={{ 
                                                    maxWidth: 'min(520px, calc(100vw - 2rem))',
                                                    top: summaryTooltipPosition ? `${summaryTooltipPosition.top}px` : 'auto',
                                                    left: summaryTooltipPosition ? `${summaryTooltipPosition.left}px` : 'auto',
                                                    bottom: summaryTooltipPosition ? 'auto' : '1rem'
                                                }}
                                            >
                                                <h4 className="font-semibold text-sm text-gray-900 mb-3">How Summary is Generated</h4>
                                                <p className="text-xs text-gray-700 mb-4">
                                                    The summary is AI-generated based on your work experience, education, skills, and the target job description. It's tailored to match the seniority level and requirements of the role you're applying for.
                                                </p>
                                                
                                                <div className="space-y-3">
                                                    <div>
                                                        <h5 className="font-semibold text-xs text-gray-900 mb-2">Generation Process</h5>
                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                            <li>Analyzes your work experience, education, and skills</li>
                                                            <li>Matches your qualifications to the target job description</li>
                                                            <li>Adjusts language and seniority level based on the selected tone (junior/mid/senior)</li>
                                                            <li>Uses direct positioning (no "I", no names, no third person)</li>
                                                            <li>Avoids buzzwords and focuses on concrete achievements</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className="font-semibold text-xs text-gray-900 mb-2">Modification Options</h5>
                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                            <li><strong>More Concise:</strong> Reduces to 1-2 sentences (30-50 words) while keeping key information</li>
                                                            <li><strong>More Verbose:</strong> Expands to 3-4 sentences (80-120 words) with more specific details</li>
                                                            <li><strong>More Senior:</strong> Emphasizes senior-level experience, leadership, and strategic impact</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className="font-semibold text-xs text-gray-900 mb-2">Best Practices</h5>
                                                        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                                                            <li>Review and edit the generated summary to ensure accuracy</li>
                                                            <li>Make sure it reflects your actual experience and achievements</li>
                                                            <li>Ensure it aligns with the tone you've selected for your resume</li>
                                                            <li>Keep it concise and impactful - recruiters scan summaries quickly</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    </>
                            )}

                            <button
                                type="button"
                                onClick={handleGenerateSummary}
                                disabled={isGeneratingSummary || !formData.job?.trim()}
                                className={`w-full px-4 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center space-x-2 ${
                                    isGeneratingSummary || !formData.job?.trim()
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                }`}
                            >
                                {isGeneratingSummary ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Generating Summary...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                        </svg>
                                        <span>{formData.summary ? 'Regenerate Summary' : 'Generate Summary'}</span>
                                    </>
                                )}
                            </button>
                            
                            {formData.summary && (
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleModifySummary('concise')}
                                            disabled={isGeneratingSummary}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center justify-center space-x-1 ${
                                                isGeneratingSummary
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                            </svg>
                                            <span>More Concise</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleModifySummary('verbose')}
                                            disabled={isGeneratingSummary}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center justify-center space-x-1 ${
                                                isGeneratingSummary
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                                            </svg>
                                            <span>More Verbose</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleModifySummary('senior')}
                                            disabled={isGeneratingSummary}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center justify-center space-x-1 ${
                                                isGeneratingSummary
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                                            </svg>
                                            <span>More Senior</span>
                                        </button>
                                    </div>
                            )}
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    if (isFormCompleted) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Resume Generated!</h2>
                        <p className="text-gray-600">Your AI-powered resume is ready. You can edit your information anytime.</p>
                    </div>
                    
                    <button
                        type="button"
                        onClick={handleEditInfo}
                        className="bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center space-x-2 mx-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Info</span>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-5xl mx-auto" style={{ overflow: 'visible' }}>
            <ProgressIndicator />
    
            <div className="space-y-6" style={{ overflow: 'visible' }}>
                {/* Step Content */}
                <div className="min-h-[300px]" style={{ overflow: 'visible' }}>
                    {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center space-x-2 ${
                                currentStep === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Previous</span>
                        </button>

                        {!isFormCompleted && ((currentStep !== 1 && currentStep !== 2) || formData.name) && currentResumeId !== null && (
                            <button
                                type="button"
                                onClick={() => setShowPreview(!showPreview)}
                                className={`px-4 py-3 rounded-lg font-medium transition duration-200 flex items-center space-x-2 ${
                                    showPreview
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                            </button>
                        )}
                    </div>

                    <div className="text-sm text-gray-500">
                        Step {currentStep} of {STEPS.length}
                    </div>

                    {currentStep < STEPS.length ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            disabled={!validateStep(currentStep)}
                            className={`px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center space-x-2 ${
                                validateStep(currentStep)
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <span>Next</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            // onClick={handleSubmit}
                            onClick={handleDownloadPDF}
                            disabled={isGenerating || !validateStep(currentStep)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Generating PDF...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>Download to PDF</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
