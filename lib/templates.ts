/**
 * Resume Template System
 * Provides multiple templates with shared styles between browser display and PDF
 */

export type TemplateId = 'professional-blue' | 'modern-minimal' | 'creative-designer' | 'developer';

export interface ResumeTemplate {
  id: TemplateId;
  name: string;
  description: string;
  preview: string; // CSS class for preview styling
}

export const TEMPLATES: ResumeTemplate[] = [
  {
    id: 'professional-blue',
    name: 'Professional Blue',
    description: 'Classic professional style with blue accents and centered header',
    preview: 'template-professional-blue'
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, minimalist design with elegant typography and subtle borders',
    preview: 'template-modern-minimal'
  },
  {
    id: 'creative-designer',
    name: 'Creative Designer',
    description: 'Vibrant yet intentional design for UI/UX, Graphic & Product designers',
    preview: 'template-creative-designer'
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Clean, structured, ATS-friendly — optimized for engineers and developers',
    preview: 'template-developer'
  }
];

/**
 * Get PDF stylesheet for a specific template
 */
export function createPDFStylesheet(templateId: TemplateId = 'professional-blue'): string {
  const baseStyles = `
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
  `;

  if (templateId === 'professional-blue') {
    return `${baseStyles}
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
      
      .contact-info a {
        color: #3b82f6;
        text-decoration: none;
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
      
      /* Portfolio styles */
      .portfolio-entry {
        margin-bottom: 16px;
      }
      
      .project-title {
        font-size: 16px;
        font-weight: 600;
        color: #4b5563;
        margin-bottom: 6px;
      }
      
      .project-links {
        font-size: 13px;
        color: #3b82f6;
        margin-top: 4px;
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

  if (templateId === 'developer') {
    return `${baseStyles}
      .resume-container {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        line-height: 1.5;
        color: #111111;
        background: white;
        max-width: 800px;
        margin: 0 auto;
        padding: 36px 40px;
        font-size: 13px;
      }
      
      /* Header styles - simple and scannable */
      .resume-header {
        text-align: left;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #111111;
      }
      
      .name {
        font-size: 28px;
        font-weight: 700;
        color: #111111;
        margin-bottom: 6px;
        letter-spacing: -0.3px;
      }
      
      .contact-info {
        font-size: 13px;
        color: #444444;
        font-family: "SF Mono", "Roboto Mono", Consolas, monospace;
      }
      
      .contact-info a {
        color: #111111;
        text-decoration: underline;
        font-weight: 500;
      }
      
      /* Section styles - clear hierarchy */
      .resume-section {
        margin-bottom: 20px;
      }
      
      .section-title {
        font-size: 13px;
        font-weight: 700;
        color: #111111;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding-bottom: 4px;
        border-bottom: 1px solid #dddddd;
      }
      
      .section-content {
        margin-left: 0;
        padding-left: 0;
      }
      
      /* Work experience styles - dense but organized */
      .job-entry {
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .job-entry:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .job-title {
        font-size: 14px;
        font-weight: 600;
        color: #111111;
        margin-bottom: 4px;
      }
      
      /* Skills styles - inline, comma-separated for ATS */
      .skills-list {
        list-style-type: none;
        margin-left: 0;
        padding-left: 0;
      }
      
      .skills-list li {
        display: inline;
        font-size: 13px;
        color: #333333;
      }
      
      .skills-list li::after {
        content: " · ";
        color: #999999;
      }
      
      .skills-list li:last-child::after {
        content: "";
      }
      
      /* Education styles */
      .education-entry {
        margin-bottom: 10px;
      }
      
      .degree-title {
        font-size: 14px;
        font-weight: 600;
        color: #111111;
        margin-bottom: 2px;
      }
      
      .school-info {
        font-size: 13px;
        color: #555555;
        margin-bottom: 4px;
      }
      
      /* Portfolio/Projects styles - prominent for devs */
      .portfolio-entry {
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .portfolio-entry:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .project-title {
        font-size: 14px;
        font-weight: 600;
        color: #111111;
        margin-bottom: 4px;
      }
      
      .project-links {
        font-size: 12px;
        color: #111111;
        margin-top: 4px;
        font-family: "SF Mono", "Roboto Mono", Consolas, monospace;
      }
      
      .project-links a {
        text-decoration: underline;
      }
      
      /* General text styles */
      p {
        font-size: 13px;
        margin-bottom: 6px;
        color: #333333;
        line-height: 1.5;
      }
      
      /* Bullet points for impact */
      ul {
        margin-left: 16px;
        padding-left: 0;
      }
      
      li {
        margin-bottom: 3px;
        line-height: 1.45;
      }
    </style>
  `;
  }

  if (templateId === 'modern-minimal') {
    return `${baseStyles}
      .resume-container {
        font-family: "Georgia", "Times New Roman", serif;
        line-height: 1.7;
        color: #2d3748;
        background: white;
        max-width: 800px;
        margin: 0 auto;
        padding: 50px 40px;
      }
      
      /* Header styles */
      .resume-header {
        text-align: left;
        margin-bottom: 35px;
        padding-bottom: 25px;
        border-bottom: 1px solid #cbd5e0;
      }
      
      .name {
        font-size: 36px;
        font-weight: 400;
        color: #1a202c;
        margin-bottom: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      
      .contact-info {
        font-size: 14px;
        color: #718096;
        font-style: italic;
      }
      
      .contact-info a {
        color: #4299e1;
        text-decoration: none;
      }
      
      /* Section styles */
      .resume-section {
        margin-bottom: 28px;
      }
      
      .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #4a5568;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 2px;
        border-bottom: none;
        padding-bottom: 0;
      }
      
      .section-content {
        margin-left: 0;
        padding-left: 0;
      }
      
      /* Work experience styles */
      .job-entry {
        margin-bottom: 18px;
        padding-left: 15px;
        border-left: 2px solid #e2e8f0;
      }
      
      .job-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      /* Skills styles */
      .skills-list {
        list-style-type: none;
        margin-left: 0;
        padding-left: 0;
      }
      
      .skills-list li {
        display: inline-block;
        margin-right: 12px;
        margin-bottom: 8px;
        font-size: 13px;
        padding: 4px 12px;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 3px;
        color: #4a5568;
      }
      
      /* Education styles */
      .education-entry {
        margin-bottom: 14px;
        padding-left: 15px;
        border-left: 2px solid #e2e8f0;
      }
      
      .degree-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .school-info {
        font-size: 14px;
        color: #718096;
        margin-bottom: 6px;
        font-style: italic;
      }
      
      /* Portfolio styles */
      .portfolio-entry {
        margin-bottom: 18px;
        padding-left: 15px;
        border-left: 2px solid #e2e8f0;
      }
      
      .project-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      
      .project-links {
        font-size: 13px;
        color: #4299e1;
        margin-top: 4px;
        font-style: italic;
      }
      
      /* General text styles */
      p {
        font-size: 14px;
        margin-bottom: 8px;
        color: #4a5568;
        line-height: 1.7;
      }
    </style>
  `;
  }

  // Creative Designer template - vibrant yet intentional for UI/UX, Graphic & Product designers
  return `${baseStyles}
      .resume-container {
        font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
        line-height: 1.65;
        color: #1a1a2e;
        background: white;
        max-width: 800px;
        margin: 0 auto;
        padding: 28px 44px;
      }
      
      /* Header styles - asymmetric layout for visual interest */
      .resume-header {
        text-align: left;
        margin-bottom: 32px;
        padding-bottom: 36px;
        border-bottom: 3px solid #E85A4F;
        position: relative;
      }
      
      .name {
        font-size: 38px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 16px;
        letter-spacing: -0.5px;
        line-height: 1.1;
      }
      
      .contact-info {
        font-size: 13px;
        color: #5c5c6d;
        font-weight: 400;
        letter-spacing: 0.3px;
      }
      
      .contact-info a {
        color: #E85A4F;
        text-decoration: none;
        font-weight: 500;
      }
      
      /* Section styles */
      .resume-section {
        margin-bottom: 28px;
      }
      
      /* Only first section (Summary) gets margin-bottom */
      .resume-section:first-of-type .section-title {
        margin-bottom: 6px !important;
      }
      
      .section-title {
        font-size: 11px;
        font-weight: 700;
        color: #E85A4F;
        margin-bottom: 18px;
        text-transform: uppercase;
        letter-spacing: 2.5px;
        /* Avoid flexbox - html2canvas has rendering issues with it */
        display: block;
      }
      
      .section-content {
        margin-left: 0;
        padding-left: 0;
      }
      
      /* Work experience styles */
      .job-entry {
        margin-bottom: 20px;
        padding: 8px 16px 24px 16px;
        background: #fafafa;
        border-radius: 6px;
        border-left: 3px solid #E85A4F;
      }
      
      .job-title {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 8px;
        letter-spacing: -0.2px;
      }
      
      /* Skills styles - tag-like display */
      /* Avoid flexbox - html2canvas has rendering issues with it */
      .skills-list {
        list-style-type: none;
        margin-left: 0;
        padding-left: 0;
      }
      
      .skills-list li {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        padding: 0px 14px 8px 14px;
        margin-right: 8px;
        margin-bottom: 8px;
        background: #1a1a2e;
        color: white;
        border-radius: 20px;
        letter-spacing: 0.3px;
        vertical-align: top;
      }
      
      /* Education styles */
      .education-entry {
        margin-bottom: 16px;
        padding: 8px 16px 24px 16px;
        background: #fafafa;
        border-radius: 6px;
        border-left: 3px solid #4a4a5e;
      }
      
      .degree-title {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a2e;
        margin-bottom: 4px;
      }
      
      .school-info {
        font-size: 13px;
        color: #5c5c6d;
        margin-bottom: 6px;
        font-weight: 500;
      }
      
      /* Portfolio styles - emphasized for designers */
      .portfolio-entry {
        margin-bottom: 20px;
        padding: 18px;
        background: linear-gradient(135deg, #fff5f4 0%, #fafafa 100%);
        border-radius: 8px;
        border: 1px solid #f0e0de;
      }
      
      .project-title {
        font-size: 15px;
        font-weight: 700;
        color: #E85A4F;
        margin-bottom: 8px;
        letter-spacing: -0.2px;
      }
      
      .project-links {
        font-size: 12px;
        color: #E85A4F;
        margin-top: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* General text styles */
      p {
        font-size: 13px;
        margin-bottom: 8px;
        color: #3d3d4e;
        line-height: 1.65;
      }
    </style>
  `;
}

/**
 * Get the CSS class name for browser display
 */
export function getDisplayClassName(templateId: TemplateId = 'professional-blue'): string {
  return `resume-display-${templateId}`;
}

