/**
 * Keyword weighting for LLM JD output:
 * +1 per occurrence in the full posting (title + description),
 * +1 if listed under must-have technical terms,
 * +2 if listed under qualifications,
 * +5 if the term appears in the job title.
 */

const PRIMARY_KEYWORD_COUNT = 30;
const WEIGHT_MUST_HAVE_BONUS = 1;
const WEIGHT_QUALIFICATIONS_BONUS = 2;
const WEIGHT_TITLE_BONUS = 5;

export interface LLMKeywordCandidate {
  keyword: string;
  aiCount: number;
}

/** `count` = JD occurrences; `displayScore` = total weight (sort key). */
export interface RankedKeyword {
  keyword: string;
  count: number;
  displayScore: number;
}

export interface KeywordQualityResult {
  keywordsWithCounts: RankedKeyword[];
  keywordsPrimary: string[];
  keywordsSecondary: string[];
  droppedKeywords: string[];
}

export interface RankLLMKeywordSignals {
  architecturePhrases?: string[];
  responsibilityPhrases?: string[];
  conceptClusters?: Record<string, string[]>;
  excludeFromPrimaryKeywords?: readonly string[];
  /** Lowercased job title only; +WEIGHT_TITLE_BONUS when the keyword matches here. */
  jobTitleLower?: string;
  /** LLM must-have technical terms; +WEIGHT_MUST_HAVE_BONUS when the keyword is in this list. */
  mustHaveTechnicalTerms?: readonly string[];
  /** LLM qualifications category; +WEIGHT_QUALIFICATIONS_BONUS when the keyword is in this list. */
  qualifications?: readonly string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countOccurrencesInLower(textLower: string, keyword: string): number {
  const kw = keyword.trim();
  if (!kw || !textLower) return 0;
  const escaped = escapeRegExp(kw.toLowerCase());
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  return (textLower.match(regex) ?? []).length;
}

const KEYWORD_MATCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with',
  'implement', 'implemented', 'implementing',
  'build', 'built', 'building',
  'develop', 'developed', 'developing',
  'design', 'designed', 'designing',
  'create', 'created', 'creating',
  'optimize', 'optimized', 'optimizing',
  'integrate', 'integrated', 'integrating',
  'manage', 'managed', 'managing',
  'lead', 'led', 'leading',
  'support', 'supported', 'supporting',
]);

export function tokenizeForKeywordMatch(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/[\s/-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function isMeaningfulToken(token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return false;
  if (KEYWORD_MATCH_STOPWORDS.has(t)) return false;
  // drop very short alphabetic tokens; keep short tech tokens like c# / c++ by allowing non-alpha
  if (/^[a-z]+$/.test(t) && t.length <= 2) return false;
  return true;
}

export function keywordMatchesTextLoose(keyword: string, text: string): boolean {
  const kw = keyword.trim();
  const target = text.trim();
  if (!kw || !target) return false;

  const escaped = escapeRegExp(kw.toLowerCase());
  const exactRegex = new RegExp(`\\b${escaped}\\b`, 'i');
  if (exactRegex.test(target.toLowerCase())) return true;

  const keywordTokens = tokenizeForKeywordMatch(kw).filter(isMeaningfulToken);
  const textTokenSet = new Set(tokenizeForKeywordMatch(target).filter(isMeaningfulToken));
  if (!keywordTokens.length || !textTokenSet.size) return false;

  let overlapCount = 0;
  for (const token of keywordTokens) {
    if (textTokenSet.has(token)) {
      overlapCount += 1;
    }
  }

  const threshold = keywordTokens.length >= 2 ? 2 : 1;
  return overlapCount >= threshold;
}

function mergeCandidates(candidates: LLMKeywordCandidate[]): LLMKeywordCandidate[] {
  const map = new Map<string, LLMKeywordCandidate>();

  for (const c of candidates) {
    const raw = c.keyword.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { keyword: raw, aiCount: c.aiCount });
      continue;
    }
    let nextAi = prev.aiCount;
    if (c.aiCount >= 0 && prev.aiCount >= 0) {
      nextAi = Math.max(prev.aiCount, c.aiCount);
    } else if (c.aiCount >= 0) {
      nextAi = c.aiCount;
    } else if (prev.aiCount >= 0) {
      nextAi = prev.aiCount;
    } else {
      nextAi = -1;
    }
    map.set(key, { keyword: prev.keyword, aiCount: nextAi });
  }

  return [...map.values()];
}

/**
 * Dedupes candidates, computes weight (occurrences + must-have + qualifications + title bonuses), sorts by weight desc.
 * `combinedTextLower` is unused; occurrences come from `countInText` (caller should use title + JD).
 */
export function rankLLMKeywordCandidates(
  candidates: LLMKeywordCandidate[],
  _combinedTextLower: string,
  countInText: (keyword: string) => number,
  signals?: RankLLMKeywordSignals
): KeywordQualityResult {
  const merged = mergeCandidates(candidates);
  const mustHaveLower = new Set(
    (signals?.mustHaveTechnicalTerms ?? [])
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
  );
  const qualificationsLower = new Set(
    (signals?.qualifications ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean)
  );
  const titleLower = signals?.jobTitleLower?.trim().toLowerCase() ?? '';

  const rows: RankedKeyword[] = merged.map(({ keyword }) => {
    const keyLower = keyword.toLowerCase();
    const occ = countInText(keyword);
    const mustBonus = mustHaveLower.has(keyLower) ? WEIGHT_MUST_HAVE_BONUS : 0;
    const qualificationsBonus = qualificationsLower.has(keyLower)
      ? WEIGHT_QUALIFICATIONS_BONUS
      : 0;
    const titleBonus =
      titleLower.length > 0 && countOccurrencesInLower(titleLower, keyword) > 0
        ? WEIGHT_TITLE_BONUS
        : 0;
    const weight = occ + mustBonus + qualificationsBonus + titleBonus;
    return { keyword, count: occ, displayScore: weight };
  });

  rows.sort((a, b) => {
    if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
    if (b.count !== a.count) return b.count - a.count;
    return a.keyword.localeCompare(b.keyword);
  });

  const flat = rows.map((r) => r.keyword);
  return {
    keywordsWithCounts: rows,
    keywordsPrimary: flat.slice(0, PRIMARY_KEYWORD_COUNT),
    keywordsSecondary: flat.slice(PRIMARY_KEYWORD_COUNT),
    droppedKeywords: [],
  };
}

type ProcessedCategory = {
  keywords: string[];
  keywordsWithCounts: Array<{ keyword: string; count: number }>;
};

type ProcessedCategories = {
  mustHaveTechnicalTerms: ProcessedCategory;
  niceToHaveTechnicalTerms: ProcessedCategory;
  toolsFrameworks: ProcessedCategory;
  methodologies: ProcessedCategory;
  domainTerms: ProcessedCategory;
  qualifications: ProcessedCategory;
  responsibilities: ProcessedCategory;
};

/** Reorders each category by keyword weight (`displayScore`), descending. */
export function applyQualityToCategorizedKeywords(
  processedCategories: ProcessedCategories,
  quality: KeywordQualityResult
): {
  mustHaveTechnicalTerms: string[];
  niceToHaveTechnicalTerms: string[];
  toolsFrameworks: string[];
  methodologies: string[];
  domainTerms: string[];
  qualifications: string[];
  responsibilities: string[];
} {
  const rankMap = new Map(
    quality.keywordsWithCounts.map((k) => [k.keyword.toLowerCase(), k] as const)
  );

  const sortCategory = (cat: ProcessedCategory): string[] => {
    const seen = new Set<string>();
    const list = cat.keywords.filter((kw) => {
      const kl = kw.toLowerCase();
      if (seen.has(kl)) return false;
      seen.add(kl);
      return true;
    });
    return list.sort((a, b) => {
      const wa = rankMap.get(a.toLowerCase())?.displayScore ?? 0;
      const wb = rankMap.get(b.toLowerCase())?.displayScore ?? 0;
      if (wb !== wa) return wb - wa;
      return a.localeCompare(b);
    });
  };

  return {
    mustHaveTechnicalTerms: sortCategory(processedCategories.mustHaveTechnicalTerms),
    niceToHaveTechnicalTerms: sortCategory(processedCategories.niceToHaveTechnicalTerms),
    toolsFrameworks: sortCategory(processedCategories.toolsFrameworks),
    methodologies: sortCategory(processedCategories.methodologies),
    domainTerms: sortCategory(processedCategories.domainTerms),
    qualifications: sortCategory(processedCategories.qualifications),
    responsibilities: sortCategory(processedCategories.responsibilities),
  };
}

/*
 * -----------------------------------------------------------------------------
 * Legacy (removed): tuning consts — W_OCCURRENCE, HIGH_SIGNAL_BASE, PHRASE_BONUS,
 * ARCHITECTURE_PHRASE_BONUS, RESPONSIBILITY_PHRASE_BONUS, CLUSTER_WEIGHT,
 * MIN_CLUSTER_TERMS_TO_FIRE, PRIMARY_COUNT, LONG_NON_SIGNAL_PHRASE_MIN_WORDS,
 * LONG_LIST_LIKE_MIN_WORDS, SENTENCE_LIKE_PHRASE_MAX_SCORE, REQUIRED_SECTION_MULTIPLIER,
 * NICE_TO_HAVE_SECTION_MULTIPLIER, RESPONSIBILITIES_SECTION_MULTIPLIER,
 * OTHER_SECTION_MULTIPLIER, MAX_CLUSTER_HIT_COUNT, TITLE_KEYWORD_BONUS.
 *
 * Legacy (removed): GENERIC_JUNK_TOKENS — single-token JD filler dropped unless
 * high-signal / arch / resp phrase match.
 * -----------------------------------------------------------------------------
const GENERIC_JUNK_TOKENS = new Set([
  'technical',
  'complex',
  'deep',
  'strong',
  'excellent',
  'ability',
  'abilities',
  'experience',
  'experienced',
  'preferred',
  'knowledge',
  'knowledgeable',
  'professional',
  'passion',
  'motivated',
  'detail',
  'oriented',
  'team',
  'teams',
  'collaborate',
  'collaboration',
  'responsible',
  'responsibilities',
  'work',
  'working',
  'role',
  'job',
  'position',
  'skills',
  'skill',
  'systems',
  'design',
  'develop',
  'development',
  'engineering',
  'architecture',
  'global',
  'scale',
  'scaling',
  'ensure',
  'implement',
  'optimize',
  'integrate',
  'code quality',
  'scalability',
  '3+ years',
  '4+ years',
  '5+ years',
  '6+ years',
  '7+ years',
  '8+ years',
  '9+ years',
  '10+ years',
]);
 * -----------------------------------------------------------------------------
 * Legacy (removed): HIGH_SIGNAL_KEYWORDS — curated stack terms (boost / retain).
 * -----------------------------------------------------------------------------
const HIGH_SIGNAL_KEYWORDS = new Set([
  'php',
  'laravel',
  'symfony',
  'javascript',
  'typescript',
  'node',
  'nodejs',
  'node.js',
  'nest.js',
  'nestjs',
  'react',
  'reactjs',
  'vue',
  'vue.js',
  'vuejs',
  'angular',
  'next.js',
  'nextjs',
  'svelte',
  'mysql',
  'postgresql',
  'postgres',
  'sql',
  'nosql',
  'redis',
  'mongodb',
  'elasticsearch',
  'aws',
  'gcp',
  'azure',
  'docker',
  'kubernetes',
  'k8s',
  'terraform',
  'ansible',
  'sqs',
  'sns',
  'kafka',
  'rabbitmq',
  'pub/sub',
  'pubsub',
  'graphql',
  'rest',
  'restful',
  'openapi',
  'nginx',
  'linux',
  'bash',
  'phpunit',
  'jest',
  'mocha',
  'cicd',
  'ci/cd',
  'devops',
  'gitlab',
  'github',
  'git',
  'pipeline',
  'jwt',
  'oauth2',
  'solid',
  'ddd',
  'cqrs',
  'soa',
  'microservices',
  'apache',
]);
 * -----------------------------------------------------------------------------
 * Legacy (removed): method definitions (scoring / filtering / JD slicing). Previously
 * imported ARCHITECTURE_PHRASES, CONCEPT_CLUSTERS, RESPONSIBILITY_PHRASES from ./resumeScanner.
 *
 * function normalizeSignalToken(value: string): string
 * function escapeRegExp(value: string): string
 * function countPhraseOccurrences(text: string, phrase: string): number
 * function canonicalizePhrase(s: string): string
 * function splitNormalizedWords(value: string): string[]
 * function getNormalizedWordCount(keywordLower: string): number
 * function isVerboseLongPhrase(keywordLower: string): boolean
 * function isSentenceLikePhrase(keywordLower: string): boolean
 * function isListedPhrase(keywordLower: string, phrases: string[]): boolean
 * function sliceByBounds(text: string, start: number, end: number): string
 * function buildJDSectionSlices(combinedTextLower: string): JDSectionSlices
 * function sectionMultiplierForKeyword(keyword: string, slices: JDSectionSlices): number
 * export function detectClusterHits(textLower: string, clusters?: Record<string, string[]>): Record<string, number>
 * function keywordClusterBoost(...): number
 * function isHighSignalKeyword(keywordLower: string): boolean
 * function isStandaloneJunkToken(keywordLower: string): boolean
 * const YEARS_WITH_STACK_QUALIFICATION: RegExp
 * function isYearsWithStackQualification(keywordLower: string): boolean
 * function computeDisplayScore(...): { displayScore: number; drop: boolean }
 * function extractPhraseListFromJD(textLower: string, phrases: string[]): LLMKeywordCandidate[]
 * function buildExcludeFromTieredSet(signals?: RankLLMKeywordSignals, jdResponsibilityPhrases: LLMKeywordCandidate[]): Set<string>
 * function resolveSignals(signals?: RankLLMKeywordSignals): { architecturePhrases; responsibilityPhrases; conceptClusters }
 * -----------------------------------------------------------------------------
 */
