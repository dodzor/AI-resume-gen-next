/**
 * PDF stylesheet for resume generation
 * This ensures consistent styling for PDF output
 */

export function createPDFStylesheet(): string {
  return `
    <style>
      /* Reset and base styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
        transform: none !important;
        transition: none !important;
        animation: none !important;
      }
      
      .resume-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background: white;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
      }
      
      /* Header styles */
      .resume-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 20px;
      }
      
      .name {
        font-size: 32px;
        font-weight: 700;
        color: #1f2937;
        margin-bottom: 8px;
      }
      
      .contact-info {
        font-size: 16px;
        color: #6b7280;
      }
      
      /* Section styles */
      .resume-section {
        margin-bottom: 25px;
      }
      
      .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
      }
      
      .section-content {
        margin-left: 0;
      }
      
      /* Work experience styles */
      .job-entry {
        margin-bottom: 16px;
      }
      
      .job-title {
        font-size: 16px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 6px;
      }
      
      /* Skills styles */
      .skills-list {
        list-style-type: disc;
        margin-left: 20px;
      }
      
      .skills-list li {
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      /* Education styles */
      .education-entry {
        margin-bottom: 12px;
      }
      
      .degree-title {
        font-size: 16px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 4px;
      }
      
      .school-info {
        font-size: 14px;
        color: #6b7280;
        margin-bottom: 6px;
      }
      
      /* General text styles */
      p {
        font-size: 14px;
        margin-bottom: 8px;
        color: #374151;
        line-height: 1.5;
      }
    </style>
  `;
}

