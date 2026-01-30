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
    const { bullet, role, company, allBullets } = body;

    // Validate required fields
    if (!bullet || !bullet.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: bullet' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume writer specializing in transforming vague, task-based job descriptions into impactful, concrete bullet points that avoid buzzwords and clichés.';
    
    const contextInfo = allBullets && allBullets.length > 0 
      ? `\n\nOther bullet points in this role for context:\n${allBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}`
      : '';

    const prompt = `Rewrite the following single bullet point to make it more impactful and concrete. Convert any vague, task-based statements into a bullet that shows impact, results, or value, not just what the person was responsible for.

Format: Action verb + what you did + how + result/impact

Bullet point to rewrite:
${bullet}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}${contextInfo}

Requirements:
- Transform the bullet point to show impact, results, or value
- Use the format: Action verb + what you did + how + result/impact
- Focus on quantifiable results, improvements, or achievements when possible
- Use strong action verbs (e.g., "Developed", "Implemented", "Led", "Optimized", "Increased", "Reduced", "Built", "Delivered", "Launched", "Automated", "Scaled")
- If specific metrics aren't available, focus on the impact or value delivered
- Keep it concise but impactful
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

    console.log('Bullet point rewritten successfully');

    return NextResponse.json({
      success: true,
      rewrittenBullet: rewrittenBullet
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
