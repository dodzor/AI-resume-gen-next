import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { EVIDENCE_RULES, FIDELITY_TEMPERATURE, parseModelJson, scrubInventedClaims } from '@/lib/evidenceRules';

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

type ExperienceOut = { role?: string; company?: string; dates?: string; description?: string };
type EducationOut = { degree?: string; school?: string; dates?: string; gpa?: string; coursework?: string };

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
    const qa = Array.isArray(body.qa) ? body.qa : [];
    const answered = qa.filter((item: { answer?: string }) => typeof item.answer === 'string' && item.answer.trim());
    if (!dump.trim() && answered.length === 0) {
      return NextResponse.json({ error: 'Nothing confirmed to structure.' }, { status: 400 });
    }

    const source = [
      dump,
      ...answered.map((item: { question?: string; answer?: string }) => `${item.question}\n${item.answer}`),
    ].join('\n');

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: FIDELITY_TEMPERATURE,
      response_format: { type: 'json_object' },
      max_tokens: 1800,
      messages: [
        {
          role: 'system',
          content: `You structure a career record from confirmed facts only. Do not write an application resume. ${EVIDENCE_RULES}`,
        },
        {
          role: 'user',
          content: `Use only the notes and answered questions below. Ignore unanswered questions. Do not add employers, tools, dates, or metrics that are not written here. Where a useful number is missing, put [X] in the bullet.\n\n${source}\n\nReturn JSON:\n{"name":"","email":"","phone":"","location":"","skills":"","summary":"","confirmedFacts":[""],"experiences":[{"role":"","company":"","dates":"","description":"one bullet per line"}],"educationEntries":[{"degree":"","school":"","dates":"","gpa":"","coursework":""}]}`,
        },
      ],
    });

    const parsed = parseModelJson<Record<string, unknown>>(completion.choices[0]?.message?.content || '{}');
    const experiences = (Array.isArray(parsed.experiences) ? parsed.experiences : []).map((item) => {
      const row = item as ExperienceOut;
      return {
        role: scrubInventedClaims(String(row.role || ''), source),
        company: scrubInventedClaims(String(row.company || ''), source),
        dates: scrubInventedClaims(String(row.dates || ''), source),
        description: scrubInventedClaims(String(row.description || ''), source),
      };
    }).filter((item) => item.role || item.company || item.description);

    const educationEntries = (Array.isArray(parsed.educationEntries) ? parsed.educationEntries : []).map((item) => {
      const row = item as EducationOut;
      return {
        degree: scrubInventedClaims(String(row.degree || ''), source),
        school: scrubInventedClaims(String(row.school || ''), source),
        dates: scrubInventedClaims(String(row.dates || ''), source),
        gpa: row.gpa ? scrubInventedClaims(String(row.gpa), source) : '',
        coursework: row.coursework ? scrubInventedClaims(String(row.coursework), source) : '',
      };
    }).filter((item) => item.degree || item.school);

    const confirmedFacts = Array.isArray(parsed.confirmedFacts)
      ? parsed.confirmedFacts.filter((fact): fact is string => typeof fact === 'string' && source.toLowerCase().includes(fact.toLowerCase().slice(0, Math.min(fact.length, 48))))
      : [];

    await incrementUsageAfterAction(userId, 'ai_rewrite');
    return NextResponse.json({
      success: true,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      location: typeof parsed.location === 'string' ? parsed.location : '',
      skills: scrubInventedClaims(typeof parsed.skills === 'string' ? parsed.skills : '', source),
      summary: scrubInventedClaims(typeof parsed.summary === 'string' ? parsed.summary : '', source),
      experiences,
      educationEntries,
      confirmedFacts,
    });
  } catch (error: any) {
    console.error('Structure master error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'Could not structure the career record' }, { status: 500 });
  }
}
