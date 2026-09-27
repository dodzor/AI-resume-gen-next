import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { enrichExperiencesFromSourceText } from '@/lib/enrichResumeImportExperiences';
import { resumeImportSchema, type ResumeImportPayload } from '@/lib/resumeImportSchema';

const MAX_RESUME_TEXT_CHARS = 100_000;

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const SYSTEM_PROMPT = `You extract structured resume data from plain text (from a PDF). Rules:
- Only include facts explicitly present in the text. Do not invent employers, dates, degrees, or skills.
- Use empty string "" for any field you cannot find.
- experiences: one object per distinct job. For EACH job you MUST fill role, company, and dates from the job heading when it appears (e.g. "Software Developer at Digi (2016-present)", "Engineer at Bitnova (2013-2016)", "Title at Company (Jan 2020 – Dec 2022)"). Put ONLY bullet / achievement lines in description, joined with newline characters — do not repeat the job title line inside description.
- educationEntries: degrees, schools, date ranges; use "" for gpa or coursework if absent.
- certifications: professional certs only if clearly listed; else [].
- skills: one string, comma-separated or prose as in the source (prefer comma-separated short list).
- portfolioProjects: only if explicit projects section exists; else [].
- portfolioLink: personal site or portfolio URL if present, else "".
- summary: professional summary or objective paragraph if present, else "".
Return a single JSON object with exactly these keys: name, email, phone, location, summary, skills, portfolioLink, experiences, educationEntries, certifications, portfolioProjects.`;

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { userId } = authResult;

    const usageCheck = await checkUsageLimit(userId, 'ai_rewrite');
    if (!usageCheck.allowed) {
      return usageCheck.error;
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: 'OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const resumeText =
      typeof body?.resumeText === 'string' ? body.resumeText.trim() : '';

    if (!resumeText) {
      return NextResponse.json(
        { error: 'Missing resumeText.' },
        { status: 400 }
      );
    }

    if (resumeText.length > MAX_RESUME_TEXT_CHARS) {
      return NextResponse.json(
        {
          error: `Resume text is too long (max ${MAX_RESUME_TEXT_CHARS} characters).`,
        },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Resume text:\n\n${resumeText}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: 'No response from extraction model.' },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Model returned invalid JSON.' },
        { status: 422 }
      );
    }

    const validated = resumeImportSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('Resume import Zod error:', validated.error.flatten());
      return NextResponse.json(
        { error: 'Could not validate extracted resume data. Try a clearer PDF export.' },
        { status: 422 }
      );
    }

    const data: ResumeImportPayload = {
      ...validated.data,
      experiences: enrichExperiencesFromSourceText(
        validated.data.experiences,
        resumeText
      ),
    };

    await incrementUsageAfterAction(userId, 'ai_rewrite');

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Resume import failed:', error);
    return NextResponse.json(
      { error: 'Failed to import resume from text.' },
      { status: 500 }
    );
  }
}
