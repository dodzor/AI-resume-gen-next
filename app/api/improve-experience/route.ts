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
    const { description, role, company } = body;

    // Validate required fields
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: description' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume writer specializing in transforming vague, task-based job descriptions into impactful, results-driven bullet points.';
    
    const prompt = `Transform the following job description into impactful, results-driven bullet points. Convert vague, task-based statements into bullets that show impact, results, or value, not just what the person was responsible for.

Format: Action verb + what you did + how + result/impact

Current Description:
${description}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}

Requirements:
- Transform each vague statement into a bullet point that shows impact, results, or value
- Use the format: Action verb + what you did + how + result/impact
- Focus on quantifiable results, improvements, or achievements when possible
- Use strong action verbs (e.g., "Developed", "Implemented", "Led", "Optimized", "Increased", "Reduced")
- If specific metrics aren't available, focus on the impact or value delivered
- Maintain the same number of bullet points or consolidate if appropriate
- Each bullet should be concise but impactful
- Return the improved description as a plain text list with each bullet on a new line
- Do not add any markdown formatting, numbering, or additional text
- Do not include explanations or notes

Return ONLY the improved bullet points, one per line, without any prefixes, numbering, or formatting.`;

    console.log('Improving experience description for:', role || 'Unknown role');

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
      max_tokens: 500
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
    let improvedDescription = completion.choices[0].message.content.trim();
    
    // Remove any markdown formatting, bullets, numbering, or quotes
    improvedDescription = improvedDescription.replace(/^["']|["']$/g, '');
    improvedDescription = improvedDescription.replace(/^```[\w]*\n?|\n?```$/g, '');
    // Remove markdown bullets and numbering
    improvedDescription = improvedDescription.replace(/^[-*•]\s+/gm, '');
    improvedDescription = improvedDescription.replace(/^\d+\.\s+/gm, '');
    // Remove any leading/trailing whitespace from each line
    improvedDescription = improvedDescription.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    improvedDescription = improvedDescription.trim();

    console.log('Experience description improved successfully');

    return NextResponse.json({
      success: true,
      improvedDescription: improvedDescription
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
