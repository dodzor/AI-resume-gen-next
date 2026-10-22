import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { FIDELITY_TEMPERATURE, normalizeHostileReview, parseModelJson } from '@/lib/evidenceRules';

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    const { userId } = authResult;

    const usageCheck = await checkUsageLimit(userId, 'ai_rewrite');
    if (!usageCheck.allowed) return usageCheck.error;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Configuration Error', message: 'OpenAI API key not found.' }, { status: 500 });
    }

    const body = await request.json();
    const resumeText = typeof body.resumeText === 'string' ? body.resumeText : '';
    if (resumeText.trim().length < 40) {
      return NextResponse.json({ error: 'There is not enough resume text to review.' }, { status: 400 });
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: FIDELITY_TEMPERATURE,
      response_format: { type: 'json_object' },
      max_tokens: 900,
      messages: [
        {
          role: 'system',
          content: 'Act like a hiring manager who has reviewed 10,000 resumes and wants a reason to reject this one. Say where you would stop reading, which bullets are generic, which phrases sound machine-written, and what weakens credibility. Do not be polite. Do not rewrite the resume in this pass.',
        },
        {
          role: 'user',
          content: `${resumeText}\n\nReturn JSON only. labels must be chosen from stop-reading, generic, ai-voice, credibility.\n{"stopReading":"where you stop","verdict":"the harsh read in a few sentences","annotations":[{"target":"exact line from the resume","labels":["generic"],"note":"why it fails"}]}`,
        },
      ],
    });

    const parsed = parseModelJson<unknown>(completion.choices[0]?.message?.content || '{}');
    const review = normalizeHostileReview(parsed);

    await incrementUsageAfterAction(userId, 'ai_rewrite');
    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('Hostile review error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'Review failed' }, { status: 500 });
  }
}
