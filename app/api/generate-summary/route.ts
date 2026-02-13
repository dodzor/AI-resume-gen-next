import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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
    const { name, email, experience, education, skills, job, existingSummary, modifyType, tone } = body;

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

    // Build seniority adjustment instructions based on tone
    let seniorityInstructions = '';
    if (tone) {
      if (tone === 'junior') {
        seniorityInstructions = `SENIORITY ADJUSTMENT: Adjust the seniority level and language based on the tone "junior":
- Adapt verbs, scope, ownership language to the junior level
- Use entry-level or junior positioning (e.g., "Junior developer", "Associate engineer", "Entry-level")
- Focus on foundational skills, learning ability, and growth potential
- Emphasize education, projects, and eagerness to contribute
- Use language appropriate for someone early in their career`;
      } else if (tone === 'senior') {
        seniorityInstructions = `SENIORITY ADJUSTMENT: Adjust the seniority level and language based on the tone "senior":
- Adapt verbs, scope, ownership language to the senior level
- Use senior-level positioning (e.g., "Senior engineer", "Lead developer", "Principal architect", "Staff engineer")
- Emphasize leadership, strategic impact, architectural decisions, and mentoring
- Highlight experience with complex systems, scale, and cross-functional influence
- Use authoritative language that reflects deep expertise and decision-making authority`;
      } else {
        seniorityInstructions = `SENIORITY ADJUSTMENT: Adjust the seniority level and language based on the tone "mid":
- Adapt verbs, scope, ownership language to the mid level
- Use mid-level positioning (e.g., "Engineer", "Developer", "Software engineer")
- Balance technical depth with collaboration and impact
- Emphasize hands-on experience and concrete achievements
- Use confident but not overly authoritative language`;
      }
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
        senior: 'Rewrite the summary to emphasize senior-level experience, leadership, strategic thinking, and high-level impact. Use more authoritative language and highlight executive-level qualifications.'
      };

      systemMessage = 'You are a professional resume writer. Modify professional summaries to meet specific requirements while maintaining quality, relevance, and avoiding buzzwords.';
      
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

${seniorityInstructions ? seniorityInstructions + '\n\n' : ''}Return ONLY the modified summary text, without any markdown formatting, quotes, or additional explanations.`;
    } else {
      // Generation mode
      systemMessage = 'You are a professional resume writer. Generate concise, compelling professional summaries tailored to specific job descriptions, avoiding buzzwords and clichés.';
      
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

The generated summary should:
- ${positionLevelText}
- Mention core stack
- Mention architectural strength
- Mention scale or impact

${seniorityInstructions ? seniorityInstructions + '\n\n' : ''}Return ONLY the summary text, without any markdown formatting, quotes, or additional explanations.`;
    }

    const action = modifyType ? `Modifying summary (${modifyType})` : 'Generating summary';
    console.log(`${action} for:`, name || 'Unknown');

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
      temperature: 0.7,
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

    console.log(`${action} completed successfully`);

    return NextResponse.json({
      success: true,
      summary: summary
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
