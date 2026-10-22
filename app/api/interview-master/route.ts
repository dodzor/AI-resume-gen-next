import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { FIDELITY_TEMPERATURE, parseModelJson } from '@/lib/evidenceRules';

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
    const dump = typeof body.dump === 'string' ? body.dump : '';
    const prior = Array.isArray(body.prior) ? body.prior : [];
    if (dump.trim().length < 40) {
      return NextResponse.json({ error: 'Add more career notes before asking questions.' }, { status: 400 });
    }

    const priorText = prior
      .map((item: { question?: string; answer?: string }) => `Q: ${item.question || ''}\nA: ${item.answer || '(unanswered)'}`)
      .join('\n');

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: FIDELITY_TEMPERATURE,
      response_format: { type: 'json_object' },
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'Do not write a resume. Read everything shared. Ask 5–7 questions about missing numbers, vague achievements, unclear responsibilities, and places where stronger evidence might exist.',
        },
        {
          role: 'user',
          content: `Career notes:\n${dump}\n\nAlready asked:\n${priorText || '(none)'}\n\nAsk 5 to 7 new questions. Good questions ask how many people they managed, what happened after the launch, what improved because of their work, what budget they owned, how much money or time they saved, and how much faster the process became. Do not draft bullets.\n\nReturn JSON: {"questions":["..."]}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = parseModelJson<{ questions?: unknown }>(raw);
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((question): question is string => typeof question === 'string' && question.trim().length > 0).slice(0, 7)
      : [];
    if (questions.length < 5) {
      return NextResponse.json({ error: 'The interview did not return enough questions. Try again.' }, { status: 502 });
    }

    await incrementUsageAfterAction(userId, 'ai_rewrite');
    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('Interview error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'Interview failed' }, { status: 500 });
  }
}
