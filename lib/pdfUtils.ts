import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface PDFGenerationOptions {
  content: string
  fileName?: string
  scale?: number
  backgroundColor?: string
}

export interface PDFStylingOptions {
  width: number
  padding: number
  fontSize: number
  lineHeight: number
  headingColor: string
  fontFamily: string
}

/**
 * Default PDF styling configuration
 */
export const DEFAULT_PDF_STYLING: PDFStylingOptions = {
  width: 800,
  padding: 40,
  fontSize: 14,
  lineHeight: 1.5,
  headingColor: '#2563eb',
  fontFamily: 'Arial, sans-serif'
}

/**
 * Creates a temporary DOM container with PDF-friendly styling
 */
export function createPDFContainer(styling: PDFStylingOptions = DEFAULT_PDF_STYLING): HTMLDivElement {
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: ${styling.width}px;
    padding: ${styling.padding}px;
    background: white !important;
    font-family: ${styling.fontFamily} !important;
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
 * Applies PDF-friendly styles to content elements
 */
export function applyPDFStyles(
  contentDiv: HTMLDivElement, 
  styling: PDFStylingOptions = DEFAULT_PDF_STYLING
): void {
  // Apply base content styles
  contentDiv.style.cssText = `
    max-width: none;
    font-size: ${styling.fontSize}px;
    line-height: ${styling.lineHeight};
  `
  
  // Style headings
  const headings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
  headings.forEach((heading) => {
    ;(heading as HTMLElement).style.cssText = `
      color: ${styling.headingColor};
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
}

/**
 * Generates a canvas from HTML content using html2canvas
 */
export async function generateCanvas(
  container: HTMLDivElement,
  options: Partial<PDFGenerationOptions> = {}
): Promise<HTMLCanvasElement> {
  const canvas = await html2canvas(container, {
    scale: options.scale || 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor || '#ffffff',
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

  // Create temporary container
  const pdfContainer = createPDFContainer()
  
  try {
    // Create content div and set innerHTML
    const contentDiv = document.createElement('div')
    contentDiv.innerHTML = options.content
    
    // Apply PDF-friendly styles
    applyPDFStyles(contentDiv)
    
    // Add to container and DOM
    pdfContainer.appendChild(contentDiv)
    document.body.appendChild(pdfContainer)
    
    // Generate canvas
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
