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
    const { title, job } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: job title' },
        { status: 400 }
      );
    }

    if (!job || !job.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: job description' },
        { status: 400 }
      );
    }

    const systemMessage = 'You are a professional resume and job description analyst. Analyze job descriptions to determine the seniority level required and extract important keywords.';

    // First, determine the tone
    const tonePrompt = `Analyze the following job posting and determine the seniority level required. Consider factors such as:
- Years of experience mentioned
- Level of responsibility and autonomy
- Leadership or management requirements
- Complexity of tasks and projects
- Technical depth required
- Strategic vs. tactical focus

Job Title: ${title}

Job Description:
${job}

Based on your analysis, determine if this is a:
- "junior" role: Entry-level position, typically 0-2 years of experience, requires guidance and supervision, focuses on learning and executing tasks
- "mid" role: Mid-level position, typically 2-5 years of experience, some autonomy, may mentor juniors, handles moderately complex tasks
- "senior" role: Senior-level position, typically 5+ years of experience, high autonomy, leadership responsibilities, strategic thinking, handles complex projects

Return ONLY one word: "junior", "mid", or "senior". Do not include any other text, explanations, or formatting.`;

    // Second, extract keywords with categories
    const keywordsPrompt = `Extract the most important keywords from the following job posting and categorize them. Focus on:
- Technical skills and technologies (programming languages, technologies, platforms)
- Tools and frameworks (development tools, libraries, frameworks)
- Methodologies and processes (Agile, Scrum, DevOps, etc.)
- Domain-specific terms (industry-specific knowledge)
- Required qualifications (certifications, degrees, specific requirements)
- Key responsibilities (action verbs, responsibilities mentioned)

Job Title: ${title}

Job Description:
${job}

Return the keywords in the following JSON format:
{
  "technicalSkills": ["keyword1", "keyword2", ...],
  "toolsFrameworks": ["keyword1", "keyword2", ...],
  "methodologies": ["keyword1", "keyword2", ...],
  "domainTerms": ["keyword1", "keyword2", ...],
  "qualifications": ["keyword1", "keyword2", ...],
  "responsibilities": ["keyword1", "keyword2", ...]
}

Only include keywords that are relevant to a resume. Return ONLY valid JSON, no other text or explanations.`;

    console.log('Analyzing job description for seniority level and keywords');

    // Make both API calls in parallel
    const [toneCompletion, keywordsCompletion] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: tonePrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      }),
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: keywordsPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    ]);

    if (!toneCompletion.choices[0]?.message?.content) {
      console.error('Unexpected API response for tone:', toneCompletion);
      return NextResponse.json(
        { 
          error: 'Unexpected API Response',
          message: 'No content received from OpenAI API for tone analysis' 
        },
        { status: 500 }
      );
    }

    if (!keywordsCompletion.choices[0]?.message?.content) {
      console.error('Unexpected API response for keywords:', keywordsCompletion);
      return NextResponse.json(
        { 
          error: 'Unexpected API Response',
          message: 'No content received from OpenAI API for keywords extraction' 
        },
        { status: 500 }
      );
    }

    // Get the tone and clean it up
    let tone = toneCompletion.choices[0].message.content.trim().toLowerCase();
    
    // Normalize the response to ensure it's one of the expected values
    if (tone.includes('junior')) {
      tone = 'junior';
    } else if (tone.includes('senior')) {
      tone = 'senior';
    } else {
      tone = 'mid'; // Default to mid if unclear
    }

    // Get keywords and parse JSON
    let keywordsText = keywordsCompletion.choices[0].message.content.trim();
    console.log('Keywords text:', keywordsText);
    
    // Remove markdown code blocks if present
    keywordsText = keywordsText.replace(/^```json\s*|\s*```$/g, '');
    keywordsText = keywordsText.replace(/^```\s*|\s*```$/g, '');
    
    let categorizedKeywords;
    try {
      categorizedKeywords = JSON.parse(keywordsText);
      console.log('Categorized keywords:', categorizedKeywords);
    } catch (error) {
      console.error('Failed to parse keywords JSON:', error);
      // Fallback: try to extract JSON from the response
      const jsonMatch = keywordsText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        categorizedKeywords = JSON.parse(jsonMatch[0]);
      } else {
        // Ultimate fallback: return empty categories
        categorizedKeywords = {
          technicalSkills: [],
          toolsFrameworks: [],
          methodologies: [],
          domainTerms: [],
          qualifications: [],
          responsibilities: []
        };
      }
    }

    // Ensure all categories exist and are arrays
    const keywords = {
      technicalSkills: Array.isArray(categorizedKeywords.technicalSkills) 
        ? categorizedKeywords.technicalSkills.filter((k: string) => k && k.trim().length > 0)
        : [],
      toolsFrameworks: Array.isArray(categorizedKeywords.toolsFrameworks)
        ? categorizedKeywords.toolsFrameworks.filter((k: string) => k && k.trim().length > 0)
        : [],
      methodologies: Array.isArray(categorizedKeywords.methodologies)
        ? categorizedKeywords.methodologies.filter((k: string) => k && k.trim().length > 0)
        : [],
      domainTerms: Array.isArray(categorizedKeywords.domainTerms)
        ? categorizedKeywords.domainTerms.filter((k: string) => k && k.trim().length > 0)
        : [],
      qualifications: Array.isArray(categorizedKeywords.qualifications)
        ? categorizedKeywords.qualifications.filter((k: string) => k && k.trim().length > 0)
        : [],
      responsibilities: Array.isArray(categorizedKeywords.responsibilities)
        ? categorizedKeywords.responsibilities.filter((k: string) => k && k.trim().length > 0)
        : []
    };

    // Create a flat list of all keywords for backward compatibility
    const allKeywords = [
      ...keywords.technicalSkills,
      ...keywords.toolsFrameworks,
      ...keywords.methodologies,
      ...keywords.domainTerms,
      ...keywords.qualifications,
      ...keywords.responsibilities
    ];

    console.log('Job description analysis completed successfully. Tone:', tone, 'Total keywords:', allKeywords.length);

    return NextResponse.json({
      success: true,
      tone: tone,
      keywords: allKeywords, // Keep for backward compatibility
      keywordsByCategory: keywords // New categorized structure
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
