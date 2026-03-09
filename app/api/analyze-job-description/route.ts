import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';

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
    const { userId } = authResult;

    // 2. Check usage limit BEFORE processing
    const usageCheck = await checkUsageLimit(userId, 'job_analysis');
    if (!usageCheck.allowed) {
      return usageCheck.error;
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

    const systemMessage = 'You are a professional resume and job description analyst. Analyze job descriptions to determine the seniority level required, extract important keywords, and identify key themes and values.';

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

IMPORTANT: For each keyword, count how many times it appears in the job description (case-insensitive). Then sort keywords within each category by occurrence count (highest first). If two keywords have the same count, maintain alphabetical order.

Return the keywords in the following JSON format:
{
  "technicalSkills": [{"keyword": "keyword1", "count": 5}, {"keyword": "keyword2", "count": 3}, ...],
  "toolsFrameworks": [{"keyword": "keyword1", "count": 4}, {"keyword": "keyword2", "count": 2}, ...],
  "methodologies": [{"keyword": "keyword1", "count": 3}, {"keyword": "keyword2", "count": 1}, ...],
  "domainTerms": [{"keyword": "keyword1", "count": 2}, {"keyword": "keyword2", "count": 0}, ...],
  "qualifications": [{"keyword": "keyword1", "count": 3}, {"keyword": "keyword2", "count": 1}, ...],
  "responsibilities": [{"keyword": "keyword1", "count": 4}, {"keyword": "keyword2", "count": 2}, ...]
}

Each keyword object must have both "keyword" (string) and "count" (number) fields. Keywords should be sorted by count (descending) within each category. Only include keywords that are relevant to a resume. Return ONLY valid JSON, no other text or explanations.`;

    // Third, extract themes and recommendations
    const themesPrompt = `Analyze the following job posting and identify:
1. The core themes and values emphasized (e.g., ownership, system design, mentorship, scale, innovation, collaboration)
2. What the resume should demonstrate (specific capabilities, experiences, or achievements)
3. Why these matter for this role

Job Title: ${title}

Job Description:
${job}

Return a JSON object with this structure:
{
  "themes": ["theme1", "theme2", "theme3"],
  "recommendations": [
    "What your resume should show 1",
    "What your resume should show 2",
    "What your resume should show 3"
  ],
  "summary": "One sentence explaining what this job emphasizes (e.g., 'This job emphasizes ownership and system design.')"
}

Focus on actionable insights that tell the candidate what to emphasize in their resume. Return ONLY valid JSON, no other text or explanations.`;

    console.log('Analyzing job description for seniority level, keywords, and themes');

    // Make all three API calls in parallel
    const openai = getOpenAIClient();
    const [toneCompletion, keywordsCompletion, themesCompletion] = await Promise.all([
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
            content: themesPrompt
          }
        ],
        temperature: 0.5,
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

    if (!themesCompletion.choices[0]?.message?.content) {
      console.error('Unexpected API response for themes:', themesCompletion);
      return NextResponse.json(
        { 
          error: 'Unexpected API Response',
          message: 'No content received from OpenAI API for themes analysis' 
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

    // Helper function to extract keyword string from either format (string or {keyword, count} object)
    const extractKeyword = (item: any): string => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && item.keyword) return item.keyword.trim();
      return '';
    };

    // Helper function to extract count from either format
    const extractCount = (item: any, keyword: string): number => {
      if (item && typeof item === 'object' && typeof item.count === 'number') {
        return item.count;
      }
      return -1; // Indicate count not provided by AI
    };

    // Process each category - handle both old format (strings) and new format (objects with counts)
    const processCategory = (categoryArray: any[]): { keywords: string[], keywordsWithCounts: Array<{keyword: string, count: number}> } => {
      if (!Array.isArray(categoryArray)) {
        return { keywords: [], keywordsWithCounts: [] };
      }

      const keywordsWithCounts = categoryArray
        .map((item: any) => {
          const keyword = extractKeyword(item);
          if (!keyword) return null;
          const aiCount = extractCount(item, keyword);
          return { keyword, aiCount };
        })
        .filter((item): item is { keyword: string, aiCount: number } => item !== null);

      return {
        keywords: keywordsWithCounts.map(item => item.keyword),
        keywordsWithCounts: keywordsWithCounts.map(item => ({ keyword: item.keyword, count: item.aiCount }))
      };
    };

    // Process all categories
    const processedCategories = {
      technicalSkills: processCategory(categorizedKeywords.technicalSkills),
      toolsFrameworks: processCategory(categorizedKeywords.toolsFrameworks),
      methodologies: processCategory(categorizedKeywords.methodologies),
      domainTerms: processCategory(categorizedKeywords.domainTerms),
      qualifications: processCategory(categorizedKeywords.qualifications),
      responsibilities: processCategory(categorizedKeywords.responsibilities)
    };

    // Create keywords structure for backward compatibility (just keyword strings)
    const keywords = {
      technicalSkills: processedCategories.technicalSkills.keywords,
      toolsFrameworks: processedCategories.toolsFrameworks.keywords,
      methodologies: processedCategories.methodologies.keywords,
      domainTerms: processedCategories.domainTerms.keywords,
      qualifications: processedCategories.qualifications.keywords,
      responsibilities: processedCategories.responsibilities.keywords
    };

    // Collect all keywords with AI-provided counts
    const allKeywordsWithAICounts = [
      ...processedCategories.technicalSkills.keywordsWithCounts,
      ...processedCategories.toolsFrameworks.keywordsWithCounts,
      ...processedCategories.methodologies.keywordsWithCounts,
      ...processedCategories.domainTerms.keywordsWithCounts,
      ...processedCategories.qualifications.keywordsWithCounts,
      ...processedCategories.responsibilities.keywordsWithCounts
    ];

    // Create a flat list of all keywords for backward compatibility
    const allKeywords = [
      ...keywords.technicalSkills,
      ...keywords.toolsFrameworks,
      ...keywords.methodologies,
      ...keywords.domainTerms,
      ...keywords.qualifications,
      ...keywords.responsibilities
    ];

    // Count occurrences of each keyword in the job description (backend fallback)
    const countKeywordOccurrences = (keyword: string): number => {
      const combinedText = `${title} ${job}`.toLowerCase();
      const keywordLower = keyword.toLowerCase();
      
      // Escape special regex characters in the keyword
      const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Use word boundaries to match whole words only (case-insensitive)
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const matches = combinedText.match(regex);
      return matches ? matches.length : 0;
    };

    // Use AI-provided counts if available, otherwise fall back to backend counting
    // AI already sorted keywords within categories, but we need to sort across all categories
    let keywordsWithCounts: Array<{ keyword: string, count: number }>;
    
    if (allKeywordsWithAICounts.length > 0) {
      // Use AI-provided counts (or count manually if AI didn't provide count)
      keywordsWithCounts = allKeywordsWithAICounts
        .map((item: { keyword: string, count: number }) => {
          // If AI provided a count (count >= 0), use it; otherwise count manually
          const count = item.count >= 0 ? item.count : countKeywordOccurrences(item.keyword);
          return {
            keyword: item.keyword,
            count: count
          };
        })
        .sort((a, b) => {
          // Sort by count (descending), then alphabetically if counts are equal
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.keyword.localeCompare(b.keyword);
        });
    } else {
      // Fallback: if no AI counts available, use backend counting and sorting
      console.log('No AI-provided counts found, using backend counting and sorting');
      keywordsWithCounts = allKeywords
        .map((keyword: string) => ({
          keyword,
          count: countKeywordOccurrences(keyword)
        }))
        .sort((a, b) => {
          // Sort by count (descending), then alphabetically if counts are equal
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.keyword.localeCompare(b.keyword);
        });
    }

    // Extract just the keywords in sorted order (for backward compatibility)
    const sortedKeywords = keywordsWithCounts.map(item => item.keyword);

    // Parse themes data
    let themesText = themesCompletion.choices[0].message.content.trim();
    console.log('Themes text:', themesText);
    
    // Remove markdown code blocks if present
    themesText = themesText.replace(/^```json\s*|\s*```$/g, '');
    themesText = themesText.replace(/^```\s*|\s*```$/g, '');
    
    let themesData;
    try {
      themesData = JSON.parse(themesText);
      console.log('Themes data:', themesData);
    } catch (error) {
      console.error('Failed to parse themes JSON:', error);
      // Fallback: try to extract JSON from the response
      const jsonMatch = themesText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        themesData = JSON.parse(jsonMatch[0]);
      } else {
        // Ultimate fallback: return empty themes
        themesData = {
          themes: [],
          recommendations: [],
          summary: ""
        };
      }
    }

    // Ensure all theme fields exist
    const themes = {
      themes: Array.isArray(themesData.themes) 
        ? themesData.themes.filter((t: string) => t && t.trim().length > 0)
        : [],
      recommendations: Array.isArray(themesData.recommendations)
        ? themesData.recommendations.filter((r: string) => r && r.trim().length > 0)
        : [],
      summary: themesData.summary && typeof themesData.summary === 'string'
        ? themesData.summary.trim()
        : ""
    };

    console.log('Job description analysis completed successfully. Tone:', tone, 'Total keywords:', allKeywords.length, 'Themes:', themes.themes.length);

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'job_analysis');

    return NextResponse.json({
      success: true,
      tone: tone,
      keywords: sortedKeywords, // Sorted by occurrence count (highest first)
      keywordsWithCounts: keywordsWithCounts, // Keywords with occurrence counts for frontend use
      keywordsByCategory: keywords, // New categorized structure (unsorted)
      themes: themes.themes,
      recommendations: themes.recommendations,
      summary: themes.summary
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
