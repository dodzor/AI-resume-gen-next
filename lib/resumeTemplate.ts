/**
 * Enhanced prompt for OpenAI that includes the template structure
 */
export function createResumePrompt(formData: {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience: string;
  education: string;
  skills: string;
  portfolio?: string;
  portfolioLink?: string;
  job: string;
}) {
  // Build contact info items
  const contactItems = [formData.email];
  if (formData.phone?.trim()) contactItems.push(formData.phone.trim());
  if (formData.location?.trim()) contactItems.push(formData.location.trim());
  if (formData.portfolioLink?.trim()) contactItems.push(formData.portfolioLink.trim());
  
  const contactInfoExample = contactItems.length > 1 
    ? `[Email] | [Phone if provided] | [Location if provided] | [Portfolio Link if provided]`
    : `[Email]`;

  // Build portfolio section only if portfolio data is provided
  const portfolioSection = formData.portfolio?.trim() ? `
  <section class="resume-section">
    <h2 class="section-title">Portfolio / Projects</h2>
    <div class="section-content">
      <div class="portfolio-entry">
        <h3 class="project-title">[Project Name] ([Year])</h3>
        <p>[Project description and technologies used]</p>
        <p class="project-links">[Links if available]</p>
      </div>
      <!-- Repeat for each project -->
    </div>
  </section>` : '';

  const portfolioInstructions = formData.portfolio?.trim() 
    ? `- Portfolio/Projects: ${formData.portfolio}` 
    : '';

  const portfolioClasses = formData.portfolio?.trim()
    ? ', portfolio-entry, project-title, project-links'
    : '';

  // Build contact info data for the prompt
  const contactData = [
    `- Email: ${formData.email}`,
    formData.phone?.trim() ? `- Phone: ${formData.phone}` : '',
    formData.location?.trim() ? `- Location: ${formData.location}` : '',
    formData.portfolioLink?.trim() ? `- Portfolio Link: ${formData.portfolioLink}` : ''
  ].filter(Boolean).join('\n');

  return `Generate a professional resume using ONLY the following simple HTML structure. Do not add any CSS styles, classes beyond what's specified, or complex formatting. Use only basic HTML tags (h1, h2, h3, p, ul, li, strong, div, a).

REQUIRED STRUCTURE:
<div class="resume-container">
  <header class="resume-header">
    <h1 class="name">[Full Name]</h1>
    <div class="contact-info">${contactInfoExample}</div>
  </header>

  <section class="resume-section">
    <h2 class="section-title" id="summary">Summary</h2>
    <div class="section-content">
      <p>[Professional summary paragraph]</p>
    </div>
  </section>

  <section class="resume-section">
    <h2 class="section-title">Work Experience</h2>
    <div class="section-content">
      <div class="job-entry">
        <h3 class="job-title">[Job Title], [Company] ([Years])</h3>
        <ul class="simple-list">
          <li>[Achievement or responsibility 1]</li>
          <li>[Achievement or responsibility 2]</li>
          <li>[Achievement or responsibility 3]</li>
        </ul>
      </div>
      <!-- Repeat for each job -->
    </div>
  </section>
${portfolioSection}
  <section class="resume-section">
    <h2 class="section-title">Skills</h2>
    <div class="section-content">
      <ul class="skills-list">
        <li>[Skill 1]</li>
        <li>[Skill 2]</li>
        <!-- etc -->
      </ul>
    </div>
  </section>

  <section class="resume-section">
    <h2 class="section-title">Education</h2>
    <div class="section-content">
      <div class="education-entry">
        <h3 class="degree-title">[Degree]</h3>
        <p class="school-info">[School] ([Years])</p>
        <p>[Additional details if relevant]</p>
      </div>
    </div>
  </section>
</div>

IMPORTANT RULES:
1. Use ONLY the classes specified above (resume-container, resume-header, name, contact-info, resume-section, section-title, section-content, job-entry, job-title, simple-list, skills-list, education-entry, degree-title, school-info${portfolioClasses})
2. Do NOT add any inline styles or additional CSS classes
3. Do NOT use complex HTML elements (tables, divs with complex nesting, etc.)
4. Keep the structure simple and flat
5. Use semantic HTML tags (h1, h2, h3, p, ul, li, strong, a)
6. In contact-info: separate items with " | " (pipe with spaces). IMPORTANT: Wrap email in <a href="mailto:email"> and wrap portfolio link in <a href="url">. Only include items that are provided.
7. For Work Experience: ALWAYS format job descriptions as bullet points using <ul class="simple-list"> with <li> items. Each bullet point should be a separate achievement or responsibility. Do NOT use <p> tags for job descriptions.
${formData.portfolio?.trim() ? '8. Include the Portfolio/Projects section between Work Experience and Skills' : '8. Do NOT include a Portfolio section if no portfolio data is provided'}

Generate a resume for:
- Name: ${formData.name}
${contactData}
- Target Job: ${formData.job}
- Experience: ${formData.experience}
${portfolioInstructions}
- Education: ${formData.education}
- Skills: ${formData.skills}

Return ONLY the HTML structure above, filled with the appropriate content. Do not include any explanations, notes, or markdown formatting.`;
}

