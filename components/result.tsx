'use client'

import { useState } from 'react'
import { generatePDF, generateFileName } from '../lib/pdfUtils'
import { validatePDFContent, handlePDFError, showPDFErrorAlert } from '../lib/pdfErrorHandler'

export default function Result({ formData, generatedResume }: { formData: any, generatedResume: string }) {
    const [isDownloading, setIsDownloading] = useState(false)

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
            
            // Generate and download PDF using utility functions
            await generatePDF({
                content: generatedResume,
                fileName,
                scale: 2,
                backgroundColor: '#ffffff'
            })
            
        } catch (error) {
            // Handle errors using utility function
            const pdfError = handlePDFError(error)
            showPDFErrorAlert(pdfError)
        } finally {
            setIsDownloading(false)
        }
    }
    
    return (
        <>
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
        </>
    )
}