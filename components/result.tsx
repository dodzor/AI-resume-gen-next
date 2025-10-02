'use client'

import { useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function Result({ formData, generatedResume }: { formData: any, generatedResume: string }) {
    const [isDownloading, setIsDownloading] = useState(false)

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