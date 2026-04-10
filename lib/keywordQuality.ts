/**
 * Deterministic keyword-quality layer for LLM-extracted JD keywords.
 * See IMPLEMENTATION_ANALYSIS.md — High Priority #4.
 *
 * Architecture / responsibility phrases and concept clusters default to
 * `lib/resumeScanner.ts` so scanner + JD analysis stay aligned.
 */

import {
  ARCHITECTURE_PHRASES,
  CONCEPT_CLUSTERS,
  RESPONSIBILITY_PHRASES,
} from './resumeScanner';

const W_OCCURRENCE = 0.5;
const HIGH_SIGNAL_BASE = 10;
const PHRASE_BONUS = 2;
const ARCHITECTURE_PHRASE_BONUS = 5;
const RESPONSIBILITY_PHRASE_BONUS = 4;
const CLUSTER_WEIGHT = 2;
const MIN_CLUSTER_TERMS_TO_FIRE = 2;
const PRIMARY_COUNT = 18;
const LONG_NON_SIGNAL_PHRASE_MIN_WORDS = 7;
/** Comma/semicolon list phrases with fewer total words than LONG_NON_SIGNAL (e.g. "Optimize …, …, and …"). */
const LONG_LIST_LIKE_MIN_WORDS = 4;
const SENTENCE_LIKE_PHRASE_MAX_SCORE = 8.5;
const REQUIRED_SECTION_MULTIPLIER = 1.5;
const NICE_TO_HAVE_SECTION_MULTIPLIER = 0.75;
const RESPONSIBILITIES_SECTION_MULTIPLIER = 1.0;
const OTHER_SECTION_MULTIPLIER = 1.0;
const MAX_CLUSTER_HIT_COUNT = 3;
/** Flat bonus when the keyword appears in the job title (API `title` field), after section weighting. */
const TITLE_KEYWORD_BONUS = 10;

/** Single-token JD filler: drop from output unless also high-signal dictionary. */
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

/** Hiring-signal terms: always retain and boost (curated; extend over time). */
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

function normalizeSignalToken(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

const HIGH_SIGNAL_KEYWORDS_NORMALIZED = new Set(
  [...HIGH_SIGNAL_KEYWORDS].map((k) => normalizeSignalToken(k))
);

export interface LLMKeywordCandidate {
  keyword: string;
  aiCount: number;
}

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

/** Optional overrides; defaults match `resumeScanner` exports. */
export interface RankLLMKeywordSignals {
  architecturePhrases?: string[];
  responsibilityPhrases?: string[];
  conceptClusters?: Record<string, string[]>;
  /**
   * Keywords excluded from both `keywordsPrimary` and `keywordsSecondary` (e.g. LLM
   * "responsibilities" category + JD-only responsibility phrases). They remain in
   * `keywordsWithCounts`. Matched case-insensitively; multi-word OK.
   */
  excludeFromPrimaryKeywords?: readonly string[];
  /**
   * Lowercased job title string only (not the full JD). Keywords whose text appears
   * in this string (word-boundary match) receive TITLE_KEYWORD_BONUS (+10).
   */
  jobTitleLower?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countPhraseOccurrences(text: string, phrase: string): number {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
  return (text.match(pattern) ?? []).length;
}

function canonicalizePhrase(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function splitNormalizedWords(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function getNormalizedWordCount(keywordLower: string): number {
  return splitNormalizedWords(keywordLower).length;
}

/** Long prose or comma-list bullets; drops duplicate noisy LLM lines. */
function isVerboseLongPhrase(keywordLower: string): boolean {
  if (!keywordLower.includes(' ')) return false;
  const wc = getNormalizedWordCount(keywordLower);
  if (wc >= LONG_NON_SIGNAL_PHRASE_MIN_WORDS) return true;
  return wc >= LONG_LIST_LIKE_MIN_WORDS && /[,;:]/.test(keywordLower);
}

function isSentenceLikePhrase(keywordLower: string): boolean {
  const words = splitNormalizedWords(keywordLower);
  const hasListPunctuation = /[,;:]/.test(keywordLower);
  const minWords = hasListPunctuation ? LONG_LIST_LIKE_MIN_WORDS : LONG_NON_SIGNAL_PHRASE_MIN_WORDS;
  if (words.length < minWords) return false;
  const stopwordLike = new Set([
    'and',
    'or',
    'with',
    'via',
    'using',
    'to',
    'for',
    'the',
    'a',
    'an',
    'of',
    'in',
  ]);
  const stopwordCount = words.filter((w) => stopwordLike.has(w)).length;
  return hasListPunctuation || stopwordCount >= 2;
}

function isListedPhrase(keywordLower: string, phrases: string[]): boolean {
  const k = canonicalizePhrase(keywordLower);
  return phrases.some((p) => canonicalizePhrase(p) === k);
}

type JDSectionSlices = {
  title: string;
  required: string;
  niceToHave: string;
  responsibilities: string;
  other: string;
};

function sliceByBounds(text: string, start: number, end: number): string {
  if (start < 0 || end <= start) return '';
  return text.slice(start, end);
}

function buildJDSectionSlices(combinedTextLower: string): JDSectionSlices {
  const text = combinedTextLower;
  const normalizeHeader = (s: string) => s.replace(/[’']/g, "'");

  const normalized = normalizeHeader(text);
  const idxLookingFor = normalized.search(/what we'?re looking for\s*:/i);
  const idxNice = normalized.search(/nice to have\s*:/i);
  const idxResponsibilities = normalized.search(/responsibilities\s*:/i);

  const firstSectionIndex = [idxLookingFor, idxNice, idxResponsibilities]
    .filter((n) => n >= 0)
    .sort((a, b) => a - b)[0] ?? text.length;

  const title = sliceByBounds(text, 0, firstSectionIndex);
  const requiredStart = idxLookingFor >= 0 ? idxLookingFor : firstSectionIndex;
  const requiredEnd = idxNice >= 0 ? idxNice : (idxResponsibilities >= 0 ? idxResponsibilities : text.length);
  const required = sliceByBounds(text, requiredStart, requiredEnd);
  const niceToHaveStart = idxNice >= 0 ? idxNice : -1;
  const niceToHaveEnd = idxResponsibilities >= 0 ? idxResponsibilities : text.length;
  const niceToHave = sliceByBounds(text, niceToHaveStart, niceToHaveEnd);
  const responsibilitiesStart = idxResponsibilities >= 0 ? idxResponsibilities : -1;
  const responsibilities = sliceByBounds(text, responsibilitiesStart, text.length);

  const consumedRanges: Array<[number, number]> = [];
  if (firstSectionIndex > 0) consumedRanges.push([0, firstSectionIndex]);
  if (requiredStart >= 0 && requiredEnd > requiredStart) consumedRanges.push([requiredStart, requiredEnd]);
  if (niceToHaveStart >= 0 && niceToHaveEnd > niceToHaveStart) consumedRanges.push([niceToHaveStart, niceToHaveEnd]);
  if (responsibilitiesStart >= 0) consumedRanges.push([responsibilitiesStart, text.length]);

  const other = consumedRanges
    .sort((a, b) => a[0] - b[0])
    .reduce<{ pos: number; chunks: string[] }>((acc, [start, end]) => {
      if (start > acc.pos) acc.chunks.push(text.slice(acc.pos, start));
      acc.pos = Math.max(acc.pos, end);
      return acc;
    }, { pos: 0, chunks: [] });

  if (other.pos < text.length) other.chunks.push(text.slice(other.pos));

  return {
    title,
    required,
    niceToHave,
    responsibilities,
    other: other.chunks.join(' '),
  };
}

function sectionMultiplierForKeyword(keyword: string, slices: JDSectionSlices): number {
  const titleCount = countPhraseOccurrences(slices.title, keyword);
  const requiredCount = countPhraseOccurrences(slices.required, keyword);
  const niceCount = countPhraseOccurrences(slices.niceToHave, keyword);
  const responsibilitiesCount = countPhraseOccurrences(slices.responsibilities, keyword);
  const otherCount = countPhraseOccurrences(slices.other, keyword);
  const total = titleCount + requiredCount + niceCount + responsibilitiesCount + otherCount;
  if (total === 0) return OTHER_SECTION_MULTIPLIER;

  const weighted =
    (titleCount + requiredCount) * REQUIRED_SECTION_MULTIPLIER +
    niceCount * NICE_TO_HAVE_SECTION_MULTIPLIER +
    responsibilitiesCount * RESPONSIBILITIES_SECTION_MULTIPLIER +
    otherCount * OTHER_SECTION_MULTIPLIER;

  return weighted / total;
}

export function detectClusterHits(
  textLower: string,
  clusters: Record<string, string[]> = CONCEPT_CLUSTERS
): Record<string, number> {
  const hits: Record<string, number> = {};

  for (const [clusterName, terms] of Object.entries(clusters)) {
    let uniqueMatches = 0;
    for (const term of terms) {
      const t = term.toLowerCase().trim();
      if (!t) continue;
      const hasMatch = t.includes(' ')
        ? countPhraseOccurrences(textLower, t) > 0
        : new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(textLower);
      if (hasMatch) uniqueMatches += 1;
    }
    if (uniqueMatches >= MIN_CLUSTER_TERMS_TO_FIRE) {
      hits[clusterName] = uniqueMatches;
    }
  }

  return hits;
}

function keywordClusterBoost(
  keywordLower: string,
  activeClusters: Record<string, number>,
  clusters: Record<string, string[]>
): number {
  const keywordNorm = normalizeSignalToken(keywordLower);
  let sum = 0;
  for (const [clusterName, terms] of Object.entries(clusters)) {
    const hit = activeClusters[clusterName] ?? 0;
    if (!hit) continue;
    const belongs = terms.some((term) => {
      const t = term.toLowerCase();
      const tNorm = normalizeSignalToken(t);
      if (!tNorm) return false;
      const useExactOnly = tNorm.length <= 3;
      return (
        keywordLower === t ||
        (!useExactOnly && keywordLower.includes(t)) ||
        (!useExactOnly && t.includes(keywordLower)) ||
        keywordNorm === tNorm ||
        (!useExactOnly && keywordNorm.includes(tNorm)) ||
        (!useExactOnly && tNorm.includes(keywordNorm))
      );
    });
    if (belongs) {
      sum += Math.min(hit, MAX_CLUSTER_HIT_COUNT) * CLUSTER_WEIGHT;
    }
  }
  return sum;
}

function isHighSignalKeyword(keywordLower: string): boolean {
  if (HIGH_SIGNAL_KEYWORDS.has(keywordLower)) return true;
  if (HIGH_SIGNAL_KEYWORDS_NORMALIZED.has(normalizeSignalToken(keywordLower))) return true;

  const parts = keywordLower.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.some(
      (p) =>
        HIGH_SIGNAL_KEYWORDS.has(p) ||
        HIGH_SIGNAL_KEYWORDS_NORMALIZED.has(normalizeSignalToken(p))
    );
  }
  return false;
}

function isStandaloneJunkToken(keywordLower: string): boolean {
  if (keywordLower.includes(' ')) return false;
  return GENERIC_JUNK_TOKENS.has(keywordLower);
}

/** JD boilerplate like "5+ years with Node.js" — redundant next to stack tokens; drop for UX. */
const YEARS_WITH_STACK_QUALIFICATION = /^\d+\+?\s*(?:past\s+)?years?\s+with\b/i;

function isYearsWithStackQualification(keywordLower: string): boolean {
  if (!keywordLower.includes(' ')) return false;
  return YEARS_WITH_STACK_QUALIFICATION.test(keywordLower.trim());
}

function computeDisplayScore(
  keywordLower: string,
  verifiedCount: number,
  activeClusters: Record<string, number>,
  clusters: Record<string, string[]>,
  architecturePhrases: string[],
  responsibilityPhrases: string[],
  sectionMultiplier: number,
  appearsInJobTitle: boolean
): { displayScore: number; drop: boolean } {
  const highSignal = isHighSignalKeyword(keywordLower);
  const junk = isStandaloneJunkToken(keywordLower);
  const phraseBonus = keywordLower.includes(' ') ? PHRASE_BONUS : 0;
  const clusterBoost = keywordClusterBoost(keywordLower, activeClusters, clusters);
  const archBoost = isListedPhrase(keywordLower, architecturePhrases) ? ARCHITECTURE_PHRASE_BONUS : 0;
  const respBoost = isListedPhrase(keywordLower, responsibilityPhrases) ? RESPONSIBILITY_PHRASE_BONUS : 0;
  const isLongPhrase = isVerboseLongPhrase(keywordLower);
  const sentenceLike = isSentenceLikePhrase(keywordLower);

  if (junk && !highSignal && archBoost === 0 && respBoost === 0) {
    return { displayScore: -1000, drop: true };
  }

  if (isYearsWithStackQualification(keywordLower)) {
    return { displayScore: -1000, drop: true };
  }

  // UX filter: drop verbose phrases (long + not high-signal) unless curated arch/resp.
  if (isLongPhrase && !highSignal && archBoost === 0 && respBoost === 0) {
    return { displayScore: -1000, drop: true };
  }

  // Drop long list-like / prose bullets even when they embed high-signal tokens (e.g. "Implement RESTful APIs, GraphQL endpoints, ...").
  if (sentenceLike && archBoost === 0 && respBoost === 0) {
    return { displayScore: -1000, drop: true };
  }

  const signalBoost = highSignal ? HIGH_SIGNAL_BASE : 0;
  const occ = Math.min(Math.max(verifiedCount, 0), 12);

  const rawDisplayScore =
    signalBoost +
    phraseBonus +
    archBoost +
    respBoost +
    clusterBoost +
    W_OCCURRENCE * occ;
  const sectionWeightedScore = rawDisplayScore * sectionMultiplier;
  const shouldCapSentenceLike = sentenceLike && archBoost === 0 && respBoost === 0;
  let displayScore = shouldCapSentenceLike
    ? Math.min(sectionWeightedScore, SENTENCE_LIKE_PHRASE_MAX_SCORE)
    : sectionWeightedScore;
  if (appearsInJobTitle) {
    displayScore += TITLE_KEYWORD_BONUS;
  }
  return { displayScore, drop: false };
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

/** Phrases from one canonical list that appear in the JD (used for arch vs resp separately). */
function extractPhraseListFromJD(textLower: string, phrases: string[]): LLMKeywordCandidate[] {
  const out: LLMKeywordCandidate[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const p = phrase.trim();
    if (!p) continue;
    const key = canonicalizePhrase(p);
    if (seen.has(key)) continue;
    const n = countPhraseOccurrences(textLower, key);
    if (n > 0) {
      seen.add(key);
      out.push({ keyword: p, aiCount: n });
    }
  }

  return out;
}

function buildExcludeFromTieredSet(
  signals: RankLLMKeywordSignals | undefined,
  jdResponsibilityPhrases: LLMKeywordCandidate[]
): Set<string> {
  const keys = new Set<string>();
  for (const k of signals?.excludeFromPrimaryKeywords ?? []) {
    keys.add(canonicalizePhrase(k));
  }
  for (const c of jdResponsibilityPhrases) {
    keys.add(canonicalizePhrase(c.keyword));
  }
  return keys;
}

function resolveSignals(signals?: RankLLMKeywordSignals): {
  architecturePhrases: string[];
  responsibilityPhrases: string[];
  conceptClusters: Record<string, string[]>;
} {
  return {
    architecturePhrases: signals?.architecturePhrases ?? ARCHITECTURE_PHRASES,
    responsibilityPhrases: signals?.responsibilityPhrases ?? RESPONSIBILITY_PHRASES,
    conceptClusters: signals?.conceptClusters ?? CONCEPT_CLUSTERS,
  };
}

export function rankLLMKeywordCandidates(
  candidates: LLMKeywordCandidate[],
  combinedTextLower: string,
  countInText: (keyword: string) => number,
  signals?: RankLLMKeywordSignals
): KeywordQualityResult {
  const { architecturePhrases, responsibilityPhrases, conceptClusters } = resolveSignals(signals);

  const jdArchitectureCandidates = extractPhraseListFromJD(combinedTextLower, architecturePhrases);
  const jdResponsibilityCandidates = extractPhraseListFromJD(combinedTextLower, responsibilityPhrases);
  const jdPhraseCandidates = [...jdArchitectureCandidates, ...jdResponsibilityCandidates];

  const merged = mergeCandidates([...candidates, ...jdPhraseCandidates]);
  const activeClusters = detectClusterHits(combinedTextLower, conceptClusters);
  const sections = buildJDSectionSlices(combinedTextLower);
  const jobTitleLower = signals?.jobTitleLower?.trim().toLowerCase() ?? '';

  const scored: RankedKeyword[] = [];
  const droppedKeywords: string[] = [];

  for (const c of merged) {
    const keyword = c.keyword.trim();
    const keyLower = keyword.toLowerCase();
    const serverCount = countInText(keyword);
    const ai = c.aiCount >= 0 ? c.aiCount : 0;
    const verifiedCount = Math.max(serverCount, ai);
    const sectionMultiplier = sectionMultiplierForKeyword(keyLower, sections);
    const appearsInJobTitle =
      jobTitleLower.length > 0 && countPhraseOccurrences(jobTitleLower, keyLower) > 0;

    const { displayScore, drop } = computeDisplayScore(
      keyLower,
      verifiedCount,
      activeClusters,
      conceptClusters,
      architecturePhrases,
      responsibilityPhrases,
      sectionMultiplier,
      appearsInJobTitle
    );
    if (drop) {
      droppedKeywords.push(keyword);
      continue;
    }

    scored.push({
      keyword,
      count: verifiedCount,
      displayScore,
    });
  }

  scored.sort((a, b) => {
    if (b.displayScore !== a.displayScore) return b.displayScore - a.displayScore;
    if (b.count !== a.count) return b.count - a.count;
    return a.keyword.localeCompare(b.keyword);
  });

  const excludeFromTiered = buildExcludeFromTieredSet(signals, jdResponsibilityCandidates);
  const tieredKeywords = scored.filter(
    (s) => !excludeFromTiered.has(canonicalizePhrase(s.keyword))
  );

  const keywordsPrimary = tieredKeywords.slice(0, PRIMARY_COUNT).map((k) => k.keyword);
  const keywordsSecondary = tieredKeywords.slice(PRIMARY_COUNT).map((k) => k.keyword);

  return {
    keywordsWithCounts: scored,
    keywordsPrimary,
    keywordsSecondary,
    droppedKeywords,
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
  const dropped = new Set(quality.droppedKeywords.map((k) => k.toLowerCase()));

  const sortCategory = (cat: ProcessedCategory): string[] => {
    const seen = new Set<string>();
    const list = cat.keywords.filter((kw) => {
      const kl = kw.toLowerCase();
      if (dropped.has(kl) || seen.has(kl)) return false;
      seen.add(kl);
      return rankMap.has(kl);
    });
    return list.sort((a, b) => {
      const sa = rankMap.get(a.toLowerCase())?.displayScore ?? 0;
      const sb = rankMap.get(b.toLowerCase())?.displayScore ?? 0;
      if (sb !== sa) return sb - sa;
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
