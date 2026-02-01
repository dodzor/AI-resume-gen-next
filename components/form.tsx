'use client'

import { useState } from 'react'
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
}

const STEPS = [
  { id: 1, title: 'Target Job', description: 'Analyze the job description to determine the CV tone and extract important keywords' },
  { id: 2, title: 'Personal Info', description: 'Basic information about you' },
  { id: 3, title: 'Experience', description: 'Your work history' },
  { id: 4, title: 'Education', description: 'Your educational background' },
  { id: 5, title: 'Skills', description: 'Your technical and soft skills' },
  { id: 6, title: 'Portfolio', description: 'Your projects and work samples (optional)' },
  { id: 7, title: 'Summary', description: 'A summary of your work experience, education, and skills tailored to the job you\'re applying for' },
  { id: 8, title: 'Template', description: 'Choose your resume style' }
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
  setShowPreview: setExternalShowPreview
}: FormProps) {
    const [internalCurrentStep, setInternalCurrentStep] = useState(1)
    const [internalShowPreview, setInternalShowPreview] = useState(true)
    const [maxStepReached, setMaxStepReached] = useState(1)

    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)   
    const [isDownloading, setIsDownloading] = useState(false)
    const [improvingExperienceIndex, setImprovingExperienceIndex] = useState<number | null>(null)    
    const [rewritingBullet, setRewritingBullet] = useState<{ experienceIndex: number; bulletIndex: number } | null>(null)
    const [isAnalyzingJobDescription, setIsAnalyzingJobDescription] = useState(false)
    const [analyzedTone, setAnalyzedTone] = useState<string | null>(formData.tone || null)    

    // Use external state if provided, otherwise use internal state
    const currentStep = externalCurrentStep ?? internalCurrentStep
    const setCurrentStep = setExternalCurrentStep ?? setInternalCurrentStep
    const showPreview = externalShowPreview ?? internalShowPreview
    const setShowPreview = setExternalShowPreview ?? setInternalShowPreview

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
                return formData.name?.trim() && formData.email?.trim()
            case 3:
                const experiences = formData.experiences || []
                return experiences.length > 0 && experiences.some((exp: any) => 
                    (exp.role?.trim() || exp.company?.trim()) && exp.description?.trim()
                )
            case 4:
                const educationEntries = formData.educationEntries || []
                return educationEntries.length > 0 && educationEntries.some((entry: any) => 
                    entry.degree?.trim() || entry.school?.trim()
                )
            case 5:
                return formData.skills?.trim()
            case 6:
                return true // Portfolio is optional
            case 7:
                return formData.job?.trim()
            case 8:
                return !!formData.template
            default:
                return false
        }
    }

    const handleTemplateSelect = (templateId: TemplateId) => {
        setFormData((prev: any) => ({
            ...prev,
            template: templateId
        }))
    }

    const nextStep = () => {
        if (validateStep(currentStep) && currentStep < STEPS.length) {
            const nextStepNum = currentStep + 1
            setCurrentStep(nextStepNum)
            setMaxStepReached(prev => Math.max(prev, nextStepNum))
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const goToStep = (step: number) => {
        // Allow going to any step that has been completed (step <= maxStepReached)
        // Or allow going to the next step if current step is valid
        if (step <= maxStepReached || (step === currentStep + 1 && validateStep(currentStep))) {
            setCurrentStep(step)
            setMaxStepReached(prev => Math.max(prev, step))
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
        
            // Update formData with the analyzed tone and keywords
            const tone = data.tone || 'mid'
            const keywords = data.keywords || []
            setAnalyzedTone(tone)
            setFormData((prev: any) => ({
                ...prev,
                tone: tone,
                keywords: keywords
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
                }),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to rewrite bullet')
            }
        
            // Update the specific bullet point
            handleBulletChange(experienceIndex, bulletIndex, data.rewrittenBullet)
        } catch (error) {
            console.error('Error rewriting bullet:', error)
            alert(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
        } finally {
            setRewritingBullet(null)
        }
    }

    const ProgressIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                {STEPS.map((step, index) => (
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
                                    : validateStep(currentStep) && step.id === currentStep + 1
                                    ? 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={step.id > maxStepReached + 1 || (step.id === currentStep + 1 && !validateStep(currentStep))}
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
                ))}
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
                                    </div>
                                </div>

                                {formData.keywords && formData.keywords.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-blue-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Extracted Keywords:</label>
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
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            case 2:
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
            case 3:
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
                            <div key={index} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
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
                                                    {displayBullets.map((bullet, bulletIndex) => (
                                                        <div key={bulletIndex} className="flex items-center gap-2">
                                                            <textarea
                                                                cols={2}
                                                                placeholder={`Bullet point ${bulletIndex + 1} (e.g., Built web applications using React and Node.js)`}
                                                                value={bullet}
                                                                onChange={(e) => handleBulletChange(index, bulletIndex, e.target.value)}
                                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRewriteBullet(index, bulletIndex)}
                                                                disabled={rewritingBullet?.experienceIndex === index && rewritingBullet?.bulletIndex === bulletIndex || !bullet.trim()}
                                                                className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded transition duration-200 flex items-center space-x-1 ${
                                                                    rewritingBullet?.experienceIndex === index && rewritingBullet?.bulletIndex === bulletIndex || !bullet.trim()
                                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                                }`}
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
                                                    ))}
                                                    
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
                                        
                                        <button
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
                                        </button>
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
            case 4:
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
                                            <span>Putting education at the top of your resume when you have 5+ years experience</span>
                                        </li>
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
                                    </ul>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                )
            case 5:
                return (
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
                )
            case 6:
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
            case 7:
                return (
                    <div className="space-y-4">
                        <div className="space-y-3">
                        {formData.summary && (
                            <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                                        <textarea 
                                            name="summary" 
                                            placeholder={formData.summary}
                                            rows={6}
                                            value={formData.summary || ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                                        />
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
            case 8:
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
        <div className="bg-white rounded-xl shadow-lg p-8">
            <ProgressIndicator />
    
            <div className="space-y-6">
                {/* Step Content */}
                <div className="min-h-[300px]">
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

                        {!isFormCompleted && (
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
                            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"                        >
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
