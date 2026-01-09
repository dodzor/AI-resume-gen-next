'use client'

import { useState } from 'react'
import { TEMPLATES, TemplateId } from '../lib/templates'

interface FormProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  setGeneratedResume: (resume: string) => void
  isFormCompleted: boolean
  setIsFormCompleted: (completed: boolean) => void
}

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Basic information about you' },
  { id: 2, title: 'Experience', description: 'Your work history' },
  { id: 3, title: 'Education', description: 'Your educational background' },
  { id: 4, title: 'Skills', description: 'Your technical and soft skills' },
  { id: 5, title: 'Target Job', description: 'Job you\'re applying for' },
  { id: 6, title: 'Template', description: 'Choose your resume style' }
]

export default function Form({ 
  formData, 
  setFormData, 
  isGenerating, 
  setIsGenerating, 
  setGeneratedResume,
  isFormCompleted,
  setIsFormCompleted
}: FormProps) {
    const [currentStep, setCurrentStep] = useState(1)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({
          ...prev,
          [name]: value
        }))
    }

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                return formData.name?.trim() && formData.email?.trim()
            case 2:
                return formData.experience?.trim()
            case 3:
                return formData.education?.trim()
            case 4:
                return formData.skills?.trim()
            case 5:
                return formData.job?.trim()
            case 6:
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
            setCurrentStep(currentStep + 1)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const goToStep = (step: number) => {
        // Allow going to previous steps or next step if current is valid
        if (step < currentStep || (step === currentStep + 1 && validateStep(currentStep))) {
            setCurrentStep(step)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsGenerating(true)
        
        try {
            const response = await fetch('/api/generate-resume', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })
    
            const data = await response.json()
        
            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate resume')
            }
        
            console.log('Generated resume:', data.resume)
            setGeneratedResume(data.resume)
            setIsFormCompleted(true) // Mark form as completed
        } catch (error) {
            console.error('Error generating resume:', error)
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

    const handleEditInfo = () => {
        setIsFormCompleted(false)
        setCurrentStep(1) // Reset to first step when editing
    }

    const ProgressIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => goToStep(step.id)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                                step.id === currentStep
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : step.id < currentStep
                                    ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600'
                                    : validateStep(currentStep) && step.id === currentStep + 1
                                    ? 'bg-gray-200 text-gray-600 cursor-pointer hover:bg-gray-300'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={step.id > currentStep + 1 || (step.id === currentStep + 1 && !validateStep(currentStep))}
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
                            <div className={`w-28 h-1 mx-2 rounded-full transition-all duration-200 ${
                                step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
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
                    </div>
                )
            case 2:
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                        <textarea 
                            name="experience" 
                            placeholder="• Software Developer at Tech Corp (2020-2023)&#10;  - Built web applications using React and Node.js&#10;  - Improved system performance by 40%&#10;&#10;• Junior Developer at StartupXYZ (2019-2020)&#10;  - Developed mobile apps using React Native"
                            required
                            rows={8}
                            value={formData.experience || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                        />
                    </div>
                )
            case 3:
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                        <textarea 
                            name="education" 
                            placeholder="• Bachelor of Science in Computer Science&#10;  University of Technology (2015-2019)&#10;  - GPA: 3.8/4.0&#10;  - Relevant Coursework: Data Structures, Algorithms, Software Engineering&#10;&#10;• Certifications:&#10;  - AWS Certified Developer Associate (2022)&#10;  - Google Cloud Professional Developer (2021)"
                            required
                            rows={8}
                            value={formData.education || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                        />
                    </div>
                )
            case 4:
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                        <textarea 
                            name="skills" 
                            placeholder="JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Problem Solving, Team Leadership"
                            required
                            rows={6}
                            value={formData.skills || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                        />
                    </div>
                )
            case 5:
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Job Description</label>
                        <textarea 
                            name="job" 
                            placeholder="Senior Full Stack Developer position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms."
                            required
                            rows={7}
                            value={formData.job || ''}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                        />
                    </div>
                )
            case 6:
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
                            onClick={handleSubmit}
                            disabled={isGenerating || !validateStep(currentStep)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-8 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    <span>Generate Resume</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
