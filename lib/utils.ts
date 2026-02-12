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
    html += `<header class="resume-header ${headerClass}">`;
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
    html += `<h2 class="section-title ${titleClass}">Summary</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    if (formData.summary) {
      html += `<p>${escapeHtml(formData.summary)}</p>`;
    } else {
      html += `<p>Professional summary will be generated based on your experience and target job.</p>`;
    }
    html += `</div></section>`;
  }

  // Experience
  if (formData.experiences && formData.experiences.length > 0) {
    const validExperiences = formData.experiences.filter((exp: any) => exp.role?.trim() || exp.company?.trim() || exp.description?.trim())
    
    if (validExperiences.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass}">Work Experience</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validExperiences.forEach((exp: any) => {
        const parts = []
        if (exp.role && exp.company) {
          parts.push(`${escapeHtml(exp.role)} at ${escapeHtml(exp.company)}`)
        } else if (exp.role) {
          parts.push(escapeHtml(exp.role))
        } else if (exp.company) {
          parts.push(escapeHtml(exp.company))
        }
        if (exp.dates) {
          parts.push(`(${escapeHtml(exp.dates)})`)
        }
        const header = parts.length > 0 ? parts.join(' ') : 'Experience'
        html += `<div class="job-entry">`;
        html += `<h3 class="job-title">${header}</h3>`;
        if (exp.description) {
          html += formatTextContent(exp.description);
        }
        html += `</div>`;
      });
      
      html += `</div></section>`;
    }
  } else if (formData.experience) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass}">Work Experience</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.experience);
    html += `</div></section>`;
  }

  // Portfolio (if provided)
  if (formData.portfolioProjects && formData.portfolioProjects.length > 0) {
    const validProjects = formData.portfolioProjects.filter((project: any) => project.name?.trim() || project.outcome?.trim())
    
    if (validProjects.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass}">Portfolio / Projects</h2>`;
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
          html += `<p>${parts.join('<br>')}</p>`;
        }
      });
      
      html += `</div></section>`;
    }
  } else if (formData.portfolio) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass}">Portfolio / Projects</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.portfolio);
    html += `</div></section>`;
  }

  // Skills
  if (formData.skills) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass}">Skills</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    // Format skills as a list
    const skillsList = formData.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (skillsList.length > 0) {
      html += `<ul class="skills-list">`;
      skillsList.forEach((skill: string) => {
        html += `<li>${escapeHtml(skill)}</li>`;
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
      html += `<h2 class="section-title ${titleClass}">Education</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validEntries.forEach((entry: any) => {
        html += `<div class="education-entry">`;
        if (entry.degree) {
          html += `<h3 class="degree-title">${escapeHtml(entry.degree)}</h3>`;
        }
        if (entry.school || entry.dates) {
          const schoolParts = []
          if (entry.school) schoolParts.push(escapeHtml(entry.school))
          if (entry.dates) schoolParts.push(escapeHtml(entry.dates))
          html += `<p class="school-info">${schoolParts.join(' — ')}</p>`;
        }
        if (entry.gpa) {
          html += `<p>GPA: ${escapeHtml(entry.gpa)}</p>`;
        }
        if (entry.coursework) {
          html += `<p>Relevant Coursework: ${escapeHtml(entry.coursework)}</p>`;
        }
        html += `</div>`;
      });
      
      html += `</div></section>`;
    }
  } else if (formData.education) {
    html += `<section class="resume-section ${sectionClass}">`;
    html += `<h2 class="section-title ${titleClass}">Education</h2>`;
    html += `<div class="section-content ${contentClass}">`;
    html += formatTextContent(formData.education);
    html += `</div></section>`;
  }

  // Certifications (separate section)
  if (formData.certifications && formData.certifications.length > 0) {
    const validCerts = formData.certifications.filter((cert: any) => cert.name?.trim())
    
    if (validCerts.length > 0) {
      html += `<section class="resume-section ${sectionClass}">`;
      html += `<h2 class="section-title ${titleClass}">Certifications</h2>`;
      html += `<div class="section-content ${contentClass}">`;
      
      validCerts.forEach((cert: any) => {
        if (cert.name && cert.dates) {
          html += `<p>${escapeHtml(cert.name)} (${escapeHtml(cert.dates)})</p>`;
        } else if (cert.name) {
          html += `<p>${escapeHtml(cert.name)}</p>`;
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

function formatTextContent(text: string): string {
  if (!text) return '';
  
  // Convert newlines to <br> and preserve bullet points
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Convert bullet points (• or -) to proper list items if they appear at line start
  const lines = formatted.split('<br>');
  let inList = false;
  let result = '';
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      if (!inList) {
        result += '<ul class="simple-list">';
        inList = true;
      }
      const content = trimmed.substring(1).trim();
      result += `<li>${content}</li>`;
    } else {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      if (trimmed) {
        result += `<p>• ${line}</p>`;
      } else {
        // Empty lines should be formatted as <p> tags inside div.job-entry
        result += '<p></p>';
      }
    }
  });
  
  if (inList) {
    result += '</ul>';
  }
  
  return result || formatted;
}
