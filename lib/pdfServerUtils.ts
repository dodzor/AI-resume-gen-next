import puppeteer from 'puppeteer';
import { createPDFStylesheet, TemplateId } from './templates';

export interface PDFGenerationOptions {
  content: string;
  templateId?: TemplateId;
  fileName?: string;
}

/**
 * Generates a complete HTML document with styles for PDF generation
 */
function createPDFHTML(content: string, templateId: TemplateId = 'professional-blue'): string {
  const stylesheet = createPDFStylesheet(templateId);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  ${stylesheet}
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Generates a PDF from HTML content using Puppeteer
 * Returns the PDF as a Buffer
 */
export async function generatePDFWithPuppeteer(
  options: PDFGenerationOptions
): Promise<Buffer> {
  const { content, templateId = 'professional-blue' } = options;
  
  if (!content) {
    throw new Error('No content provided for PDF generation');
  }

  // Create complete HTML document
  const html = createPDFHTML(content, templateId);

  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2,
    });

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Wait a bit for any CSS to fully apply (using standard Promise delay)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate PDF with A4 dimensions
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: false,
    });

    // Convert Uint8Array to Buffer
    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
