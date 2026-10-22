import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { assembleOnePageResume } from '@/lib/assembleResume';
import {
  EVIDENCE_RULES,
  FIDELITY_TEMPERATURE,
  bulletLines,
  capToSourceBullets,
  parseModelJson,
  sameOrganization,
  scrubInventedClaims,
  sharedPhrases,
} from '@/lib/evidenceRules';

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

type MasterExperience = { role?: string; company?: string; dates?: string; description?: string };
type MasterEducation = { degree?: string; school?: string; dates?: string; coursework?: string };

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
    const master = body.master || {};
    const jobDescriptions = (Array.isArray(body.jobDescriptions) ? body.jobDescriptions : [])
      .filter((job: unknown): job is string => typeof job === 'string' && job.trim().length > 0)
      .slice(0, 4);
    if (jobDescriptions.length === 0) {
      return NextResponse.json({ error: 'Paste at least one job description.' }, { status: 400 });
    }

    const experiences: MasterExperience[] = Array.isArray(master.experiences) ? master.experiences : [];
    const education: MasterEducation[] = Array.isArray(master.educationEntries) ? master.educationEntries : [];
    const answered = Array.isArray(master.clarifyingQA)
      ? master.clarifyingQA.filter((item: { answer?: string }) => item.answer?.trim())
      : [];
    const source = [
      master.rawDump,
      master.summary,
      master.skills,
      ...experiences.map((exp) => `${exp.role} ${exp.company} ${exp.dates}\n${exp.description}`),
      ...education.map((edu) => `${edu.degree} ${edu.school} ${edu.dates}`),
      ...answered.map((item: { question?: string; answer?: string }) => `${item.question}\n${item.answer}`),
      ...(Array.isArray(master.confirmedFacts) ? master.confirmedFacts : []),
    ].filter(Boolean).join('\n');

    if (!source.trim()) {
      return NextResponse.json({ error: 'The career record has no confirmed facts yet.' }, { status: 400 });
    }

    const overlap = sharedPhrases(jobDescriptions);
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: FIDELITY_TEMPERATURE,
      response_format: { type: 'json_object' },
      max_tokens: 2200,
      messages: [
        {
          role: 'system',
          content: `You tailor one page from a career record. You do not invent facts. ${EVIDENCE_RULES}`,
        },
        {
          role: 'user',
          content: `Career record (the only source of facts):\n${source}\n\nJob descriptions (${jobDescriptions.length}):\n${jobDescriptions.map((job: string, index: number) => `--- Job ${index + 1} ---\n${job}`).join('\n\n')}\n\nPhrases that appear in every description:\n${overlap.length ? overlap.join(', ') : '(only one description was provided)'}\n\nDo this:\n1. List the ten skills and requirements that most determine whether this person gets found and taken seriously.\n2. Build a one-page resume that uses those terms only where the career record already supports them.\n3. Reorder roles and bullets so the strongest matching evidence is first: current or most relevant role, company, dates, one or two proof bullets, then skills.\n4. List requirements the record does not support as gaps. Gaps are interview prep, not text to fabricate.\n5. When more than one description is provided, use the overlap for the summary and the first bullets only when the record supports that wording.\n\nKeep every company name from the career record. Do not add a role. Do not add bullets beyond the source bullets for that role. Missing numbers stay [X].\n\nReturn JSON:\n{"requirements":[""],"gaps":[""],"overlap":[""],"summary":"","skills":[""],"experiences":[{"role":"","company":"","dates":"","bullets":[""]}]}`,
        },
      ],
    });

    const parsed = parseModelJson<Record<string, unknown>>(completion.choices[0]?.message?.content || '{}');
    const modelExperiences = Array.isArray(parsed.experiences) ? parsed.experiences : [];
    const tailoredExperiences = modelExperiences.flatMap((item) => {
      const row = item as { role?: string; company?: string; dates?: string; bullets?: unknown };
      const match = experiences.find((exp) => sameOrganization(String(exp.company || ''), String(row.company || '')));
      if (!match) return [];
      const bullets = capToSourceBullets(
        Array.isArray(row.bullets) ? row.bullets.map((bullet) => String(bullet)) : [],
        String(match.description || ''),
        source,
      );
      const fallback = bulletLines(String(match.description || '')).map((line) => scrubInventedClaims(line, source));
      return [{
        role: String(match.role || row.role || ''),
        company: String(match.company || ''),
        dates: String(match.dates || ''),
        bullets: bullets.length > 0 ? bullets : fallback,
      }];
    });

    const ordered = [...tailoredExperiences];
    for (const exp of experiences) {
      if (!ordered.some((item) => sameOrganization(item.company, String(exp.company || '')) && item.role === exp.role)) {
        ordered.push({
          role: String(exp.role || ''),
          company: String(exp.company || ''),
          dates: String(exp.dates || ''),
          bullets: bulletLines(String(exp.description || '')),
        });
      }
    }

    const sourceLower = source.toLowerCase();
    const skills = (Array.isArray(parsed.skills) ? parsed.skills : [])
      .filter((skill): skill is string => typeof skill === 'string' && sourceLower.includes(skill.toLowerCase()))
      .slice(0, 20);
    const skillList = skills.length > 0 ? skills : String(master.skills || '').split(/[,|\n]/).map((skill: string) => skill.trim()).filter(Boolean);

    const summary = scrubInventedClaims(typeof parsed.summary === 'string' ? parsed.summary : String(master.summary || ''), source);
    const requirements = (Array.isArray(parsed.requirements) ? parsed.requirements : [])
      .filter((item): item is string => typeof item === 'string')
      .slice(0, 10);
    const gaps = (Array.isArray(parsed.gaps) ? parsed.gaps : [])
      .filter((item): item is string => typeof item === 'string');
    const modelOverlap = (Array.isArray(parsed.overlap) ? parsed.overlap : [])
      .filter((item): item is string => typeof item === 'string');

    const resumeHtml = assembleOnePageResume({
      name: String(master.name || ''),
      email: String(master.email || ''),
      phone: master.phone,
      location: master.location,
      portfolioLink: master.portfolioLink,
      summary,
      experiences: ordered,
      skills: skillList,
      education: education.map((edu) => ({
        degree: String(edu.degree || ''),
        school: String(edu.school || ''),
        dates: String(edu.dates || ''),
        detail: edu.coursework,
      })),
    });

    await incrementUsageAfterAction(userId, 'ai_rewrite');
    return NextResponse.json({
      success: true,
      requirements,
      gaps,
      overlap: modelOverlap.length > 0 ? modelOverlap : overlap,
      summary,
      skills: skillList.join(', '),
      experiences: ordered.map((exp) => ({
        role: exp.role,
        company: exp.company,
        dates: exp.dates,
        description: exp.bullets.join('\n'),
      })),
      resumeHtml,
    });
  } catch (error: any) {
    console.error('Tailor error:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message || 'Could not tailor the resume' }, { status: 500 });
  }
}
