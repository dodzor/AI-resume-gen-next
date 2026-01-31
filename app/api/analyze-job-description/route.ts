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
    const { job } = body;

    // Validate required fields
    if (!job || !job.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: job description' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume and job description analyst. Analyze job descriptions to determine the seniority level required: junior, mid, or senior.';

    const prompt = `Analyze the following job description and determine the seniority level required. Consider factors such as:
- Years of experience mentioned
- Level of responsibility and autonomy
- Leadership or management requirements
- Complexity of tasks and projects
- Technical depth required
- Strategic vs. tactical focus

Job Description:
${job}

Based on your analysis, determine if this is a:
- "junior" role: Entry-level position, typically 0-2 years of experience, requires guidance and supervision, focuses on learning and executing tasks
- "mid" role: Mid-level position, typically 2-5 years of experience, some autonomy, may mentor juniors, handles moderately complex tasks
- "senior" role: Senior-level position, typically 5+ years of experience, high autonomy, leadership responsibilities, strategic thinking, handles complex projects

Return ONLY one word: "junior", "mid", or "senior". Do not include any other text, explanations, or formatting.`;

    console.log('Analyzing job description for seniority level');

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
      temperature: 0.3,
      max_tokens: 10
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
    let tone = completion.choices[0].message.content.trim().toLowerCase();
    
    // Normalize the response to ensure it's one of the expected values
    if (tone.includes('junior')) {
      tone = 'junior';
    } else if (tone.includes('senior')) {
      tone = 'senior';
    } else {
      tone = 'mid'; // Default to mid if unclear
    }

    console.log('Job description analysis completed successfully. Tone:', tone);

    return NextResponse.json({
      success: true,
      tone: tone
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
