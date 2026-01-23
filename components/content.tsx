'use client'

import { useState } from 'react'
import Result from './result'
import Form from './form'

export default function Content() {
    
    // Form state - lifted up to parent
    const [formData, setFormData] = useState({
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '',
      location: '',
      experience: '• Software Developer at Tech Corp (2020-2023)\n  - Built web applications using React and Node.js\n  - Improved system performance by 40%\n\n• Junior Developer at StartupXYZ (2019-2020)\n  - Developed mobile apps using React Native',
      education: '• Bachelor of Science in Computer Science\n  University of Technology (2015-2019)\n  - GPA: 3.8/4.0\n  - Relevant Coursework: Data Structures, Algorithms, Software Engineering\n\n• Certifications:\n  - AWS Certified Developer Associate (2022)\n  - Google Cloud Professional Developer (2021)',
      skills: 'JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Problem Solving, Team Leadership',
      portfolio: '',
      portfolioLink: '',
      job: 'Senior Full Stack Developer position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms.',
      template: 'professional-blue' as const
    })
    
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState('')
    const [isFormCompleted, setIsFormCompleted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPreview, setShowPreview] = useState(true)
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">🤖 AI Resume Generator</h1>
            <p className="text-gray-600 text-lg">Create a professional resume in seconds with AI assistance</p>
          </div>
  
          <div className="max-w-5xl mx-auto">
            {isFormCompleted ? (
              // Full-width layout when form is completed
              <div className="space-y-6">
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
              // Side-by-side layout during form filling
              // <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
              <div className="grid gap-6">
                <div className={showPreview ? 'lg:order-1' : ''}>
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
                
                {showPreview && (
                  <div className="lg:order-2">
                    <Result 
                      formData={formData} 
                      generatedResume={generatedResume}
                      currentStep={currentStep}
                      showPreview={showPreview}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Footer */}
          <div className="text-center mt-12 text-gray-500 text-sm">
            <p>Powered by AI • Generate professional resumes in seconds</p>
          </div>
        </div>
      </div>
    )
}
