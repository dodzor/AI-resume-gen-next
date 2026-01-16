import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { createPDFStylesheet, TemplateId } from './templates'

export interface PDFGenerationOptions {
  content: string
  fileName?: string
  scale?: number
  backgroundColor?: string
  templateId?: TemplateId
  formData?: {
    email?: string
    phone?: string
    location?: string
    portfolioLink?: string
  }
}

interface LinkInfo {
  url: string
  text: string
  x: number
  y: number
  width: number
  height: number
}

interface ContainerDimensions {
  width: number
  height: number
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
    width: 794px; // A4 width in mm
    padding: 0px;
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
 * Extract link positions from the rendered container
 * Returns positions in CSS pixels relative to the container's top-left corner
 */
function extractLinkPositions(container: HTMLDivElement): { links: LinkInfo[], dimensions: ContainerDimensions } {
  const links: LinkInfo[] = []
  const containerRect = container.getBoundingClientRect()
  
  // Get the actual container dimensions (includes padding with content-box)
  const dimensions: ContainerDimensions = {
    width: container.offsetWidth,
    height: container.offsetHeight
  }
  
  // Find all anchor tags
  const anchors = container.querySelectorAll('a[href]')
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute('href')
    if (href && (href.startsWith('http') || href.startsWith('mailto:'))) {
      const rect = anchor.getBoundingClientRect()
      // Store positions in CSS pixels (not scaled)
      links.push({
        url: href,
        text: anchor.textContent || '',
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height
      })
    }
  })
  
  return { links, dimensions }
}

/**
 * Creates a PDF from canvas data with optional clickable links
 */
export function createPDFFromCanvas(
  canvas: HTMLCanvasElement, 
  fileName: string = 'Resume.pdf',
  links: LinkInfo[] = [],
  containerDimensions?: ContainerDimensions
): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4')
  
  const imgData = canvas.toDataURL('image/png')
  const imgWidth = 210 // A4 width in mm
  const pageHeight = 295 // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  let heightLeft = imgHeight
  
  // Calculate scale factor from CSS pixels to PDF mm
  // Use actual container width if provided, otherwise estimate from canvas
  const containerWidth = containerDimensions?.width || (canvas.width / 2)
  const scaleFactor = imgWidth / containerWidth
  
  let position = 0
  
  // Add first page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  
  // Add clickable links to first page
  links.forEach((link) => {
    // Convert CSS pixel positions to PDF mm positions
    const linkX = link.x * scaleFactor
    const linkY = link.y * scaleFactor
    const linkW = link.width * scaleFactor
    const linkH = link.height * scaleFactor
    
    // Only add links that are on the first page
    if (linkY < pageHeight && linkY >= 0) {
      pdf.link(linkX, linkY, linkW, linkH, { url: link.url })
    }
  })
  
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
    
    // Wait for layout to settle
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Extract link positions and container dimensions before rendering to canvas
    const { links, dimensions } = extractLinkPositions(pdfContainer)
    
    // Generate canvas (the stylesheet will be applied in the onclone callback)
    const canvas = await generateCanvas(pdfContainer, options)
    
    // Create and save PDF with clickable links, using actual container dimensions for scale
    const pdf = createPDFFromCanvas(canvas, options.fileName, links, dimensions)
    pdf.save(options.fileName || 'Resume.pdf')
    
  } finally {
    // Always clean up - remove temporary container
    if (document.body.contains(pdfContainer)) {
      document.body.removeChild(pdfContainer)
    }
  }
}
