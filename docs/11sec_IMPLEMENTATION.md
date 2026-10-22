PROMPT:
Modify the existing RoleMirror app (Next.js, Convex, Clerk, OpenAI) so it follows the “11-second argument” resume workflow. Do not rebuild auth, billing, discover, PDF export, or the Greenhouse catalog. Change how a resume is built, stored, and judged.

Product thesis
A resume is an 11-second argument that says one thing: “I have already solved the problem you are hiring me to solve.” Recruiters scan current role, previous company, dates, one or two bullets, and skills. An ATS is a searchable database, so the job is honest discoverability: use the employer’s words only when they truthfully name work the candidate did. The model is the interviewer, editor, strategist, and hostile reviewer. The user supplies every fact. The model never invents experience, metrics, tools, scope, or outcomes.

What already exists and must be reused
- Wizard in components/form.tsx: Target Job, Template, Personal Info, Experience, Education, Skills, Portfolio, Summary.
- AI routes: /api/analyze-job-description, /api/generate-summary, /api/rewrite-bullet, /api/improve-experience, /api/generate-resume. Prompts live in those routes and in lib/resumeTemplate.ts. They currently cast the model as a resume writer and allow impact language when metrics are missing.
- Convex resumes table (convex/schema.ts): one document per resume, scoped by userId, with experiences, education, skills, keywords, themes, generatedResume HTML.
- ResumeSwitcher, auto-save, and plan limits (free: 1 lifetime resume, pro: 10). A master record must not consume the tailored-resume quota.
- Keyword extraction, seniority/tone, themes, and recommendations from job analysis. Keep them. Change how they are applied.
- Free scanner at /free-resume-scanner and /api/scan/keyword-match. Keep keyword overlap as one signal. Add the human-scan review beside it.
- Templates in lib/templates.ts. Keep single-column professional templates. Stop recommending graphic or multi-column layouts for this workflow.

1. Master career record, then many tailored resumes
Add a per-user Master Resume that is never exported or sent. It is the career database: every role, project, promotion, tool, customer, problem, metric, and rescue, including messy notes. Tailored resumes are children of that master and of one target job.

Schema direction:
- A master document (or resume kind: "master" | "tailored") holding raw dump text, structured experiences, clarifying Q&A, and evidence the user confirmed.
- Tailored resumes keep the current resumes shape and gain masterResumeId, target job text, extracted requirements, gaps, and the hostile-review result.
- ResumeSwitcher shows the master separately from application resumes. “New application” copies relevant evidence from the master into a new tailored resume. It does not start from a blank AI draft.

Flow order:
1. Dump (unstructured, volume over format).
2. Model asks 5–7 clarifying questions. No drafting yet.
3. User answers. Repeat until the user stops.
4. Build or update the master from confirmed facts only.
5. User picks a job (pasted description, or a role from /discover).
6. Produce a one-page tailored resume in the employer’s language where that language is accurate.
7. Hostile-reader review, user fixes, review again.
8. Export the tailored resume only.

2. Dump before draft
On the master, the first action is a large free-text dump: jobs, projects, promotions, hard problems, tools, achievements, metrics, mistakes fixed, customers helped, deadlines rescued. No template and no bullet format required.

Then call a new interview route, or extend an existing one, with this behavior:
“Do not write a resume. Read everything shared. Ask 5–7 questions about missing numbers, vague achievements, unclear responsibilities, and places where stronger evidence might exist.”
Good questions look like: How many people did you manage? What happened after the launch? What improved because of your work? What budget did you own? How much money or time did you save? How much faster did the process become?
Save each question and answer on the master. Only answered, user-confirmed facts may later appear on a resume.

3. Never invent
Put this instruction on every resume-generation, summary, bullet, and experience route, and on the master-structuring step:
“Never invent metrics, responsibilities, achievements, scope, tools, or experience. If a number or fact would strengthen a line and the user has not provided it, insert [X] and ask for the real value. Leave [X] visible until the user replaces it.”
Delete any instruction that tells the model to imply impact, seniority, or results when the source text does not contain them. Temperature on these routes should favor fidelity over creativity.
A line that still contains [X] cannot be marked ready and should be visually flagged. The product rule, shown in the UI: if the user could not defend the sentence in an interview, it does not belong.

4. Duties become outcomes
Rewrite and improve actions use this shape only: strong action verb → what the person did → measurable outcome.
Each bullet must answer: what changed because this person was there?
Return, alongside the rewrite:
- the new line, with [X] where evidence is missing
- a flag when the source line is still a responsibility (“Responsible for…”, “Worked on…”, “Helped with…”)
- the user facts the line used
Do not add metrics to fill the pattern. Ask for them.
Summary lines follow the same evidence rule and state the 11-second claim in the employer’s language. Ban stock phrases in prompts and in a post-check: leveraged synergies, dynamic self-starter, results-oriented professional, spearheaded transformational initiatives, and the existing buzzword list. The line should sound like something the candidate would say out loud.

5. One master, many applications
Given one job description and the master:
- Extract the ten skills and requirements that most determine whether this person gets found and taken seriously.
- Build a one-page tailored resume that uses those terms only where the master already supports them. Reorder roles and bullets so the strongest matching evidence is what a scanner sees first: current or most relevant role, company, dates, one or two proof bullets, then skills.
- Return the requirements the master does not support, labeled as gaps. Gaps are interview prep, not text to fabricate.
Given three or four descriptions for the same target role (pasted, or selected from discover):
- Return skills and phrases that appear in all of them.
- Use that overlap for the headline, summary, and the first bullets of the tailored resume, still only when the master supports them.
Keyword coverage stays, but a missing keyword is a gap or a wording mismatch (“Sales Administration” vs “Revenue Operations”), not a prompt to insert the keyword.

6. Hostile reader
Add a review action on the tailored resume:
“Act like a hiring manager who has reviewed 10,000 resumes and wants a reason to reject this one. Say where you would stop reading, which bullets are generic, which phrases sound machine-written, and what weakens credibility. Do not be polite. Do not rewrite the resume in this pass.”
Show the result as annotations on the actual lines: stop-reading point, generic, AI voice, credibility. The user fixes those lines and can run the review again. Keep the last two or three reviews.
Add an 11-second preview that visually isolates only what the scan includes: current role, previous company, dates, the first one or two bullets, and skills. Everything else is dimmed. The preview updates as the user edits.

7. Formatting
Tailored output stays one page, one column, plain typography, no icons, skill bars, or graphics. Default the tailored path to the simplest existing template. The generate-resume prompt in lib/resumeTemplate.ts must assemble confirmed master evidence into that layout. It must not invent bullets to fill the template.

8. Scanner
On /free-resume-scanner, keep match, missing, and matched keywords. Add a short verdict in the same response: the 11-second claim the resume currently makes, where a recruiter would stop, which lines are duties rather than outcomes, and which phrases sound generated. The scanner still must not invent replacement bullets.

Constraints
- Preserve Clerk auth, Convex ownership checks, usage limits, and PDF export behavior.
- Do not count master creation against resumesCreated. Tailored resumes still count.
- Do not change the Greenhouse sync or /discover search, except to let a user send a discovered job description into the tailor step.
- Update docs/APP_FEATURES.md and docs/RESUME_FLOWS.md to describe master → interview → tailor → hostile review.
- Verify in the browser: dump and answer questions, confirm a fact with [X] cannot export as if it were real, tailor one resume from two different job descriptions without new invented facts, run the hostile review, and confirm the 11-second preview highlights only role, company, dates, first bullets, and skills.

Out of scope for this change
Cover letters, interview practice, and negotiation practice. Leave a single saved thread of master facts and Q&A so those can be added later without a second career dump.

RESULT:
A resume is now built from a private career record, then tailored per job. The model can arrange facts you already gave it. It cannot add any.

**Career record, then applications.** Each account has one master record: a free-text dump, 5–7 clarifying questions, and only the answers you confirm. It is never exported, and creating it does not use your resume allowance. **New application** copies that evidence into a tailored resume. The free plan is still 1 application and Pro is still 10.

**Nothing invented.** Summary, bullet, experience, structuring, and generate routes keep missing numbers as `[X]`. Copy and PDF export stop while `[X]` or a stock phrase is still on the page. A duty such as “Responsible for…” is flagged until it says what changed. Gaps from a job description are interview prep, not text to add.

**Tailor and hostile read.** One job, or up to four descriptions of the same role, produces a one-page resume in the employer’s words only where the career record supports them. The hostile review marks where a hiring manager would stop, plus generic lines, machine-written phrases, and credibility problems. It does not rewrite the resume. The last three reviews are kept. The 11-second preview leaves only the current role, previous company, dates, the first two bullets, and skills bright.

**Scanner and discover.** The free scanner still returns keyword match, and now also says what the resume claims, where a recruiter would stop, which lines are duties, and which phrases sound generated. It does not write replacement bullets. Discover search is unchanged. **Use for an application** sends that posting into the tailor step.

I checked this in the browser while signed out. Discover’s “Use for an application” opens the app with that job attached, and the scanner returns the 11-second verdict beside the keyword match. The signed-in path — dump, answer questions, block export on `[X]`, tailor two descriptions, run the hostile review, and watch the preview — needs your Clerk session. Sign in and that flow is on the career record.