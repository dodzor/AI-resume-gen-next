import puppeteer from 'puppeteer';
import { createPDFStylesheet, TemplateId } from './templates';

export interface PDFGenerationOptions {
  content: string;
  templateId?: TemplateId;
  fileName?: string;
}

/**
 * Scales font sizes in CSS string by a given factor
 * Only scales font-size properties, preserving other styles
 */
function scaleFontSizes(css: string, scaleFactor: number): string {
  // Match font-size declarations (e.g., font-size: 13px; or font-size: 28px;)
  return css.replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, (match, size) => {
    const originalSize = parseFloat(size);
    const scaledSize = Math.max(originalSize * scaleFactor, 8); // Minimum 8px for readability
    return `font-size: ${scaledSize.toFixed(1)}px`;
  });
}

/**
 * Scales line-height values in CSS string by a given factor
 * Handles unitless numbers, px, and em values
 * Preserves other styles
 */
function scaleLineHeight(css: string, scaleFactor: number): string {
  // Match line-height declarations with different formats:
  // - Unitless: line-height: 1.5;
  // - Pixels: line-height: 20px;
  // - Em: line-height: 1.2em;
  
  return css.replace(/line-height:\s*([\d.]+)(px|em)?/gi, (match, value, unit) => {
    const originalValue = parseFloat(value);
    let scaledValue: number;
    
    if (!unit) {
      // Unitless line-height (e.g., 1.5, 1.6)
      // Scale it proportionally but maintain minimum of 1.2 for readability
      scaledValue = Math.max(originalValue * scaleFactor, 1.2);
    } else if (unit === 'px') {
      // Pixel-based line-height
      // Scale proportionally with minimum of 12px
      scaledValue = Math.max(originalValue * scaleFactor, 12);
    } else if (unit === 'em') {
      // Em-based line-height
      // Scale proportionally with minimum of 1.1em
      scaledValue = Math.max(originalValue * scaleFactor, 1.1);
    } else {
      // Fallback (shouldn't happen with current regex)
      scaledValue = originalValue * scaleFactor;
    }
    
    // Format with appropriate precision
    const precision = unit === 'px' ? 1 : 2;
    return `line-height: ${scaledValue.toFixed(precision)}${unit || ''}`;
  });
}

/**
 * Scales margin and padding values in CSS string by a given factor
 * Handles individual properties (margin-top, padding-bottom, etc.)
 * Handles shorthand properties (margin: 10px 20px; padding: 5px 10px 15px 20px;)
 * Handles px, em, and rem units
 * Excludes horizontal padding (padding-left, padding-right) for specific resume-display-* classes
 * Preserves other styles
 */
function scaleMarginsAndPaddings(css: string, scaleFactor: number): string {
  // Helper function to scale a single value
  const scaleValue = (value: string, unit: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value; // Return as-is if not a number
    
    let scaledValue: number;
    let minValue: number;
    
    if (unit === 'px') {
      minValue = 4; // Minimum 4px for margins/paddings
      scaledValue = Math.max(numValue * scaleFactor, minValue);
      return `${scaledValue.toFixed(1)}px`;
    } else if (unit === 'em' || unit === 'rem') {
      minValue = 0.3; // Minimum 0.3em/rem
      scaledValue = Math.max(numValue * scaleFactor, minValue);
      return `${scaledValue.toFixed(2)}${unit}`;
    } else {
      // No unit or unknown unit - scale proportionally
      scaledValue = numValue * scaleFactor;
      return `${scaledValue.toFixed(2)}${unit || ''}`;
    }
  };
  
  // Specific classes that should exclude horizontal padding scaling
  const excludedClasses = [
    '.resume-display-developer',
    '.resume-display-professional-blue',
    '.resume-display-modern-minimal',
    '.resume-display-creative-designer'
  ];
  
  // Helper function to check if a selector contains one of the excluded classes
  const shouldExcludeHorizontalPadding = (selectorContext: string): boolean => {
    return excludedClasses.some(className => selectorContext.includes(className));
  };
  
  // Split CSS into rule blocks (selectors + declarations)
  // This allows us to check the selector before scaling properties
  const ruleBlocks: string[] = [];
  let currentBlock = '';
  let depth = 0;
  
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    currentBlock += char;
    
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        ruleBlocks.push(currentBlock);
        currentBlock = '';
      }
    }
  }
  
  // Add any remaining content (shouldn't happen in well-formed CSS, but handle it)
  if (currentBlock.trim()) {
    ruleBlocks.push(currentBlock);
  }
  
  // Process each rule block
  const processedBlocks = ruleBlocks.map(block => {
    // Extract selector (everything before the first {)
    const selectorMatch = block.match(/^([^{]+)\{/);
    if (!selectorMatch) return block; // Skip if malformed (e.g., closing brace without opening)
    
    const selector = selectorMatch[1];
    const excludeHorizontalPadding = shouldExcludeHorizontalPadding(selector);
    const braceIndex = block.indexOf('{');
    const lastBraceIndex = block.lastIndexOf('}');
    const declarations = block.substring(braceIndex + 1, lastBraceIndex);
    
    // Scale margins for all selectors
    let processedDeclarations = declarations;
    
    // Scale individual margin properties
    processedDeclarations = processedDeclarations.replace(/(margin-(?:top|right|bottom|left)):\s*([\d.]+)(px|em|rem)?/gi, (match, property, value, unit) => {
      return `${property}: ${scaleValue(value, unit || 'px')}`;
    });
    
    // Scale shorthand margin property
    processedDeclarations = processedDeclarations.replace(/margin:\s*((?:[\d.]+(?:px|em|rem)\s*)+)/gi, (match, values) => {
      const valueList = values.trim().split(/\s+/);
      const scaledValues = valueList.map((val: string) => {
        const match = val.match(/([\d.]+)(px|em|rem)?/i);
        if (match) {
          return scaleValue(match[1], match[2] || 'px');
        }
        return val;
      });
      return `margin: ${scaledValues.join(' ')}`;
    });
    
    // Scale padding properties
    // For excluded classes, skip padding-left and padding-right (horizontal padding)
    if (excludeHorizontalPadding) {
      // Scale vertical padding only (top and bottom)
      processedDeclarations = processedDeclarations.replace(/(padding-(?:top|bottom)):\s*([\d.]+)(px|em|rem)?/gi, (match, property, value, unit) => {
        return `${property}: ${scaleValue(value, unit || 'px')}`;
      });
      
      // For shorthand padding, we need to preserve horizontal values
      // padding: 10px; -> padding: 10px; (no change if single value)
      // padding: 10px 20px; -> padding: 10px 20px; (preserve horizontal)
      // padding: 5px 10px 15px; -> padding: 5px 10px 15px; (preserve horizontal)
      // padding: 5px 10px 15px 20px; -> padding: 5px 10px 15px 20px; (preserve horizontal)
      // Actually, for shorthand, we should scale vertical (top/bottom) but not horizontal (left/right)
      processedDeclarations = processedDeclarations.replace(/padding:\s*((?:[\d.]+(?:px|em|rem)\s*)+)/gi, (match, values) => {
        const valueList = values.trim().split(/\s+/);
        if (valueList.length === 1) {
          // Single value applies to all sides - don't scale (preserve horizontal)
          return match;
        } else if (valueList.length === 2) {
          // Two values: vertical horizontal - scale vertical only
          const verticalMatch = valueList[0].match(/([\d.]+)(px|em|rem)?/i);
          if (verticalMatch) {
            const scaledVertical = scaleValue(verticalMatch[1], verticalMatch[2] || 'px');
            return `padding: ${scaledVertical} ${valueList[1]}`;
          }
          return match;
        } else if (valueList.length === 3) {
          // Three values: top horizontal bottom - scale top and bottom only
          const topMatch = valueList[0].match(/([\d.]+)(px|em|rem)?/i);
          const bottomMatch = valueList[2].match(/([\d.]+)(px|em|rem)?/i);
          if (topMatch && bottomMatch) {
            const scaledTop = scaleValue(topMatch[1], topMatch[2] || 'px');
            const scaledBottom = scaleValue(bottomMatch[1], bottomMatch[2] || 'px');
            return `padding: ${scaledTop} ${valueList[1]} ${scaledBottom}`;
          }
          return match;
        } else if (valueList.length === 4) {
          // Four values: top right bottom left - scale top and bottom only
          const topMatch = valueList[0].match(/([\d.]+)(px|em|rem)?/i);
          const bottomMatch = valueList[2].match(/([\d.]+)(px|em|rem)?/i);
          if (topMatch && bottomMatch) {
            const scaledTop = scaleValue(topMatch[1], topMatch[2] || 'px');
            const scaledBottom = scaleValue(bottomMatch[1], bottomMatch[2] || 'px');
            return `padding: ${scaledTop} ${valueList[1]} ${scaledBottom} ${valueList[3]}`;
          }
          return match;
        }
        return match;
      });
    } else {
      // For non-excluded classes, scale all padding properties normally
      // Scale individual padding properties
      processedDeclarations = processedDeclarations.replace(/(padding-(?:top|right|bottom|left)):\s*([\d.]+)(px|em|rem)?/gi, (match, property, value, unit) => {
        return `${property}: ${scaleValue(value, unit || 'px')}`;
      });
      
      // Scale shorthand padding property
      processedDeclarations = processedDeclarations.replace(/padding:\s*((?:[\d.]+(?:px|em|rem)\s*)+)/gi, (match, values) => {
        const valueList = values.trim().split(/\s+/);
        const scaledValues = valueList.map((val: string) => {
          const match = val.match(/([\d.]+)(px|em|rem)?/i);
          if (match) {
            return scaleValue(match[1], match[2] || 'px');
          }
          return val;
        });
        return `padding: ${scaledValues.join(' ')}`;
      });
    }
    
    return `${selector}{${processedDeclarations}}`;
  });
  
  // Rejoin all processed blocks
  return processedBlocks.join('');
}

/**
 * Generates a complete HTML document with styles for PDF generation
 */
function createPDFHTML(content: string, templateId: TemplateId = 'professional-blue', scaleFactor?: number): string {
  let stylesheet = createPDFStylesheet(templateId);
  
  // Apply font, line-height, and spacing scaling if scale factor is provided
  if (scaleFactor && scaleFactor < 1) {
    stylesheet = scaleFontSizes(stylesheet, scaleFactor);
    stylesheet = scaleLineHeight(stylesheet, scaleFactor);
    stylesheet = scaleMarginsAndPaddings(stylesheet, scaleFactor);
  }
  
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
 * Automatically scales fonts, line-heights, margins, and paddings for all templates if content exceeds one page
 */
export async function generatePDFWithPuppeteer(
  options: PDFGenerationOptions
): Promise<Buffer> {
  const { content, templateId = 'professional-blue' } = options;
  
  if (!content) {
    throw new Error('No content provided for PDF generation');
  }

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

    // A4 page dimensions: 210mm x 297mm
    // For accurate measurement, we'll use the actual rendered height
    const A4_HEIGHT_MM = 297;
    
    let scaleFactor: number | undefined = undefined;
    let html: string;

    // For all templates, measure content and scale if needed
    // First, create HTML without scaling to measure
    html = createPDFHTML(content, templateId);
    
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000,
    });

    // Wait for CSS to apply
    await new Promise(resolve => setTimeout(resolve, 500));

    // Measure the actual content height in pixels
    // We'll compare this to an estimated A4 height in the same rendering context
    const measurement = await page.evaluate(() => {
      const container = document.querySelector('.resume-container') as HTMLElement;
      if (!container) return { height: 0, scrollHeight: 0 };
      
      // Get both the visible height and scroll height
      // scrollHeight includes all content including padding
      return {
        height: container.getBoundingClientRect().height,
        scrollHeight: container.scrollHeight,
      };
    });

    // Estimate A4 height in pixels at the current viewport scale
    // A4 is 297mm, and at 96 DPI: 1mm = 3.779527559px
    // But we need to account for the actual rendering context
    // With viewport width 1200px and deviceScaleFactor 2, we're rendering at higher resolution
    // For PDF generation, Puppeteer uses 96 DPI, so: 297mm * 3.779527559 = ~1122px
    // However, we should use the actual rendered dimensions
    const A4_HEIGHT_PX = A4_HEIGHT_MM * 3.779527559; // ~1122px at 96 DPI
    
    // Use scrollHeight as it includes all content, not just visible
    const contentHeight = measurement.scrollHeight || measurement.height;
    console.log('contentHeight', contentHeight);
    
    // If content exceeds one page, calculate scale factor
    if (contentHeight > A4_HEIGHT_PX) {
      // Calculate scale factor with a small buffer (95% of available space)
      // scaleFactor = (A4_HEIGHT_PX * 0.95) / contentHeight;
      scaleFactor = A4_HEIGHT_PX / contentHeight;
      console.log('calculated scaleFactor', scaleFactor);
      
      // Clamp scale factor between 0.85 and 0.95 to maintain readability
      scaleFactor = Math.max(0.85, Math.min(0.95, scaleFactor));
      console.log('clamped scaleFactor', scaleFactor);
      
      console.log(`${templateId} template: Content height ${contentHeight.toFixed(1)}px exceeds A4 (${A4_HEIGHT_PX.toFixed(1)}px). Applying scale factor: ${scaleFactor.toFixed(3)}`);
      
      // Regenerate HTML with scaled fonts
      html = createPDFHTML(content, templateId, scaleFactor);
      
      // Reload page with scaled content
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 30000,
      });
      
      // Wait for CSS to apply again
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(`${templateId} template: Content height ${contentHeight.toFixed(1)}px fits within A4 (${A4_HEIGHT_PX.toFixed(1)}px). No scaling needed.`);
    }

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
