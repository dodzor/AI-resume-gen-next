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
    const { description, role, company, themes, recommendations, thematicSummary } = body;

    // Validate required fields
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume writer specializing in transforming vague, task-based job descriptions into impactful, concrete bullet points that avoid buzzwords and clichés.';
    
    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nIMPORTANT THEMES TO EMPHASIZE: The following themes and values are critical for this role:\n${themes.map((t: string) => `- ${t}`).join('\n')}\n\nThe bullet points should demonstrate these capabilities:\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}\n\nWhen rewriting the bullet points, ensure they naturally incorporate and emphasize these themes and recommendations. Show concrete examples of how the work described aligns with what this role values. Prioritize bullet points that demonstrate these themes.`;
    }
    
    const prompt = `Transform the following job description into impactful, concrete bullet points. Convert vague, task-based statements into bullets that show impact, results, or value, not just what the person was responsible for.

Format: Action verb + what you did + how + result/impact

Current Description:
${description}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}

Requirements:
- Transform each vague statement into a bullet point that shows impact, results, or value
- Use the format: Action verb + what you did + how + result/impact
- Focus on quantifiable results, improvements, or achievements when possible
- Use strong action verbs (e.g., "Developed", "Implemented", "Led", "Optimized", "Increased", "Reduced", "Built", "Delivered", "Launched", "Automated", "Scaled")
- If specific metrics aren't available, focus on the impact or value delivered
- Maintain the same number of bullet points or consolidate if appropriate
- Each bullet should be concise but impactful
- Return the improved description as a plain text list with each bullet on a new line
- Do not add any markdown formatting, numbering, or additional text
- Do not include explanations or notes

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

${themesInstructions}

Return ONLY the improved bullet points, one per line, without any prefixes, numbering, or formatting.`;

    console.log('Improving experience description for:', role || 'Unknown role');

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
      max_tokens: 500
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
    let improvedDescription = completion.choices[0].message.content.trim();
    
    // Remove any markdown formatting, bullets, numbering, or quotes
    improvedDescription = improvedDescription.replace(/^["']|["']$/g, '');
    improvedDescription = improvedDescription.replace(/^```[\w]*\n?|\n?```$/g, '');
    // Remove markdown bullets and numbering
    improvedDescription = improvedDescription.replace(/^[-*•]\s+/gm, '');
    improvedDescription = improvedDescription.replace(/^\d+\.\s+/gm, '');
    // Remove any leading/trailing whitespace from each line
    improvedDescription = improvedDescription.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    improvedDescription = improvedDescription.trim();

    console.log('Experience description improved successfully');

    return NextResponse.json({
      success: true,
      improvedDescription: improvedDescription
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
