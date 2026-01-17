'use client'

import { pdf } from '@react-pdf/renderer'
import { TemplateId } from './templates'
import { parseResumeHtml } from './htmlParser'
import { getResumeTemplate, ResumeData } from './reactPdfTemplates'

export interface ReactPDFGenerationOptions {
  content: string
  fileName?: string
  templateId?: TemplateId
}

/**
 * Generate PDF using react-pdf from HTML content
 */
export async function generateReactPDF(options: ReactPDFGenerationOptions): Promise<void> {
  const { content, fileName = 'Resume.pdf', templateId = 'professional-blue' } = options

  if (!content) {
    throw new Error('No content provided for PDF generation')
  }

  try {
    // Parse HTML to extract resume data
    const resumeData = parseResumeHtml(content)
    
    // Get the appropriate template component
    const templateComponent = getResumeTemplate(templateId, resumeData)
    
    // Generate PDF blob
    const blob = await pdf(templateComponent).toBlob()
    
    // Download the PDF
    downloadBlob(blob, fileName)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

/**
 * Generate PDF from structured resume data (bypasses HTML parsing)
 */
export async function generateReactPDFFromData(
  resumeData: ResumeData,
  templateId: TemplateId = 'professional-blue',
  fileName: string = 'Resume.pdf'
): Promise<void> {
  try {
    const templateComponent = getResumeTemplate(templateId, resumeData)
    const blob = await pdf(templateComponent).toBlob()
    downloadBlob(blob, fileName)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate filename from form data
 */
export function generateFileName(formData: { name?: string }): string {
  return formData?.name 
    ? `${formData.name.replace(/\s+/g, '_')}_Resume.pdf`
    : 'Resume.pdf'
}
