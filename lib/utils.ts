import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a simple preview HTML from form data
 * 
 * Note: This function generates HTML with standard resume classes (resume-container, resume-header, etc.)
 * - Before template selection: Adds simple-preview CSS classes for basic styling
 * - After template selection: Removes simple-preview classes so template-specific CSS can be applied
 * 
 * Template-specific formatting is applied in the Result component via displayClassName wrapper
 */
export function generateSimplePreview(formData: any, currentStep?: number): string {
  // Use simple formatting if we're before template step AND no template is selected
  const isBeforeTemplate = (currentStep ? currentStep < 7 : true) && !formData.template;
  
  // Build contact info
  const contactItems: string[] = [];
  if (formData.email) {
    contactItems.push(`<a href="mailto:${formData.email}">${formData.email}</a>`);
  }
  if (formData.phone) {
    contactItems.push(formData.phone);
  }
  if (formData.location) {
    contactItems.push(formData.location);
  }
  if (formData.portfolioLink) {
    contactItems.push(`<a href="${formData.portfolioLink}" target="_blank">${formData.portfolioLink}</a>`);
  }

  // Simple formatting classes (before template step)
  // Only use simple classes if we're before template step AND no template is selected
  const containerClass = isBeforeTemplate ? 'simple-preview' : '';
  const headerClass = isBeforeTemplate ? 'simple-header' : '';
  const sectionClass = isBeforeTemplate ? 'simple-section' : '';
  const titleClass = isBeforeTemplate ? 'simple-title' : '';
  const contentClass = isBeforeTemplate ? 'simple-content' : '';

  let html = `<div class="resume-container ${containerClass}">`;
  
  // Header
  if (formData.name || contactItems.length > 0) {
    html += `<header class="resume-header ${headerClass} scan-dim">`;
    if (formData.name) {
      html += `<h1 class="name ${titleClass}">${escapeHtml(formData.name)}</h1>`;
    }
    if (contactItems.length > 0) {
      html += `<div class="contact-info ${contentClass}">${contactItems.join(' | ')}</div>`;
    }
    html += `</header>`;
  }

  // Summary (show if we have a generated summary OR if we're on step 7 or later)
  const shouldShowSummary = formData.summary || (currentStep ? currentStep >= 7 : true);
  if (formData.job && shouldShowSummary) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass} scan-dim">Summary</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    if (formData.summary) {
      html += `<p data-line><span class="scan-dim">${escapeHtml(formData.summary)}</span></p>`;
    } else {
      html += `<p data-line><span class="scan-dim">Professional summary will be generated based on your experience and target job.</span></p>`;
    }
    html += `</div></section>`;
  }

  // Experience
  if (formData.experiences && formData.experiences.length > 0) {
    const validExperiences = formData.experiences.filter((exp: any) => exp.role?.trim() || exp.company?.trim() || exp.description?.trim())
    
    if (validExperiences.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass} scan-dim">Work Experience</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validExperiences.forEach((exp: any, index: number) => {
        const place = index === 0 ? 'current' : index === 1 ? 'previous' : 'later'
        html += `<div class="job-entry">`;
        html += experienceHeading(exp, place);
        if (exp.description) {
          html += formatTextContent(exp.description, {
            brightCount: place === 'current' ? 2 : 0,
            dimRemainder: place !== 'current',
          });
        }
        html += `</div>`;
      });
      
      html += `</div></section>`;
    }
  } else if (formData.experience) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass} scan-dim">Work Experience</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.experience, { dimRemainder: true });
    html += `</div></section>`;
  }

  // Portfolio (if provided)
  if (formData.portfolioProjects && formData.portfolioProjects.length > 0) {
    const validProjects = formData.portfolioProjects.filter((project: any) => project.name?.trim() || project.outcome?.trim())
    
    if (validProjects.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass} scan-dim">Portfolio / Projects</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validProjects.forEach((project: any) => {
        if (project.name || project.toolsSkills || project.outcome) {
          const parts = []
          if (project.name && project.toolsSkills) {
            parts.push(`${escapeHtml(project.name)} — ${escapeHtml(project.toolsSkills)}`)
          } else if (project.name) {
            parts.push(escapeHtml(project.name))
          } else if (project.toolsSkills) {
            parts.push(escapeHtml(project.toolsSkills))
          }
          if (project.outcome) {
            parts.push(`→ ${escapeHtml(project.outcome)}`)
          }
          html += `<p data-line><span class="scan-dim">${parts.join('<br>')}</span></p>`;
        }
      });
      
      html += `</div></section>`;
    }
  } else if (formData.portfolio) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass} scan-dim">Portfolio / Projects</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.portfolio, { dimRemainder: true });
    html += `</div></section>`;
  }

  // Skills
  if (formData.skills) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass} scan-dim">Skills</h2>`;
    html += `<div class="section-content ${contentClass}" data-scan="skills">`;
    // Format skills as a list
    const skillsList = formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (skillsList.length > 0) {
      html += `<ul class="skills-list" data-line>`;
      skillsList.forEach((skill: string) => {
        html += `<li>${escapeHtml(skill)}</li> `;
      });
      html += `</ul>`;
    } else {
      html += formatTextContent(formData.skills);
    }
    html += `</div></section>`;
  }

  // Education
  if (formData.educationEntries && formData.educationEntries.length > 0) {
    const validEntries = formData.educationEntries.filter((entry: any) => entry.degree?.trim() || entry.school?.trim())
    
    if (validEntries.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass} scan-dim">Education</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validEntries.forEach((entry: any) => {
        html += `<div class="education-entry">`;
        if (entry.degree) {
          html += `<h3 class="degree-title" data-line><span class="scan-dim">${escapeHtml(entry.degree)}</span></h3>`;
        }
        if (entry.school || entry.dates) {
          const schoolParts = []
          if (entry.school) schoolParts.push(escapeHtml(entry.school))
          if (entry.dates) schoolParts.push(escapeHtml(entry.dates))
          html += `<p class="school-info" data-line><span class="scan-dim">${schoolParts.join(' — ')}</span></p>`;
        }
        if (entry.gpa) {
          html += `<p data-line><span class="scan-dim">GPA: ${escapeHtml(entry.gpa)}</span></p>`;
        }
        if (entry.coursework) {
          html += `<p data-line><span class="scan-dim">Relevant Coursework: ${escapeHtml(entry.coursework)}</span></p>`;
        }
        html += `</div>`;
      });
      
      html += `</div></section>`;
    }
  } else if (formData.education) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass} scan-dim">Education</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.education, { dimRemainder: true });
    html += `</div></section>`;
  }

  // Certifications (separate section)
  if (formData.certifications && formData.certifications.length > 0) {
    const validCerts = formData.certifications.filter((cert: any) => cert.name?.trim())
    
    if (validCerts.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass} scan-dim">Certifications</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validCerts.forEach((cert: any) => {
        if (cert.name && cert.dates) {
          html += `<p data-line><span class="scan-dim">${escapeHtml(cert.name)} (${escapeHtml(cert.dates)})</span></p>`;
        } else if (cert.name) {
          html += `<p data-line><span class="scan-dim">${escapeHtml(cert.name)}</span></p>`;
        }
      });
      
      html += `</div></section>`;
    }
  }

  html += `</div>`;
  return html;
}

function escapeHtml(text: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use string replacement
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } else {
    // Client-side: use DOM
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

type ExperienceHeading = { role?: string; company?: string; dates?: string }
type ExperiencePlace = 'current' | 'previous' | 'later'

function experienceHeading(exp: ExperienceHeading, place: ExperiencePlace): string {
  const role = exp.role?.trim() || ''
  const company = exp.company?.trim() || ''
  const dates = exp.dates?.trim() || ''

  if (place === 'later') {
    const parts: string[] = []
    if (role && company) parts.push(`${escapeHtml(role)} at ${escapeHtml(company)}`)
    else if (role) parts.push(escapeHtml(role))
    else if (company) parts.push(escapeHtml(company))
    if (dates) parts.push(`(${escapeHtml(dates)})`)
    const header = parts.join(' ') || 'Experience'
    return `<h3 class="job-title" data-line><span class="scan-dim">${header}</span></h3>`
  }

  const bits: string[] = []
  if (role) {
    bits.push(place === 'current'
      ? `<span data-scan="role" data-line>${escapeHtml(role)}</span>`
      : `<span data-line><span class="scan-dim">${escapeHtml(role)}</span></span>`)
  }
  if (company) {
    if (role) bits.push(place === 'previous' ? '<span class="scan-dim"> at </span>' : ' at ')
    const scan = place === 'previous' ? 'previous-company' : 'company'
    bits.push(`<span data-scan="${scan}" data-line>${escapeHtml(company)}</span>`)
  }
  if (dates) {
    const spacer = bits.length ? ' ' : ''
    bits.push(`${spacer}<span data-scan="dates" data-line>(${escapeHtml(dates)})</span>`)
  }
  const header = bits.join('')
  if (!header) return `<h3 class="job-title" data-line><span class="scan-dim">Experience</span></h3>`
  return `<h3 class="job-title">${header}</h3>`
}

function formatTextContent(text: string, options?: { brightCount?: number; dimRemainder?: boolean }): string {
  if (!text) return '';

  const brightCount = options?.brightCount ?? 0
  const dimRemainder = options?.dimRemainder ?? false
  const formatted = escapeHtml(text).replace(/\n/g, '<br>')
  const lines = formatted.split('<br>')
  let inList = false
  let result = ''
  let usedBright = 0

  const markup = (content: string) => {
    const isBright = usedBright < brightCount
    usedBright += 1
    const dim = !isBright && (dimRemainder || brightCount > 0)
    const attrs = ['data-line']
    if (isBright) attrs.push('data-scan="bullet"')
    const inner = dim ? `<span class="scan-dim">${content}</span>` : content
    return `<li ${attrs.join(' ')}>${inner}</li>`
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      if (!inList) {
        result += '<ul class="simple-list">'
        inList = true
      }
      const content = trimmed.substring(1).trim()
      result += content ? markup(content) : '<li></li>'
      return
    }
    if (inList) {
      result += '</ul>'
      inList = false
    }
    if (trimmed) {
      const isBright = usedBright < brightCount
      usedBright += 1
      const dim = !isBright && (dimRemainder || brightCount > 0)
      const attrs = ['data-line']
      if (isBright) attrs.push('data-scan="bullet"')
      const inner = dim ? `<span class="scan-dim">• ${line}</span>` : `• ${line}`
      result += `<p ${attrs.join(' ')}>${inner}</p>`
    } else {
      result += '<p></p>'
    }
  })

  if (inList) result += '</ul>'
  return result || formatted
}
