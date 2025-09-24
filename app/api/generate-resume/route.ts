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
    const { name, email, experience, skills, job, education = 'Politehnica University of Bucharest' } = body;

    // Validate required fields
    if (!name || !email || !experience || !skills || !job) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = `Generate a professional resume that includes a Summary, Work Experience, Skills, and Education for the following person based on the target job description: ${job}

Name: ${name}
Email: ${email}

Work Experience:
${experience}

Skills:
${skills}

Education:
${education}

Format it in clean HTML with clear sections and professional styling.`;

    console.log('Sending to OpenAI API:', { name, email, job: job.substring(0, 100) + '...' });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional resume writer. Create a well-formatted, professional resume based on the provided information. Use HTML formatting with proper structure and styling."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 1,
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
