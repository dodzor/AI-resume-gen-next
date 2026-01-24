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
    const { name, email, experience, education, skills, job, existingSummary, modifyType } = body;

    // Validate required fields
    if (!job) {
      return NextResponse.json(
        { error: 'Missing required field: job description' },
        { status: 400 }
      );
    }

    // If modifying an existing summary, validate it exists
    if (modifyType && !existingSummary) {
      return NextResponse.json(
        { error: 'Missing required field: existing summary is required for modification' },
        { status: 400 }
      );
    }

    let prompt = '';
    let systemMessage = '';

    if (modifyType && existingSummary) {
      // Modification mode
      const modificationInstructions = {
        concise: 'Make the summary more concise and brief. Reduce it to 1-2 sentences (approximately 30-50 words) while keeping the most impactful information.',
        verbose: 'Make the summary more detailed and comprehensive. Expand it to 3-4 sentences (approximately 80-120 words) with more specific details about experience and achievements.',
        senior: 'Rewrite the summary to emphasize senior-level experience, leadership, strategic thinking, and high-level impact. Use more authoritative language and highlight executive-level qualifications.'
      };

      systemMessage = 'You are a professional resume writer. Modify professional summaries to meet specific requirements while maintaining quality and relevance.';
      
      prompt = `You are modifying an existing professional summary. ${modificationInstructions[modifyType as keyof typeof modificationInstructions]}

Current Summary:
${existingSummary}

${name ? `Candidate Name: ${name}` : ''}
${job ? `Target Job Description:\n${job}` : ''}
${experience ? `Work Experience:\n${experience}` : ''}
${education ? `Education:\n${education}` : ''}
${skills ? `Skills: ${skills}` : ''}

Requirements:
- Maintain professional tone and quality
- Keep it relevant to the target job
- Preserve key qualifications and achievements
- Use professional language

Return ONLY the modified summary text, without any markdown formatting, quotes, or additional explanations.`;
    } else {
      // Generation mode
      systemMessage = 'You are a professional resume writer. Generate concise, compelling professional summaries tailored to specific job descriptions.';
      
      prompt = `You are a professional resume writer. Generate a compelling professional summary (2-3 sentences) for a resume 
    based on the following information. Do not include any other text or formatting in your response:

${name ? `Candidate Name: ${name}` : ''}
${email ? `Email: ${email}` : ''}
${experience ? `Work Experience:\n${experience}` : ''}
${education ? `Education:\n${education}` : ''}
${skills ? `Skills: ${skills}` : ''}
${job ? `Target Job Description:\n${job}` : ''}

Requirements:
- Write a professional summary that highlights the candidate's key qualifications and aligns with the target job
- Keep it concise (2-3 sentences, approximately 50-80 words)
- Focus on relevant experience, skills, and achievements
- Make it compelling and tailored to the target job description
- Use professional language

Return ONLY the summary text, without any markdown formatting, quotes, or additional explanations.`;
    }

    const action = modifyType ? `Modifying summary (${modifyType})` : 'Generating summary';
    console.log(`${action} for:`, name || 'Unknown');

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
      temperature: 0.7,
      max_tokens: modifyType === 'verbose' ? 300 : 200
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
    let summary = completion.choices[0].message.content.trim();
    
    // Remove any markdown formatting or quotes
    summary = summary.replace(/^["']|["']$/g, '');
    summary = summary.replace(/^```[\w]*\n?|\n?```$/g, '');
    summary = summary.trim();

    console.log(`${action} completed successfully`);

    return NextResponse.json({
      success: true,
      summary: summary
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
