'use client'

import { useState } from 'react'
import { generateFileName } from '../lib/pdfUtils'
import { validatePDFContent } from '../lib/pdfErrorHandler'
import { getDisplayClassName, TemplateId } from '../lib/templates'
import { generateSimplePreview } from '../lib/utils'
import '../styles/resume-display.css'

interface ResultProps {
    formData: any
    generatedResume: string
    currentStep?: number
    showPreview?: boolean
}

export default function Result({ formData, generatedResume, currentStep, showPreview = true }: ResultProps) {
    const [isDownloading, setIsDownloading] = useState(false)
    
    // Get the template from formData, default to 'professional-blue'
    const templateId: TemplateId = formData.template || 'professional-blue'
    const displayClassName = getDisplayClassName(templateId)
    
    // Generate preview if no generated resume yet
    // const previewContent = generatedResume || generateSimplePreview(formData, currentStep)
    const previewContent = generateSimplePreview(formData, currentStep)
    // const isPreview = !generatedResume
    const isPreview = true
    // Use template class if template is selected, even for preview
    const shouldUseTemplateClass = !isPreview || (isPreview && formData.template)
    const finalDisplayClassName = shouldUseTemplateClass ? displayClassName : ''

    const handleDownloadPDF = async () => {
        // Validate content before proceeding
        const validation = validatePDFContent(generatedResume)
        if (!validation.isValid) {
            alert(validation.error)
            return
        }

        setIsDownloading(true)

        try {
            // Generate filename from form data
            const fileName = generateFileName(formData)
            
            // Call the server-side PDF generation API
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: generatedResume,
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
    
    if (!showPreview && !generatedResume) {
        return null
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                {/* {isPreview && ( */}
                    <div className="mb-4 flex items-center justify-between flex-shrink-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            Live Preview
                        </h2>
                        {/* <span className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-full">
                            {isPreview ? (formData.template ? 'Template Preview' : 'Simple Format') : 'Final Resume'}
                        </span> */}
                    </div>
                {/* )} */}
                
                <div className="flex-1 bg-gray-50 rounded-lg p-4 sm:p-6 border-2 border-dashed border-gray-300 overflow-y-auto min-h-[300px] lg:min-h-0 custom-scrollbar">
                    {previewContent ? (
                        <div className={finalDisplayClassName} dangerouslySetInnerHTML={{ __html: previewContent }} />
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="text-center text-gray-500">
                                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <p className="text-base sm:text-lg font-medium">Your resume will appear here</p>
                                <p className="text-xs sm:text-sm mt-1">Fill out the form and click "Generate Resume" to get started</p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Download Button */}
                {/* {generatedResume && (
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
                )} */}
            </div>
        </>
    )
}