'use client'

import { Authenticated, Unauthenticated } from 'convex/react'
import { SignInButton, UserButton } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/** Automatically called when visiting the root route (/) */
export default function Home() {
  return (
    <>
      <Authenticated>
        <div className="flex justify-end p-4 fixed right-0">
          <UserButton />
        </div>
        <Content />
      </Authenticated>
      <Unauthenticated>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}

function Content() {
  const messages = useQuery(api.messages.getForCurrentUser)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    experience: '',
    skills: '',
    job: ''
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResume, setGeneratedResume] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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

  const handleDownloadPDF = async () => {
    if (!generatedResume) {
      alert('No resume content to download. Please generate a resume first.')
      return
    }

    setIsDownloading(true)

    try {
      // Create a temporary container with better styling for PDF
      const pdfContainer = document.createElement('div')
      pdfContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        padding: 40px;
        background: white !important;
        font-family: Arial, sans-serif !important;
        line-height: 1.6 !important;
        color: #333 !important;
        border: none !important;
        margin: 0 !important;
        box-shadow: none !important;
        isolation: isolate;
      `
      
      // Create content div and set innerHTML
      const contentDiv = document.createElement('div')
      contentDiv.innerHTML = generatedResume
      
      // Apply PDF-friendly styles
      contentDiv.style.cssText = `
        max-width: none;
        font-size: 14px;
        line-height: 1.5;
      `
      
      // Style headings for PDF
      const headings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach((heading) => {
        ;(heading as HTMLElement).style.cssText = `
          color: #2563eb;
          margin: 20px 0 10px 0;
          font-weight: bold;
        `
      })
      
      // Style paragraphs
      const paragraphs = contentDiv.querySelectorAll('p')
      paragraphs.forEach((p) => {
        ;(p as HTMLElement).style.margin = '10px 0'
      })
      
      // Style lists
      const lists = contentDiv.querySelectorAll('ul, ol')
      lists.forEach((list) => {
        ;(list as HTMLElement).style.margin = '10px 0'
        ;(list as HTMLElement).style.paddingLeft = '20px'
      })
      
      pdfContainer.appendChild(contentDiv)
      document.body.appendChild(pdfContainer)
      
      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          return element.tagName === 'SCRIPT' || 
                 element.tagName === 'STYLE' ||
                 element.classList?.contains('ignore-pdf')
        },
        onclone: (clonedDoc) => {
          // Remove all external stylesheets completely
          const externalStyles = clonedDoc.querySelectorAll('link[rel="stylesheet"]')
          externalStyles.forEach(link => link.remove())
          
          // Remove all style tags completely to avoid parsing issues
          const styleTags = clonedDoc.querySelectorAll('style')
          styleTags.forEach(style => style.remove())
          
          // Remove any CSS custom properties from the root
          // const htmlElement = clonedDoc.documentElement
          // if (htmlElement) {
          //   htmlElement.style.cssText = ''
          //   htmlElement.removeAttribute('class')
          // }
          
          // const bodyElement = clonedDoc.body
          // if (bodyElement) {
          //   bodyElement.style.cssText = 'background: white; color: #333; font-family: Arial, sans-serif;'
          //   bodyElement.removeAttribute('class')
          // }
          
          // Clean all elements of problematic classes and styles
          // const allElements = clonedDoc.querySelectorAll('*')
          // allElements.forEach(el => {
          //   // Remove all classes to avoid CSS conflicts
          //   el.removeAttribute('class')
            
          //   // Clean inline styles if they exist
          //   const style = el.getAttribute('style')
          //   if (style) {
          //     // Only keep basic, safe styles
          //     const safeStyle = style
          //       .replace(/oklch\([^)]+\)/g, 'transparent')
          //       .replace(/lab\([^)]+\)/g, 'transparent')
          //       .replace(/lch\([^)]+\)/g, 'transparent')
          //       .replace(/oklab\([^)]+\)/g, 'transparent')
          //       .replace(/color\([^)]+\)/g, 'transparent')
          //       .replace(/var\([^)]+\)/g, 'transparent')
          //     el.setAttribute('style', safeStyle)
          //   }
          // })
        }
      })
      
      // Remove temporary container
      document.body.removeChild(pdfContainer)
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      
      let position = 0
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      // Get name from form for filename
      const fileName = formData.name 
        ? `${formData.name.replace(/\s+/g, '_')}_Resume.pdf`
        : 'Resume.pdf'
      
      // Download the PDF
      pdf.save(fileName)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      
      // Provide specific error message for color parsing issues
      let errorMessage = 'Error generating PDF. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('color function') || error.message.includes('oklch') || error.message.includes('lab')) {
          errorMessage = 'PDF generation failed due to unsupported CSS colors. This is a known issue that we\'re working to resolve.'
        } else {
          errorMessage = `PDF generation failed: ${error.message}`
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🤖 AI Resume Generator</h1>
          <p className="text-gray-600 text-lg">Create a professional resume in seconds with AI assistance</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
              Your Information
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input 
                    name="name" 
                    type="text"
                    placeholder="John Doe" 
                    required
                    value={formData.name}
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
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                  />
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Experience</label>
                <textarea 
                  name="experience" 
                  placeholder="• Software Developer at Tech Corp (2020-2023)&#10;  - Built web applications using React and Node.js&#10;  - Improved system performance by 40%&#10;&#10;• Junior Developer at StartupXYZ (2019-2020)&#10;  - Developed mobile apps using React Native"
                  required
                  rows={6}
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                />
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <textarea 
                  name="skills" 
                  placeholder="JavaScript, React, Node.js, Python, SQL, Git, AWS, Docker, Agile, Problem Solving, Team Leadership"
                  required
                  rows={4}
                  value={formData.skills}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                />
              </div>

              {/* Target Job */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Job Description</label>
                <textarea 
                  name="job" 
                  placeholder="Senior Full Stack Developer position requiring expertise in modern web technologies, database design, and team collaboration. Looking for someone with 3+ years experience in React, Node.js, and cloud platforms."
                  required
                  rows={5}
                  value={formData.job}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            </form>
          </div>

          {/* Result Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
              Your Resume
            </h2>
            
            <div className="min-h-[400px] bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              {generatedResume ? (
                <div dangerouslySetInnerHTML={{ __html: generatedResume }} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p className="text-lg font-medium">Your resume will appear here</p>
                    <p className="text-sm">Fill out the form and click "Generate Resume" to get started</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Download Button */}
            {generatedResume && (
              <div className="mt-6 text-center">
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition duration-200 flex items-center justify-center space-x-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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
                      <span>Download as PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by AI • Generate professional resumes in seconds</p>
        </div>
      </div>
    </div>
  )
}
