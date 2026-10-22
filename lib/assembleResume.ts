function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export type AssembleInput = {
  name: string
  email: string
  phone?: string
  location?: string
  portfolioLink?: string
  summary?: string
  experiences: Array<{ role: string; company: string; dates: string; bullets: string[] }>
  skills: string[]
  education: Array<{ degree: string; school: string; dates: string; detail?: string }>
  portfolio?: Array<{ name: string; detail: string }>
}

/**
 * One column, plain type, no icons or graphics.
 * Bullets are inserted as given. This function does not create any.
 */
export function assembleOnePageResume(input: AssembleInput): string {
  const contact = [input.email, input.phone, input.location, input.portfolioLink]
    .map((item) => item?.trim())
    .filter(Boolean) as string[]

  const experienceHtml = input.experiences
    .filter((job) => job.role || job.company || job.bullets.length > 0)
    .map((job) => {
      const title = [job.role, job.company].filter(Boolean).join(', ')
      const heading = job.dates ? `${title} (${job.dates})` : title
      const bullets = job.bullets.filter((bullet) => bullet.trim())
      const list = bullets.length
        ? `<ul class="simple-list">${bullets.map((bullet) => `<li>${escapeHtml(bullet.trim())}</li>`).join('')}</ul>`
        : ''
      return `<div class="job-entry"><h3 class="job-title">${escapeHtml(heading)}</h3>${list}</div>`
    })
    .join('')

  const skillsHtml = input.skills.filter((skill) => skill.trim()).map((skill) => `<li>${escapeHtml(skill.trim())}</li>`).join('')
  const educationHtml = input.education
    .filter((item) => item.degree || item.school)
    .map((item) => {
      const school = [item.school, item.dates ? `(${item.dates})` : ''].filter(Boolean).join(' ')
      const detail = item.detail?.trim() ? `<p>${escapeHtml(item.detail.trim())}</p>` : ''
      return `<div class="education-entry"><h3 class="degree-title">${escapeHtml(item.degree)}</h3><p class="school-info">${escapeHtml(school)}</p>${detail}</div>`
    })
    .join('')

  const portfolioHtml = (input.portfolio || [])
    .filter((item) => item.name || item.detail)
    .map((item) => `<div class="portfolio-entry"><h3 class="project-title">${escapeHtml(item.name)}</h3><p>${escapeHtml(item.detail)}</p></div>`)
    .join('')

  return `<div class="resume-container">
  <header class="resume-header">
    <h1 class="name">${escapeHtml(input.name)}</h1>
    <div class="contact-info">${contact.map(escapeHtml).join(' | ')}</div>
  </header>
  ${input.summary?.trim() ? `<section class="resume-section"><h2 class="section-title" id="summary">Summary</h2><div class="section-content"><p>${escapeHtml(input.summary.trim())}</p></div></section>` : ''}
  <section class="resume-section">
    <h2 class="section-title">Work Experience</h2>
    <div class="section-content">${experienceHtml}</div>
  </section>
  ${portfolioHtml ? `<section class="resume-section"><h2 class="section-title">Portfolio / Projects</h2><div class="section-content">${portfolioHtml}</div></section>` : ''}
  <section class="resume-section">
    <h2 class="section-title">Skills</h2>
    <div class="section-content"><ul class="skills-list">${skillsHtml}</ul></div>
  </section>
  <section class="resume-section">
    <h2 class="section-title">Education</h2>
    <div class="section-content">${educationHtml}</div>
  </section>
</div>`
}
