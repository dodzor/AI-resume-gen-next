import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createResumePrompt } from '../../../lib/resumeTemplate';
import { EVIDENCE_RULES, FIDELITY_TEMPERATURE, scrubInventedClaims } from '@/lib/evidenceRules';
import { requireAuth } from '@/lib/api-auth';

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
    const { name, email, phone, location, experience, education, skills, portfolio, portfolioLink, job } = body;

    // Validate required fields (phone, location, portfolio, portfolioLink are optional)
    if (!name || !email || !experience || !education || !skills || !job) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = createResumePrompt({
      name,
      email,
      phone,
      location,
      experience,
      education,
      skills,
      portfolio,
      portfolioLink,
      job
    });

    console.log('Sending to OpenAI API:', { name, email, job: job.substring(0, 100) + '...' });

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You assemble confirmed facts into a one-column resume. You do not invent bullets to fill the template. ${EVIDENCE_RULES}`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: FIDELITY_TEMPERATURE,
      max_tokens: 1500
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

    // Get the content and clean up markdown code blocks
    let content = completion.choices[0].message.content;

    // Remove markdown code block markers
    content = content.replace(/^```html\s*/i, '');
    content = content.replace(/^```\s*/i, ''); // Also handle plain ```
    content = content.replace(/\s*```$/, '');

    // Remove common AI response endings/notes
    content = content.replace(/\n\s*Note:[\s\S]*$/i, '');
    content = content.replace(/\n\s*Please note:[\s\S]*$/i, '');
    content = content.replace(/\n\s*\*\*Note:[\s\S]*$/i, '');
    content = content.replace(/\n\s*---[\s\S]*$/i, '');
    content = content.replace(/\n\s*This resume[\s\S]*$/i, '');
    content = content.replace(/\n\s*Feel free[\s\S]*$/i, '');
    content = content.replace(/\n\s*Let me know[\s\S]*$/i, '');
    content = content.replace(/\n\s*This resume is structured/i, '');

    content = content.trim();
    const factSource = [experience, education, skills, portfolio, name].filter(Boolean).join('\n');
    content = scrubInventedClaims(content, factSource);

    console.log('Resume generated successfully for:', name);

    return NextResponse.json({
      success: true,
      resume: content
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
