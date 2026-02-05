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
      template: 'professional-blue' as const
    })
    
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedResume, setGeneratedResume] = useState('')
    const [isFormCompleted, setIsFormCompleted] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPreview, setShowPreview] = useState(true)
  
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="text-center py-6 px-4 sm:px-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">🤖 AI Resume Generator</h1>
            <p className="text-gray-600 text-base sm:text-lg">Create a professional resume in seconds with AI assistance</p>
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
