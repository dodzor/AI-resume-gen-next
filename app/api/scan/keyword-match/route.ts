import { NextRequest, NextResponse } from 'next/server';
import { extractKeywords, scanResumeAgainstKeywords } from '@/lib/resumeScanner';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resumeText = typeof body?.resumeText === 'string' ? body.resumeText : '';
    const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : '';

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: 'Missing resume text. Upload your resume PDF first.' },
        { status: 400 }
      );
    }

    if (!jobDescription.trim()) {
      return NextResponse.json(
        { error: 'Missing job description. Paste the target job description.' },
        { status: 400 }
      );
    }

    const keywords = extractKeywords(jobDescription);
    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract enough keywords from the job description.' },
        { status: 400 }
      );
    }

    const result = scanResumeAgainstKeywords(resumeText, keywords);
    return NextResponse.json({
      ...result,
      keywordCount: keywords.length
    });
  } catch (error) {
    console.error('Keyword scan failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume against job description.' },
      { status: 500 }
    );
  }
}
