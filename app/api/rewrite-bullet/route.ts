import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { keywordMatchesTextLoose } from '@/lib/keywordQuality';
import {
  EVIDENCE_RULES,
  FIDELITY_TEMPERATURE,
  findBannedPhrases,
  isDutyLine,
  parseModelJson,
  scrubInventedClaims,
} from '@/lib/evidenceRules';

// Lazy-initialize OpenAI client to avoid build-time errors
function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function partAlreadyInBullet(part: string, bullet: string): boolean {
  const cleaned = part.replace(/\s+/g, ' ').trim();
  if (!cleaned || /^\[X\]$/i.test(cleaned)) return false;
  const bulletLower = bullet.toLowerCase();
  const partLower = cleaned.toLowerCase();
  if (bulletLower.includes(partLower)) return true;
  const words = partLower.split(/[^a-z0-9+]+/).filter((word) => word.length > 3);
  if (words.length === 0) return false;
  const hits = words.filter((word) => bulletLower.includes(word)).length;
  return hits / words.length >= 0.7;
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
    const usageCheck = await checkUsageLimit(userId, 'ai_rewrite');
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
    const { bullet, role, company, allBullets, keywords, tone, themes, recommendations, thematicSummary } = body;

    // Validate required fields
    if (!bullet || !bullet.trim()) {
      return NextResponse.json(
        { error: 'Missing required field: bullet' },
        { status: 400 }
      );
    }

    const systemMessage = `You are the interviewer and editor. You do not invent experience. ${EVIDENCE_RULES}`;
    
    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nTHEMES (ordering signals only): Put a theme first only when the source already shows it. Do not add work to cover a theme.\n${themes.map((t: string) => `- ${t}`).join('\n')}\nWhat the resume should show, if the source supports it:\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}`;
    }
    
    // Build seniority adjustment instructions based on tone
    let seniorityInstructions = '';
    if (tone) {
      seniorityInstructions = `SENIORITY SIGNAL: The posting reads as "${tone}". Use that only to choose which confirmed facts to emphasize. Do not change the candidate's title, headcount, budget, or scope.`;
    }
    
    const contextInfo = allBullets && allBullets.length > 0 
      ? `\n\nOther bullet points in this role for context:\n${allBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}`
      : '';

    // Prepare keywords information
    const keywordsInfo = keywords && Array.isArray(keywords) && keywords.length > 0
      ? `\n\nEmployer words the user has selected. Use one only if this bullet already describes that work:\n${keywords.map((k: string) => `- ${k}`).join('\n')}`
      : '';

    const prompt = `Read this one bullet. Do not write a resume. Do not add a metric, tool, method, scope, or outcome the source does not contain.

Split it into four slots, in this order:
1. verb — the action verb
2. did — what they did
3. how — how they did it
4. result — the result or impact

For each slot set "already" to true when the source bullet already states that part, and copy the source wording. Do not recommend a different wording for a part that is already there.
Set "already" to false only when the source bullet does not state that part. Then put a recommendation in "text" only if another provided fact supports it. Otherwise "text" is [X].

The line keeps every part that is already set, and adds only the parts that are not.

Source bullet:
${bullet}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}${contextInfo}${keywordsInfo}

${themesInstructions}${seniorityInstructions ? '\n\n' + seniorityInstructions : ''}

Return JSON only:
{"line":"","verb":{"text":"","already":true},"did":{"text":"","already":true},"how":{"text":"","already":false},"result":{"text":"","already":false},"isDuty":false,"factsUsed":["short quotes from the source"],"missing":["slot names whose text is [X]"]}`;

    console.log('Rewriting bullet point for:', role || 'Unknown role');

    const openai = getOpenAIClient();
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
      temperature: FIDELITY_TEMPERATURE,
      response_format: { type: 'json_object' },
      max_tokens: 400
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
    const raw = completion.choices[0].message.content.trim();
    let parsed: {
      line?: string
      verb?: string | { text?: string; already?: boolean }
      did?: string | { text?: string; already?: boolean }
      how?: string | { text?: string; already?: boolean }
      result?: string | { text?: string; already?: boolean }
      isDuty?: boolean
      factsUsed?: unknown
      missing?: unknown
    } = {};
    try {
      parsed = parseModelJson(raw);
    } catch {
      parsed = { line: raw };
    }
    const source = [bullet, role, company, ...(Array.isArray(keywords) ? keywords : [])].filter(Boolean).join('\n');
    const cleanPart = (value: unknown) => scrubInventedClaims(String(value || '').replace(/^[-*•]\s+/, '').trim(), source);
    const readSlot = (value: string | { text?: string; already?: boolean } | undefined) => {
      if (typeof value === 'string') return { text: cleanPart(value), already: false };
      return { text: cleanPart(value?.text), already: value?.already === true };
    };
    const verbSlot = readSlot(parsed.verb);
    const didSlot = readSlot(parsed.did);
    const howSlot = readSlot(parsed.how);
    const resultSlot = readSlot(parsed.result);
    const verb = verbSlot.text;
    const did = didSlot.text;
    const how = howSlot.text;
    const result = resultSlot.text;
    const alreadySet = (text: string, flagged: boolean) => {
      if (!text.trim() || /^\[X\]$/i.test(text.trim())) return false;
      return flagged || partAlreadyInBullet(text, bullet);
    };
    const verbSet = alreadySet(verb, verbSlot.already);
    const didSet = alreadySet(did, didSlot.already);
    const howSet = alreadySet(how, howSlot.already);
    const resultSet = alreadySet(result, resultSlot.already);
    const rewrittenBullet = cleanPart(parsed.line) || [verb, did, how, result].filter((part) => part.length > 0 && !/^\[X\]$/i.test(part)).join(' ');
    const factsUsed = Array.isArray(parsed.factsUsed)
      ? parsed.factsUsed.filter((fact): fact is string => typeof fact === 'string' && fact.trim().length > 0 && source.toLowerCase().includes(fact.toLowerCase().slice(0, Math.min(fact.length, 40))))
      : [];
    const duty = isDutyLine(bullet) || parsed.isDuty === true;

    // Detect which keywords were actually incorporated into the rewritten bullet
    const incorporatedKeywords: string[] = [];
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      keywords.forEach((keyword: string) => {
        if (keywordMatchesTextLoose(keyword, rewrittenBullet)) {
          incorporatedKeywords.push(keyword);
        }
      });
    }

    // Detect which themes were relevant (if themes were provided)
    const relevantThemes: string[] = [];
    if (themes && Array.isArray(themes) && themes.length > 0) {
      const rewrittenLower = rewrittenBullet.toLowerCase();
      themes.forEach((theme: string) => {
        const themeLower = theme.toLowerCase();
        // Check if theme-related terms appear in the rewritten bullet
        // This is a simple check - could be enhanced with semantic matching
        if (rewrittenLower.includes(themeLower) || 
            (themeLower.includes('ownership') && (rewrittenLower.includes('built') || rewrittenLower.includes('led') || rewrittenLower.includes('architected'))) ||
            (themeLower.includes('system design') && (rewrittenLower.includes('architecture') || rewrittenLower.includes('system') || rewrittenLower.includes('design'))) ||
            (themeLower.includes('mentorship') && (rewrittenLower.includes('mentor') || rewrittenLower.includes('team') || rewrittenLower.includes('lead')))) {
          relevantThemes.push(theme);
        }
      });
    }

    console.log('Bullet point rewritten successfully. Incorporated keywords:', incorporatedKeywords.length, 'Relevant themes:', relevantThemes.length);

    // 4. Increment usage AFTER successful operation
    await incrementUsageAfterAction(userId, 'ai_rewrite');

    return NextResponse.json({
      success: true,
      rewrittenBullet: rewrittenBullet,
      line: rewrittenBullet,
      verb,
      did,
      how,
      result,
      verbSet,
      didSet,
      howSet,
      resultSet,
      isDuty: duty,
      factsUsed,
      bannedPhrases: findBannedPhrases(rewrittenBullet),
      incorporatedKeywords: incorporatedKeywords,
      reasoning: {
        themes: relevantThemes,
        keywords: incorporatedKeywords,
        tone: tone || null,
        hasThemes: themes && themes.length > 0,
        hasKeywords: keywords && keywords.length > 0
      }
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
