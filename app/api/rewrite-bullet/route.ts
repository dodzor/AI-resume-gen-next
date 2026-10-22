import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAuth } from '@/lib/api-auth';
import { checkUsageLimit, incrementUsageAfterAction } from '@/lib/api-usage';
import { keywordMatchesTextLoose } from '@/lib/keywordQuality';
import {
  BANNED_PHRASES,
  findBannedPhrases,
  isDutyLine,
  parseModelJson,
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

    const systemMessage = 'You are a professional resume writer. You turn a rough bullet into one concrete line: action verb, what they did, how, and the result.';
    
    // Build themes instructions if available
    let themesInstructions = '';
    if (themes && Array.isArray(themes) && themes.length > 0 && recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      themesInstructions = `\n\nShape the line toward these themes when they fit the work:\n${themes.map((t: string) => `- ${t}`).join('\n')}\n${recommendations.map((r: string) => `- ${r}`).join('\n')}\n${thematicSummary ? `\nContext: ${thematicSummary}` : ''}`;
    }
    
    // Build seniority adjustment instructions based on tone
    let seniorityInstructions = '';
    if (tone) {
      seniorityInstructions = `Write at a ${tone} level. Match the verb and scope to that level.`;
    }
    
    const contextInfo = allBullets && allBullets.length > 0 
      ? `\n\nOther bullet points in this role for context:\n${allBullets.map((b: string, i: number) => `${i + 1}. ${b}`).join('\n')}`
      : '';

    // Prepare keywords information
    const keywordsInfo = keywords && Array.isArray(keywords) && keywords.length > 0
      ? `\n\nWork these job words into the line when they fit. Do not force a word that has nothing to do with the bullet:\n${keywords.map((k: string) => `- ${k}`).join('\n')}`
      : '';

    const prompt = `Read this one bullet. Return two different texts.

"message" is a short note to the candidate. Start with "The bullet states that". Say what the source already says. Then name how and result when they are missing, and mark each missing part as [X]. Do not include a rewritten bullet in the message.

"line" is one example resume bullet, a finished sentence: action verb, what they did, how, and the result. This example is shown separately and is the only text pasted into the bullet.
Example line: Implemented AWS deployment strategies for cloud infrastructure, enhancing the reliability and scalability of applications to support secure and efficient operations.

Also split the source into verb, did, how, and result. Set "already" to true only when the source already states that part, and copy the source wording. When the source does not state it, "text" is [X] and "already" is false.

Source bullet:
${bullet}
${role ? `Role: ${role}` : ''}
${company ? `Company: ${company}` : ''}${contextInfo}${keywordsInfo}

${themesInstructions}${seniorityInstructions ? '\n\n' + seniorityInstructions : ''}

Never use these stock phrases: ${BANNED_PHRASES.join(', ')}.
Return JSON only:
{"message":"","line":"","verb":{"text":"","already":true},"did":{"text":"","already":true},"how":{"text":"","already":false},"result":{"text":"","already":false},"isDuty":false,"factsUsed":["short quotes from the source"],"missing":["how","result"]}`;

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
      temperature: 0.7,
      response_format: { type: 'json_object' },
      max_tokens: 600
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
      message?: string
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
    const stripWrap = (value: unknown) => String(value || '')
      .replace(/^["']|["']$/g, '')
      .replace(/^```[\w]*\n?|\n?```$/g, '')
      .replace(/^[-*•]\s+/gm, '')
      .trim();
    const cleanRewrite = (value: unknown) => stripWrap(value).replace(/^\d+\.\s+/gm, '').replace(/\s+/g, ' ').trim();
    const cleanPart = (value: unknown) => cleanRewrite(value);
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
    const note = stripWrap(parsed.message);
    const rewrittenBullet = cleanRewrite(parsed.line);
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
      rewrittenBullet,
      message: note,
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
