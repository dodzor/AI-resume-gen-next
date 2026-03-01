import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { bullet, role, company, allBullets, keywords, tone, themes, recommendations, thematicSummary } = body;

    // Validate required fields
    if (!bullet || !bullet.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: bullet' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume writer specializing in transforming vague, task-based job descriptions into impactful, concrete bullet points that avoid buzzwords and clichés.';
    
    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nIMPORTANT THEMES TO EMPHASIZE: The following themes and values are critical for this role:\n${themes.map((t: string) => `- ${t}`).join('\n')}\n\nThe bullet point should demonstrate these capabilities:\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}\n\nWhen rewriting the bullet point, ensure it naturally incorporates and emphasizes these themes and recommendations. Show concrete examples of how the work described aligns with what this role values.`;
    }
    
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
    
    const contextInfo = allBullets && allBullets.length > 0 
      ? `\n\nOther bullet points in this role for context:\n${allBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}`
      : '';

    // Prepare keywords information
    const keywordsInfo = keywords && Array.isArray(keywords) && keywords.length > 0
      ? `\n\nIMPORTANT: The following keywords from the job description should be naturally incorporated into the rewritten bullet point if they are relevant to this work. 
      Only include keywords that make sense in context - do not force them in unnaturally:\n${keywords.map((k: string) => `- ${k}`).join('\n')}\n\n
      When incorporating keywords, ensure they flow naturally within the sentence and maintain the bullet point's clarity and impact.`
      : '';

    const prompt = `Rewrite the following single bullet point to make it more impactful and concrete. Convert any vague, task-based statements into a bullet that shows impact, results, or value, not just what the person was responsible for.

Format: Action verb + what you did + how + result/impact

Bullet point to rewrite:
${bullet}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}${contextInfo}${keywordsInfo}

Requirements:
- Transform the bullet point to show impact, results, or value
- Use the format: Action verb + what you did + how + result/impact
- Focus on quantifiable results, improvements, or achievements when possible
- Use strong action verbs (e.g., "Developed", "Implemented", "Led", "Optimized", "Increased", "Reduced", "Built", "Delivered", "Launched", "Automated", "Scaled")
- If specific metrics aren't available, focus on the impact or value delivered
- Keep it concise but impactful
${keywords && Array.isArray(keywords) && keywords.length > 0 ? `- Naturally incorporate relevant keywords from the job description when they fit the context\n- Prioritize keywords that are directly related to the work described in the bullet point\n${keywords.map((k: string) => `- ${k}`).join('\n')}` : ''}
- Return ONLY the rewritten bullet point, without any prefixes, numbering, or formatting
- Do not include explanations or notes
- Do not add bullet point symbols (•, -, *)
- Return a single line of text

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

Return ONLY the rewritten bullet point as a single line of text, without any prefixes, numbering, or formatting.`;

    console.log('Rewriting bullet point for:', role || 'Unknown role');

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
      max_tokens: 200
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
    let rewrittenBullet = completion.choices[0].message.content.trim();
    
    // Remove any markdown formatting, bullets, numbering, or quotes
    rewrittenBullet = rewrittenBullet.replace(/^["']|["']$/g, '');
    rewrittenBullet = rewrittenBullet.replace(/^```[\w]*\n?|\n?```$/g, '');
    // Remove markdown bullets and numbering
    rewrittenBullet = rewrittenBullet.replace(/^[-*•]\s+/gm, '');
    rewrittenBullet = rewrittenBullet.replace(/^\d+\.\s+/gm, '');
    // Remove any leading/trailing whitespace
    rewrittenBullet = rewrittenBullet.trim();

    // Detect which keywords were actually incorporated into the rewritten bullet
    const incorporatedKeywords: string[] = [];
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const rewrittenLower = rewrittenBullet.toLowerCase();
      keywords.forEach((keyword: string) => {
        const keywordLower = keyword.toLowerCase();
        // Check if keyword appears in the rewritten bullet (case-insensitive, whole word match)
        // Use word boundaries to match whole words
        const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
        if (regex.test(rewrittenLower)) {
          incorporatedKeywords.push(keyword);
        }
      });
    }

    // Detect which themes were relevant (if themes were provided)
    const relevantThemes: string[] = [];
    if (themes && Array.isArray(themes) && themes.length > 0) {
      const rewrittenLower = rewrittenBullet.toLowerCase();
      themes.forEach((theme: string) => {
        const themeLower = theme.toLowerCase();
        // Check if theme-related terms appear in the rewritten bullet
        // This is a simple check - could be enhanced with semantic matching
        if (rewrittenLower.includes(themeLower) || 
            (themeLower.includes('ownership') && (rewrittenLower.includes('built') || rewrittenLower.includes('led') || rewrittenLower.includes('architected'))) ||
            (themeLower.includes('system design') && (rewrittenLower.includes('architecture') || rewrittenLower.includes('system') || rewrittenLower.includes('design'))) ||
            (themeLower.includes('mentorship') && (rewrittenLower.includes('mentor') || rewrittenLower.includes('team') || rewrittenLower.includes('lead')))) {
          relevantThemes.push(theme);
        }
      });
    }

    console.log('Bullet point rewritten successfully. Incorporated keywords:', incorporatedKeywords.length, 'Relevant themes:', relevantThemes.length);

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'ai_rewrite');

    return NextResponse.json({
      success: true,
      rewrittenBullet: rewrittenBullet,
      incorporatedKeywords: incorporatedKeywords,
      reasoning: {
        themes: relevantThemes,
        keywords: incorporatedKeywords,
        tone: tone || null,
        hasThemes: themes && themes.length > 0,
        hasKeywords: keywords && keywords.length > 0
      }
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
