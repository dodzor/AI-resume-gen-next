'use client'

import { useState } from 'react'

interface FormProps {
  formData: any
  setFormData: React.Dispatch<React.SetStateAction<any>>
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
  setGeneratedResume: (resume: string) => void
}

const STEPS = [
  { id: 1, title: 'Personal Info', description: 'Basic information about you' },
  { id: 2, title: 'Experience', description: 'Your work history' },
  { id: 3, title: 'Skills', description: 'Your technical and soft skills' },
  { id: 4, title: 'Target Job', description: 'Job you\'re applying for' }
]

export default function Form({ 
  formData, 
  setFormData, 
  isGenerating, 
  setIsGenerating, 
  setGeneratedResume 
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
                return formData.skills?.trim()
            case 4:
                return formData.job?.trim()
            default:
                return false
        }
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
        
            setGeneratedResume(data.resume)
        } catch (error) {
            console.error('Error generating resume:', error)
            setGeneratedResume(`
                <div class="text-red-600 p-4 border border-red-300 rounded-lg bg-red-50">
                <h3 class="font-semibold mb-2">Error Generating Resume</h3>
                <p>${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}</p>
                </div>
            `)
        } finally {
            setIsGenerating(false)
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
            case 4:
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
            default:
                return null
        }
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
