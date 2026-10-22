import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import {
  EVIDENCE_RULES,
  FIDELITY_TEMPERATURE,
  bulletLines,
  findBannedPhrases,
  isDutyLine,
  parseModelJson,
  scrubInventedClaims,
} from '@/lib/evidenceRules';

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
    const { description, role, company, themes, recommendations, thematicSummary } = body;

    // Validate required fields
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    const systemMessage = `You are the interviewer and editor. You do not invent experience. ${EVIDENCE_RULES}`;
    
    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nTHEMES (ordering signals only): Mention a theme only when the source already shows it.\n${themes.map((t: string) => `- ${t}`).join('\n')}\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}`;
    }
    
    const sourceCount = Math.max(bulletLines(description).length, 1);
    const prompt = `Turn this experience into outcome bullets. Keep the same number of bullets (${sourceCount}). Do not add a role, tool, metric, or outcome that is not in the source.

Shape: strong action verb → what the person did → measurable outcome.
If the number is missing, write [X].

Source:
${description}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}
${themesInstructions}

Return JSON only:
{"lines":[{"line":"rewritten bullet","isDuty":false,"factsUsed":["quote from the source"]}]}`;

    console.log('Improving experience description for:', role || 'Unknown role');

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
      response_format: { type: 'json_object' },
      max_tokens: 800
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
    const source = [description, role, company].filter(Boolean).join('\n');
    let parsed: { lines?: Array<{ line?: string; isDuty?: boolean; factsUsed?: unknown }> } = {};
    try {
      parsed = parseModelJson(completion.choices[0].message.content.trim());
    } catch {
      parsed = { lines: bulletLines(completion.choices[0].message.content).map((line) => ({ line })) };
    }
    const sourceBulletCount = bulletLines(description).length || 1;
    const lines = (parsed.lines || [])
      .slice(0, sourceBulletCount)
      .map((item) => {
        const line = scrubInventedClaims(String(item.line || '').trim(), source);
        const factsUsed = Array.isArray(item.factsUsed)
          ? item.factsUsed.filter((fact): fact is string => typeof fact === 'string' && source.toLowerCase().includes(fact.toLowerCase().slice(0, Math.min(fact.length, 40))))
          : [];
        return {
          line,
          isDuty: isDutyLine(description) || item.isDuty === true || isDutyLine(line),
          factsUsed,
          bannedPhrases: findBannedPhrases(line),
        };
      })
      .filter((item) => item.line);
    const improvedDescription = lines.map((item) => item.line).join('\n');

    console.log('Experience description improved successfully');

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'ai_rewrite');

    return NextResponse.json({
      success: true,
      improvedDescription: improvedDescription,
      lines
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
