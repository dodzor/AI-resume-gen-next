/**
 * Enhanced prompt for OpenAI that includes the template structure
 */
export function createResumePrompt(formData: {
  name: string;
  email: string;
  experience: string;
  education: string;
  skills: string;
  job: string;
}) {
  return `Generate a professional resume using ONLY the following simple HTML structure. Do not add any CSS styles, classes beyond what's specified, or complex formatting. Use only basic HTML tags (h1, h2, h3, p, ul, li, strong, div).

REQUIRED STRUCTURE:
<div class="resume-container">
  <header class="resume-header">
    <h1 class="name">[Full Name]</h1>
    <div class="contact-info">[Email]</div>
  </header>

  <section class="resume-section">
    <h2 class="section-title">Summary</h2>
    <div class="section-content">
      <p>[Professional summary paragraph]</p>
    </div>
  </section>

  <section class="resume-section">
    <h2 class="section-title">Work Experience</h2>
    <div class="section-content">
      <div class="job-entry">
        <h3 class="job-title">[Job Title], [Company] ([Years])</h3>
        <p>[Job description and achievements]</p>
      </div>
      <!-- Repeat for each job -->
    </div>
  </section>

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
1. Use ONLY the classes specified above (resume-container, resume-header, name, contact-info, resume-section, section-title, section-content, job-entry, job-title, skills-list, education-entry, degree-title, school-info)
2. Do NOT add any inline styles or additional CSS classes
3. Do NOT use complex HTML elements (tables, divs with complex nesting, etc.)
4. Keep the structure simple and flat
5. Use semantic HTML tags (h1, h2, h3, p, ul, li, strong)

Generate a resume for:
- Name: ${formData.name}
- Email: ${formData.email}
- Target Job: ${formData.job}
- Experience: ${formData.experience}
- Education: ${formData.education}
- Skills: ${formData.skills}

Return ONLY the HTML structure above, filled with the appropriate content. Do not include any explanations, notes, or markdown formatting.`;
}

