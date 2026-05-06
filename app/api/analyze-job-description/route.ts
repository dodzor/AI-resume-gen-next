import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import {
  applyQualityToCategorizedKeywords,
  rankLLMKeywordCandidates,
} from '@/lib/keywordQuality';

// Lazy-initialize OpenAI client to avoid build-time errors
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Attempts to fix common JSON issues that LLMs sometimes produce
 */
function fixCommonJSONIssues(jsonString: string): string {
  let fixed = jsonString.trim();
  
  // Remove markdown code blocks if present
  fixed = fixed.replace(/^```json\s*/i, '');
  fixed = fixed.replace(/^```\s*/, '');
  fixed = fixed.replace(/\s*```$/g, '');
  
  // Remove any leading/trailing whitespace
  fixed = fixed.trim();
  
  // Try to extract JSON object if there's extra text
  const jsonMatch = fixed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    fixed = jsonMatch[0];
  }
  
  // Fix trailing commas in arrays: [item1, item2,]
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix trailing commas in objects: {"key": "value",}
  fixed = fixed.replace(/,(\s*})/g, '$1');
  
  // Fix missing commas between array elements: ["a" "b"] -> ["a", "b"]
  fixed = fixed.replace(/(")\s+(")/g, '$1, $2');
  
  // Fix missing commas between object properties: {"a": 1 "b": 2} -> {"a": 1, "b": 2}
  fixed = fixed.replace(/(\d+)\s+(")/g, '$1, $2');
  fixed = fixed.replace(/(})\s+(")/g, '$1, $2');
  fixed = fixed.replace(/(])\s+(")/g, '$1, $2');
  
  // Fix unescaped quotes in strings (basic attempt)
  // This is tricky, so we'll be conservative
  
  return fixed;
}

/**
 * Robust JSON parser with multiple fallback strategies
 */
function parseJSONWithFallback<T>(
  rawText: string,
  defaultValue: T,
  context: string = 'JSON'
): T {
  if (!rawText || !rawText.trim()) {
    console.warn(`${context}: Empty input, using default value`);
    return defaultValue;
  }
  
  const strategies = [
    // Strategy 1: Direct parse
    () => {
      const cleaned = rawText.trim();
      return JSON.parse(cleaned);
    },
    
    // Strategy 2: Remove markdown and parse
    () => {
      let cleaned = rawText.trim();
      cleaned = cleaned.replace(/^```json\s*/i, '');
      cleaned = cleaned.replace(/^```\s*/, '');
      cleaned = cleaned.replace(/\s*```$/g, '');
      cleaned = cleaned.trim();
      return JSON.parse(cleaned);
    },
    
    // Strategy 3: Extract JSON object and parse
    () => {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON object found');
    },
    
    // Strategy 4: Fix common issues and parse
    () => {
      const fixed = fixCommonJSONIssues(rawText);
      return JSON.parse(fixed);
    },
    
    // Strategy 5: Extract JSON and fix issues
    () => {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const fixed = fixCommonJSONIssues(jsonMatch[0]);
        return JSON.parse(fixed);
      }
      throw new Error('No JSON object found after fixing');
    },
  ];
  
  // Try each strategy
  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      // console.log(`${context}: Successfully parsed using strategy ${i + 1}`);
      return result as T;
    } catch (error: any) {
      if (i === strategies.length - 1) {
        // Last strategy failed, log the error with context
        console.error(`${context}: All parsing strategies failed`);
        console.error(`${context}: Original text (first 500 chars):`, rawText.substring(0, 500));
        console.error(`${context}: Parse error:`, error.message);
      }
    }
  }
  
  // All strategies failed, return default
  console.warn(`${context}: Using default value after all parsing strategies failed`);
  return defaultValue;
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

    const systemMessage =
      'You are a professional resume and job description analyst. Analyze job descriptions to determine seniority, extract categorized keywords (including architecture concepts, operational responsibilities, and concrete technologies), and identify themes and values. Prioritize hiring-signal terms over generic language.';

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

**IMPORTANT: Technical terms requirement split (mandatory):**
Extract ALL concrete technical terms into two arrays:
- "mustHaveTechnicalTerms": terms required/preferred as core requirements (e.g. "What we're looking for", "Requirements", "Required", responsibilities that imply required stack)
- "niceToHaveTechnicalTerms": terms explicitly listed as optional/bonus (e.g. "Nice to Have", "Preferred", "Plus")
Do not skip terms because they appear only once. Keep exact standard names (e.g. AWS, Azure, GCP, Docker, Kafka, RabbitMQ, JWT, OAuth2, PostgreSQL).

**Architecture & system design (must extract when the posting mentions them):**
Include multi-word phrases and concepts exactly as they appear or in standard form, e.g. distributed systems, microservices, service-oriented architecture, event-driven architecture, system design, scalability, high availability, resilience, fault tolerance, load balancing, horizontal/vertical scaling, design patterns, SOLID principles, clean architecture, domain-driven design, DDD, CQRS, event sourcing, performance tuning, code quality. Place these in "methodologies" or "domainTerms" depending on whether they read as engineering practice vs system/domain emphasis.

**Operational & role responsibilities (must extract when the posting mentions them):**
Include phrases such as on-call rotation, incident response, production support, code reviews, peer reviews, mentoring, coaching, knowledge sharing, automated testing, test automation, stakeholder communication, cross-functional collaboration, technical roadmap, project ownership, technical leadership, architecture decisions. Place these primarily in "responsibilities"; use "qualifications" when framed as hard requirements.

**Technology stack clusters (capture the full picture):**
Extract related technologies as written: cloud platforms (AWS, GCP, Azure), containers and orchestration (Docker, Kubernetes), databases and stores (SQL, NoSQL, Redis, etc.), messaging and queues (Kafka, SQS, RabbitMQ, Pub/Sub), APIs (REST, GraphQL, OpenAPI), CI/CD and pipelines, monitoring/observability if named. Classify each concrete technology into "mustHaveTechnicalTerms" vs "niceToHaveTechnicalTerms" based on how the posting frames it; put tools/libraries in "toolsFrameworks" and process/architecture phrases in "methodologies" or "domainTerms" as appropriate.

**Named cloud providers (highest-priority mandatory rule):**
Run this check BEFORE all other keyword selection. If the job description names specific clouds (e.g. AWS, Amazon Web Services, Azure, Microsoft Azure, GCP, Google Cloud Platform, Oracle Cloud, DigitalOcean), you MUST include each named provider as its own keyword entry with the standard short form when possible (AWS, Azure, GCP), even if mentioned only once and even if listed under "nice to have". Do not omit them in favor of generic phrases like "cloud platforms" or "cloud experience" when concrete names appear in the text.

**Cloud extraction enforcement:**
- First pass: explicitly scan the full posting for cloud provider names and aliases.
- Normalize aliases to canonical short forms when standard (Amazon Web Services -> AWS, Microsoft Azure -> Azure, Google Cloud Platform -> GCP).
- Add each detected provider to output before adding generic cloud terms.
- Final validation before returning JSON: if any provider name/alias appears in the posting, the corresponding canonical provider keyword MUST appear in at least one output category.

**Quality rules:**
- Include important terms even if they appear only once (hiring signals beat raw frequency).
- Prefer concrete technologies and named practices over generic filler (avoid standalone words like "technical", "complex", "deep", "strong" unless part of a specific phrase).

Job Title: ${title}

Job Description:
${job}

IMPORTANT: Return only the keyword strings by category. Do not include counts. Backend logic will deterministically count occurrences and sort results.

Return the keywords in the following JSON format:
{
  "mustHaveTechnicalTerms": ["keyword1", "keyword2", ...],
  "niceToHaveTechnicalTerms": ["keyword1", "keyword2", ...],
  "toolsFrameworks": ["keyword1", "keyword2", ...],
  "methodologies": ["keyword1", "keyword2", ...],
  "domainTerms": ["keyword1", "keyword2", ...],
  "qualifications": ["keyword1", "keyword2", ...],
  "responsibilities": ["keyword1", "keyword2", ...]
}

Only include keywords that are relevant to a resume. Return ONLY valid JSON, no other text or explanations.`;

    // Third, extract themes and recommendations
    const themesPrompt = `Analyze the following job posting and identify:
1. The core themes and values emphasized 
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
  "summary": "One sentence explaining what this job emphasizes (e.g., 'This job emphasizes ownership and system design.').
              Use concrete themes that appear in the job description; avoid generic phrases unless the posting actually uses them."
}

Focus on actionable insights that tell the candidate what to emphasize in their resume. Return ONLY valid JSON, no other text or explanations.`;

    // console.log('Analyzing job description for seniority level, keywords, and themes');

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
        max_tokens: 900,
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

    // Get keywords and parse JSON with robust fallback
    const keywordsText = keywordsCompletion.choices[0].message.content;
    // console.log('Keywords text (first 500 chars):', keywordsText.substring(0, 500));
    
    console.log('Keywords text:', keywordsText);

    const defaultKeywords = {
      mustHaveTechnicalTerms: [],
      niceToHaveTechnicalTerms: [],
      toolsFrameworks: [],
      methodologies: [],
      domainTerms: [],
      qualifications: [],
      responsibilities: []
    };
    
    const categorizedKeywords = parseJSONWithFallback(
      keywordsText,
      defaultKeywords,
      'Keywords parsing'
    );
    
    // console.log('Categorized keywords:', categorizedKeywords);

    // Helper function to extract keyword string from either format (string or {keyword, count} object)
    const extractKeyword = (item: any): string => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && item.keyword) return item.keyword.trim();
      return '';
    };

    // Process each category - handle both old format (strings) and new format (objects with counts)
    const processCategory = (categoryArray: any[]): { keywords: string[], keywordsWithCounts: Array<{keyword: string, count: number}> } => {
      if (!Array.isArray(categoryArray)) {
        return { keywords: [], keywordsWithCounts: [] };
      }

      const keywords = categoryArray
        .map((item: any) => {
          const keyword = extractKeyword(item);
          if (!keyword) return null;
          return keyword;
        })
        .filter((item): item is string => item !== null);

      return {
        keywords,
        keywordsWithCounts: keywords.map((keyword) => ({ keyword, count: -1 }))
      };
    };

    const mustHaveTechnicalTerms = processCategory(categorizedKeywords.mustHaveTechnicalTerms).keywords;
    const niceToHaveTechnicalTerms = processCategory(categorizedKeywords.niceToHaveTechnicalTerms).keywords;
    const rawToolsFrameworks = processCategory(categorizedKeywords.toolsFrameworks).keywords;
    const rawMethodologies = processCategory(categorizedKeywords.methodologies).keywords;
    const rawDomainTerms = processCategory(categorizedKeywords.domainTerms).keywords;
    const rawQualifications = processCategory(categorizedKeywords.qualifications).keywords;
    const rawResponsibilities = processCategory(categorizedKeywords.responsibilities).keywords;

    // Process all categories (technical split only; no merged technicalSkills)
    const processedCategories = {
      mustHaveTechnicalTerms: processCategory(mustHaveTechnicalTerms),
      niceToHaveTechnicalTerms: processCategory(niceToHaveTechnicalTerms),
      toolsFrameworks: processCategory(rawToolsFrameworks),
      methodologies: processCategory(rawMethodologies),
      domainTerms: processCategory(rawDomainTerms),
      qualifications: processCategory(rawQualifications),
      responsibilities: processCategory(rawResponsibilities)
    };

    const rawKeywordsByCategory = {
      mustHaveTechnicalTerms,
      niceToHaveTechnicalTerms,
      toolsFrameworks: rawToolsFrameworks,
      methodologies: rawMethodologies,
      domainTerms: rawDomainTerms,
      qualifications: rawQualifications,
      responsibilities: rawResponsibilities,
    };

    const keywordsRaw = {
      mustHaveTechnicalTerms: processedCategories.mustHaveTechnicalTerms.keywords,
      niceToHaveTechnicalTerms: processedCategories.niceToHaveTechnicalTerms.keywords,
      toolsFrameworks: processedCategories.toolsFrameworks.keywords,
      methodologies: processedCategories.methodologies.keywords,
      domainTerms: processedCategories.domainTerms.keywords,
      qualifications: processedCategories.qualifications.keywords,
      responsibilities: processedCategories.responsibilities.keywords
    };

    const allKeywords = [
      ...keywordsRaw.mustHaveTechnicalTerms,
      ...keywordsRaw.niceToHaveTechnicalTerms,
      ...keywordsRaw.toolsFrameworks,
      ...keywordsRaw.methodologies,
      ...keywordsRaw.domainTerms,
      ...keywordsRaw.qualifications,
      ...keywordsRaw.responsibilities
    ];

    const qualityCandidates = allKeywords.map((keyword: string) => ({ keyword, aiCount: -1 }));

    const combinedTextLower = `${title} ${job}`.toLowerCase();

    const countKeywordOccurrences = (keyword: string): number => {
      const keywordLower = keyword.toLowerCase();
      const escapedKeyword = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const matches = combinedTextLower.match(regex);
      return matches ? matches.length : 0;
    };

    console.log('Keywords raw:', keywordsRaw);

    const keywordQuality = rankLLMKeywordCandidates(
      qualityCandidates,
      combinedTextLower,
      countKeywordOccurrences,
      {
        jobTitleLower: title.trim().toLowerCase(),
        mustHaveTechnicalTerms: keywordsRaw.mustHaveTechnicalTerms,
        qualifications: keywordsRaw.qualifications,
      }
    );

    const keywordsWithCounts: Array<{ keyword: string; count: number; weight: number }> =
      keywordQuality.keywordsWithCounts.map(({ keyword, count, displayScore }) => ({
        keyword,
        count,
        weight: displayScore,
      }));

    const sortedKeywords = keywordsWithCounts.map((item) => item.keyword);

    const keywordsByCategoryQuality = applyQualityToCategorizedKeywords(
      processedCategories,
      keywordQuality
    );

    const keywords = {
      mustHaveTechnicalTerms: keywordsByCategoryQuality.mustHaveTechnicalTerms,
      niceToHaveTechnicalTerms: keywordsByCategoryQuality.niceToHaveTechnicalTerms,
      toolsFrameworks: keywordsByCategoryQuality.toolsFrameworks,
      methodologies: keywordsByCategoryQuality.methodologies,
      domainTerms: keywordsByCategoryQuality.domainTerms,
      qualifications: keywordsByCategoryQuality.qualifications,
      responsibilities: keywordsByCategoryQuality.responsibilities,
    };

    // Parse themes data with robust fallback
    const themesText = themesCompletion.choices[0].message.content;
    // console.log('Themes text (first 500 chars):', themesText.substring(0, 500));
    
    const defaultThemes = {
      themes: [],
      recommendations: [],
      summary: ""
    };
    
    const themesData = parseJSONWithFallback(
      themesText,
      defaultThemes,
      'Themes parsing'
    );
    
    // console.log('Themes data:', themesData);

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

    // console.log('Job description analysis completed successfully. Tone:', tone, 'Total keywords:', allKeywords.length, 'Themes:', themes.themes.length);

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'job_analysis');

    return NextResponse.json({
      success: true,
      tone: tone,
      keywords: sortedKeywords,
      keywordsWithCounts: keywordsWithCounts,
      keywordsPrimary: keywordQuality.keywordsPrimary,
      keywordsSecondary: keywordQuality.keywordsSecondary,
      technicalTerms: {
        mustHave: mustHaveTechnicalTerms,
        niceToHave: niceToHaveTechnicalTerms,
      },
      keywordsByCategoryRaw: rawKeywordsByCategory,
      keywordsByCategory: keywords,
      themes: themes.themes,
      recommendations: themes.recommendations,
      summary: themes.summary
    });

  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI API errors
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

    // Check if it's a JSON parsing error (shouldn't happen with new fallback, but just in case)
    if (error.message && error.message.includes('JSON')) {
      console.error('JSON parsing error details:', {
        message: error.message,
        stack: error.stack
      });
      return NextResponse.json(
        { 
          error: 'Analysis Error',
          message: 'We encountered an issue processing the job description. Please try again with a slightly different description, or contact support if the problem persists.' 
        },
        { status: 500 }
      );
    }

    // Generic error response with user-friendly message
    return NextResponse.json(
      { 
        error: 'Analysis Error',
        message: 'We encountered an issue analyzing the job description. Please try again, or contact support if the problem persists.' 
      },
      { status: 500 }
    );
  }
}
