/**
 * PDF Error Handler Utility
 * Handles specific error cases for PDF generation
 */

export interface PDFError {
  message: string
  type: 'color_parsing' | 'canvas_generation' | 'pdf_creation' | 'generic'
  originalError?: Error
}

/**
 * Analyzes an error and returns a user-friendly message
 */
export function handlePDFError(error: unknown): PDFError {
  console.error('Error generating PDF:', error)
  
  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('color function') || 
        error.message.includes('oklch') || 
        error.message.includes('lab')) {
      return {
        type: 'color_parsing',
        message: 'PDF generation failed due to unsupported CSS colors. This is a known issue that we\'re working to resolve.',
        originalError: error
      }
    }
    
    if (error.message.includes('canvas') || error.message.includes('html2canvas')) {
      return {
        type: 'canvas_generation',
        message: 'Failed to generate PDF canvas. Please try again or contact support if the issue persists.',
        originalError: error
      }
    }
    
    if (error.message.includes('jsPDF') || error.message.includes('PDF')) {
      return {
        type: 'pdf_creation',
        message: 'Failed to create PDF document. Please try again.',
        originalError: error
      }
    }
    
    // Generic error with specific message
    return {
      type: 'generic',
      message: `PDF generation failed: ${error.message}`,
      originalError: error
    }
  }
  
  // Unknown error type
  return {
    type: 'generic',
    message: 'An unexpected error occurred while generating the PDF. Please try again.',
    originalError: error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Shows an appropriate alert message for PDF errors
 */
export function showPDFErrorAlert(error: PDFError): void {
  alert(error.message)
}

/**
 * Validates content before PDF generation
 */
export function validatePDFContent(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      error: 'No resume content to download. Please generate a resume first.'
    }
  }
  
  // Check for potentially problematic content
  if (content.length > 100000) { // 100KB limit
    return {
      isValid: false,
      error: 'Resume content is too large for PDF generation. Please try with shorter content.'
    }
  }
  
  return { isValid: true }
}
