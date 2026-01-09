import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { createPDFStylesheet, TemplateId } from './templates'

export interface PDFGenerationOptions {
  content: string
  fileName?: string
  scale?: number
  backgroundColor?: string
  templateId?: TemplateId
}

/**
 * Creates a temporary DOM container for PDF generation
 */
function createPDFContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 800px;
    padding: 40px;
    background: white !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    line-height: 1.6 !important;
    color: #333 !important;
    border: none !important;
    margin: 0 !important;
    box-shadow: none !important;
    isolation: isolate;
  `
  return container
}

/**
 * Generates a canvas from HTML content using html2canvas
 */
async function generateCanvas(
  container: HTMLDivElement,
  options: Partial<PDFGenerationOptions> = {}
): Promise<HTMLCanvasElement> {
  const templateId = options.templateId || 'professional-blue'
  
  const canvas = await html2canvas(container, {
    scale: options.scale || 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor || '#ffffff',
    ignoreElements: (element) => {
      // Skip elements that might cause issues
      return element.tagName === 'SCRIPT' || 
             element.classList?.contains('ignore-pdf')
    },
    onclone: (clonedDoc) => {
      // Remove external stylesheets to avoid loading issues
      const externalStyles = clonedDoc.querySelectorAll('link[rel="stylesheet"]')
      externalStyles.forEach(link => link.remove())
      
      // Remove existing style tags to avoid conflicts
      const styleTags = clonedDoc.querySelectorAll('style')
      styleTags.forEach(style => style.remove())
      
      // Add our clean PDF stylesheet for the selected template
      const head = clonedDoc.head || clonedDoc.getElementsByTagName('head')[0]
      if (head) {
        head.insertAdjacentHTML('beforeend', createPDFStylesheet(templateId))
      }
    }
  })
  
  return canvas
}

/**
 * Creates a PDF from canvas data
 */
export function createPDFFromCanvas(canvas: HTMLCanvasElement, fileName: string = 'Resume.pdf'): jsPDF {
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
  
  return pdf
}

/**
 * Generates a filename from form data
 */
export function generateFileName(formData: any): string {
  return formData?.name 
    ? `${formData.name.replace(/\s+/g, '_')}_Resume.pdf`
    : 'Resume.pdf'
}

/**
 * Main function to generate and download PDF from HTML content
 */
export async function generatePDF(options: PDFGenerationOptions): Promise<void> {
  if (!options.content) {
    throw new Error('No content provided for PDF generation')
  }

  // Create temporary container with clean styling
  const pdfContainer = createPDFContainer()
  
  try {
    // Create content div and set innerHTML
    const contentDiv = document.createElement('div')
    contentDiv.innerHTML = options.content
    
    // Add to container and DOM
    pdfContainer.appendChild(contentDiv)
    document.body.appendChild(pdfContainer)
    
    // Generate canvas (the stylesheet will be applied in the onclone callback)
    const canvas = await generateCanvas(pdfContainer, options)
    
    // Create and save PDF
    const pdf = createPDFFromCanvas(canvas, options.fileName)
    pdf.save(options.fileName || 'Resume.pdf')
    
  } finally {
    // Always clean up - remove temporary container
    if (document.body.contains(pdfContainer)) {
      document.body.removeChild(pdfContainer)
    }
  }
}
