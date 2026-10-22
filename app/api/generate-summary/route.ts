import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { EVIDENCE_RULES, FIDELITY_TEMPERATURE, findBannedPhrases, scrubInventedClaims } from '@/lib/evidenceRules';

// Lazy-initialize OpenAI client to avoid build-time errors
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    // 2. Check usage limit BEFORE processing
    const usageCheck = await checkUsageLimit(userId, 'ai_rewrite');
    if (!usageCheck.allowed) {
      return usageCheck.error;
    }

    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Configuration Error',
          message: 'OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, email, experience, education, skills, job, existingSummary, modifyType, tone, themes, recommendations, thematicSummary } = body;

    // Validate required fields
    if (!job) {
      return NextResponse.json(
        { error: 'Missing required field: job description' },
        { status: 400 }
      );
    }

    // If modifying an existing summary, validate it exists
    if (modifyType && !existingSummary) {
      return NextResponse.json(
        { error: 'Missing required field: existing summary is required for modification' },
        { status: 400 }
      );
    }

    let prompt = '';
    let systemMessage = '';

    /**Senior Software Developer with over 7 years of experience in PHP and Laravel, specializing in building scalable backend systems. Successfully reduced latency by 30% for global streaming platforms and increased auction participation by 40% through advanced multilingual database architectures and real-time interactions. Demonstrates expertise in implementing message queues and optimizing infrastructure, 
     * enhancing system security and resilience for a 25% increase in user request handling capacity. Proficient in leveraging AWS services to drive feature adoption and informed product decisions. */

    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nTHEMES (ordering signals only): State a theme only when the candidate's facts already show it. Do not invent an example to cover a theme.\n${themes.map((t: string) => `- ${t}`).join('\n')}\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}`;
    }

    // Build seniority adjustment instructions based on tone
    let seniorityInstructions = '';
    if (tone) {
      seniorityInstructions = `SENIORITY SIGNAL: The posting reads as "${tone}". The summary may use that register only for facts the candidate already stated. Do not promote their title, scope, or years.`;
    }

    // Build position level text based on tone
    let positionLevelText = 'Position level (Senior / Lead / Backend Engineer)';
    if (tone === 'junior') {
      positionLevelText = 'Position level (Junior / Associate / Entry-level)';
    } else if (tone === 'senior') {
      positionLevelText = 'Position level (Senior / Lead / Principal / Staff)';
    } else if (tone === 'mid') {
      positionLevelText = 'Position level (Mid-level / Engineer)';
    }

    if (modifyType && existingSummary) {
      // Modification mode
      const modificationInstructions = {
        concise: 'Make the summary more concise and brief. Reduce it to 1-2 sentences (approximately 30-50 words) while keeping the most impactful information.',
        verbose: 'Make the summary more detailed and comprehensive. Expand it to 3-4 sentences (approximately 80-120 words) with more specific details about experience and achievements.',
        senior: 'If the source already shows senior scope, put that scope first. If it does not, leave [X] rather than promoting the candidate.'
      };

      systemMessage = `You are the editor. You do not invent experience. The summary states the 11-second claim in the employer's language only where the facts support it. ${EVIDENCE_RULES}`;
      
      prompt = `You are modifying an existing professional summary. ${modificationInstructions[modifyType as keyof typeof modificationInstructions]}

Current Summary:
${existingSummary}

${job ? `Target Job Description:\n${job}` : ''}
${experience ? `Work Experience:\n${experience}` : ''}
${education ? `Education:\n${education}` : ''}
${skills ? `Skills: ${skills}` : ''}

Requirements:
- Maintain professional tone and quality
- Keep it relevant to the target job
- Preserve key qualifications and achievements
- Use professional language
- Focus on concrete achievements and outcomes, not personality traits or vague abilities
- Directly referencing the company or role in the summary
- Use DIRECT POSITIONING: Write in a direct, confident style without first person ("I"), third person names ("John is..."), or alignment phrases ("Perfectly aligned with your role...")
- Examples to avoid: "I am a highly motivated developer...", "${name ? name : 'Candidate'} is a results-driven engineer...", "Perfectly aligned with your role..."
- Instead, use direct statements: "Full-stack developer with 5 years building scalable web applications..."

CRITICAL: Avoid ALL buzzwords and clichés. Never use these terms:

Personality Buzzwords (show outcomes instead):
- Dynamic, Passionate, Motivated, Hard-working, Dedicated, Results-driven, Detail-oriented, Fast learner, Self-starter, Proactive, Go-getter, Enthusiastic, Driven, Accomplished

Skill & Ability Clichés (state what you did and at what level):
- Adept at, Skilled in, Expertise in, Knowledgeable in, Familiar with, Proficient in, Experienced in (without context), Strong understanding of, proven track record

"Problem Solving" & Thinking Clichés (describe the problem solved and result):
- Problem solver, Critical thinker, Strategic thinker, Analytical mindset, Think outside the box, Innovative thinker

Team & Collaboration Clichés (mention who you worked with and what changed):
- Team player, Works well independently or in a team, Excellent communicator, Cross-functional collaboration, Stakeholder management

Leadership & Management Clichés (show scale: number of people, decisions, outcomes):
- Natural leader, People person, Hands-on manager, Visionary, Thought leader, Change agent

Tech-Specific Buzzwords (explain how it was optimized or scaled):
- Cutting-edge technology, Scalable solutions, Best practices, Robust architecture, High-performance systems, Optimized workflows

Marketing / Business Buzzwords (use plain language + metrics):
- Synergy, Value-added, Leveraged, Disruptive, End-to-end, Customer-centric, Go-to-market, KPI-driven

Soft Skills Without Proof (tie them to a concrete situation):
- Multitasker, Time management, Adaptable, Resilient, Stress-resistant

Phrases Recruiters Ignore (use better verbs instead):
- Responsible for, In charge of, Tasked with, Assisted with (without outcome), Worked on

Instead of buzzwords, use concrete language that shows what was accomplished, who was involved, what changed, and measurable outcomes.

${themesInstructions}${seniorityInstructions ? '\n\n' + seniorityInstructions : ''}

Return ONLY the modified summary text, without any markdown formatting, quotes, or additional explanations.`;
    } else {
      // Generation mode
      systemMessage = `You are the editor. You do not invent experience. State the 11-second claim — I have already solved the problem you are hiring me to solve — in the employer's language only where the facts support it. ${EVIDENCE_RULES}`;
      
      prompt = `You are a professional resume writer. Generate a compelling professional summary (2-3 sentences) for a resume 
    based on the following information. Do not include any other text or formatting in your response:

${name ? `Candidate Name: ${name}` : ''}
${experience ? `Work Experience:\n${experience}` : ''}
${education ? `Education:\n${education}` : ''}
${skills ? `Skills: ${skills}` : ''}
${job ? `Target Job Description:\n${job}` : ''}

Requirements:
- Write a professional summary that highlights the candidate's key qualifications and aligns with the target job
- Keep it concise (2-3 sentences, approximately 50-80 words)
- Focus on relevant experience, skills, and achievements with concrete examples
- Make it compelling and tailored to the target job description
- Use professional language that is specific and concrete
- Directly referencing the company or role in the summary
- Use DIRECT POSITIONING: Write in a direct, confident style without first person ("I"), third person names ("John is..."), or alignment phrases ("Perfectly aligned with your role...")
- Examples to avoid: "I am a highly motivated developer...", "${name ? name : 'Candidate'} is a results-driven engineer...", "Perfectly aligned with your role..."
- Instead, use direct statements: "Full-stack developer with 5 years building scalable web applications..."

CRITICAL: Avoid ALL buzzwords and clichés. Never use these terms:

Personality Buzzwords (show outcomes instead):
- Dynamic, Passionate, Motivated, Hard-working, Dedicated, Results-driven, Detail-oriented, Fast learner, Self-starter, Proactive, Go-getter, Enthusiastic, Driven

Skill & Ability Clichés (state what you did and at what level):
- Adept at, Skilled in, Expertise in, Knowledgeable in, Familiar with, Proficient in, Experienced in (without context), Strong understanding of

"Problem Solving" & Thinking Clichés (describe the problem solved and result):
- Problem solver, Critical thinker, Strategic thinker, Analytical mindset, Think outside the box, Innovative thinker

Team & Collaboration Clichés (mention who you worked with and what changed):
- Team player, Works well independently or in a team, Excellent communicator, Cross-functional collaboration, Stakeholder management

Leadership & Management Clichés (show scale: number of people, decisions, outcomes):
- Natural leader, People person, Hands-on manager, Visionary, Thought leader, Change agent

Tech-Specific Buzzwords (explain how it was optimized or scaled):
- Cutting-edge technology, Scalable solutions, Best practices, Robust architecture, High-performance systems, Optimized workflows

Marketing / Business Buzzwords (use plain language + metrics):
- Synergy, Value-added, Leveraged, Disruptive, End-to-end, Customer-centric, Go-to-market, KPI-driven

Soft Skills Without Proof (tie them to a concrete situation):
- Multitasker, Time management, Adaptable, Resilient, Stress-resistant

Phrases Recruiters Ignore (use better verbs instead):
- Responsible for, In charge of, Tasked with, Assisted with (without outcome), Worked on

Instead of buzzwords, use concrete language that shows what was accomplished, who was involved, what changed, and measurable outcomes.

The summary should sound like something the candidate would say out loud.
Use ${positionLevelText} only when the source already supports that level.
Mention tools, architecture, or scale only when the source states them. Otherwise write [X].

${themesInstructions}${seniorityInstructions ? '\n\n' + seniorityInstructions : ''}

Return ONLY the summary text, without any markdown formatting, quotes, or additional explanations.`;
    }

    const action = modifyType ? `Modifying summary (${modifyType})` : 'Generating summary';
    console.log(`${action} for:`, name || 'Unknown');

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: FIDELITY_TEMPERATURE,
      max_tokens: modifyType === 'verbose' ? 300 : 200
    });

    if (!completion.choices[0]?.message?.content) {
      console.error('Unexpected API response:', completion);
      return NextResponse.json(
        { 
          error: 'Unexpected API Response',
          message: 'No content received from OpenAI API' 
        },
        { status: 500 }
      );
    }

    // Get the content and clean it up
    let summary = completion.choices[0].message.content.trim();
    
    // Remove any markdown formatting or quotes
    summary = summary.replace(/^["']|["']$/g, '');
    summary = summary.replace(/^```[\w]*\n?|\n?```$/g, '');
    summary = summary.trim();
    const factSource = [experience, education, skills, existingSummary].filter(Boolean).join('\n');
    summary = scrubInventedClaims(summary, factSource);
    const bannedPhrases = findBannedPhrases(summary);

    console.log(`${action} completed successfully`);

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'ai_rewrite');

    return NextResponse.json({
      success: true,
      summary: summary,
      bannedPhrases
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { 
          error: 'API Quota Exceeded',
          message: 'OpenAI API quota has been exceeded. Please check your billing settings.' 
        },
        { status: 429 }
      );
    }

    if (error.code === 'invalid_api_key') {
      return NextResponse.json(
        { 
          error: 'Invalid API Key',
          message: 'The provided OpenAI API key is invalid.' 
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}
