type KeywordCategory = 'technology' | 'architecture' | 'responsibility' | 'general';
type KeywordTier = 'mustHave' | 'important' | 'secondary';

export interface WeightedKeyword {
  keyword: string;
  count: number;
  score: number;
  category: KeywordCategory;
  tier: KeywordTier;
}

const STOP_WORDS = new Set([
  'a','an','and','are','as','at','be','been','but','by','can','could','for',
  'from','had','has','have','having','if','in','into','is','it','its','of','on',
  'or','that','the','their','there','they','this','to','was','were','will','with',
  'you','your','our','us','who','what','when','where','how','why','than','then',

  // filler / fluff
  'also','must','should','may','might','etc',

  // job-description noise
  'role','job','position','company','environment','culture','opportunity',

  // experience fluff
  'experience','years','year','minimum','plus',

  // generic soft skills (low signal)
  'team','teams','work','working','collaborate','collaboration',
  'responsible','responsibilities','ability','strong','excellent',
  'preferred','knowledge','knowledgeable','technical','complex',
  'professional','passion','motivated','detail','oriented',

  // technical fluff
  'systems', 'design', 'development', 'engineering', 'architecture',
]);

const HIGH_VALUE_KEYWORDS = new Set([
  // languages / frameworks
  'php','laravel','symfony','javascript','typescript','node','nodejs', 'node.js', 'vue.js', 'vuejs', 'react', 'reactjs', 
  'angular', 'angularjs', 'next.js', 'nextjs', 'nuxt.js', 'nuxtjs', 'svelte', 'sveltejs', 'solid', 'solidjs', 'lit', 'litjs', 
  'preact', 'preactjs', 'ember', 'emberjs', 'backbone', 'backbonejs', 'knockout', 'knockoutjs', 'jquery', 'jqueryui', 
  'bootstrap', 'bootstrapjs', 'tailwind', 'tailwindcss', 'sass', 'scss', 'less', 'stylus', 'styluscss', 'postcss', 
  'postcsscss', 'css', 'html', 'html5', 'nest.js',
  // databases
  'mysql','postgresql','sql','nosql','redis','mongodb','elasticsearch',

  // cloud / infra
  'aws','gcp','azure','docker','kubernetes','terraform','ansible',

  // messaging
  'sqs','sns','pubsub','rabbitmq','kafka',

  // api
  'rest','graphql','api','apis','openapi', 

  // devops
  'ci','cd','cicd','github','gitlab','bitbucket','pipeline',

  // testing
  'phpunit','jest','testing','tdd','bdd',

  // misc backend
  'nginx','apache','linux','bash','queue','caching'
]);

export const ARCHITECTURE_PHRASES = [
  'distributed systems',
  'event driven architecture',
  'event-driven architecture',
  'service oriented architecture',
  'microservices architecture',
  'system design',
  'high level design',
  'low level design',
  'design patterns',
  'solid principles',
  'clean architecture',
  'domain driven design',
  'ddd',
  'cqrs',
  'event sourcing',
  'scalability',
  'high availability',
  'fault tolerance',
  'resilience',
  'performance tuning',
  'performance optimization',
  'load balancing',
  'horizontal scaling',
  'vertical scaling',
  'code quality',
  'technical design',
  'architecture review'
];

export const RESPONSIBILITY_PHRASES = [
  'code reviews',
  'peer reviews',
  'technical roadmap',
  'mentor mindset',
  'mentoring',
  'coaching',
  'knowledge sharing',
  'on call rotation',
  'incident response',
  'production support',
  'automated testing',
  'test automation',
  'stakeholder communication',
  'cross functional collaboration',
  'translate requirements',
  'translate business requirements',
  'leading projects',
  'project ownership',
  'delivery ownership',
  'decision making',
  'technical leadership',
  'architecture decisions'
];

export const CONCEPT_CLUSTERS = {
  architecture: [
    'architecture','architectures','design','designs','system','systems'
  ],

  scalability: [
    'scale','scales','scaling','highload','performance','performances','latency','latencies','throughput','throughputs'
  ],

  event_driven: [
    'event','events','kafka','rabbitmq','pubsub','queue','queues','stream','streams'
  ],

  cloud: [
    'aws','gcp','azure','cloud','clouds','infrastructure','infrastructures'
  ],

  devops: [
    'ci','cd','cicd','pipeline','pipelines','deployment','deployments','docker','kubernetes'
  ],

  data: [
    'database','databases','sql','nosql','redis','cache','caches','caching'
  ]
};

const SHORT_TECH_TERMS = new Set(['ai', 'ml', 'go', 'c', 'r']);
const MAX_KEYWORDS = 30;
const TOP_BUCKET_SIZE = 10;
const MIN_CLUSTER_TERMS_TO_FIRE = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countPhraseOccurrences(text: string, phrase: string): number {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
  return (text.match(pattern) ?? []).length;
}

function getCategory(keyword: string): KeywordCategory {
  if (HIGH_VALUE_KEYWORDS.has(keyword)) return 'technology';
  if (ARCHITECTURE_PHRASES.includes(keyword)) return 'architecture';
  if (RESPONSIBILITY_PHRASES.includes(keyword)) return 'responsibility';
  return 'general';
}

function detectClusterHits(text: string): Record<string, number> {
  const hits: Record<string, number> = {};

  for (const [clusterName, terms] of Object.entries(CONCEPT_CLUSTERS)) {
    let uniqueMatches = 0;

    for (const term of terms) {
      const normalizedTerm = term.toLowerCase().trim();
      if (!normalizedTerm) continue;

      const hasMatch = normalizedTerm.includes(' ')
        ? countPhraseOccurrences(text, normalizedTerm) > 0
        : new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i').test(text);

      if (hasMatch) uniqueMatches += 1;
    }

    if (uniqueMatches >= MIN_CLUSTER_TERMS_TO_FIRE) {
      hits[clusterName] = uniqueMatches;
    }
  }

  return hits;
}

function getKeywordClusters(keyword: string): string[] {
  const normalizedKeyword = keyword.toLowerCase();
  const clusters: string[] = [];

  for (const [clusterName, terms] of Object.entries(CONCEPT_CLUSTERS)) {
    const belongsToCluster = terms.some((term) => {
      const normalizedTerm = term.toLowerCase();
      return normalizedKeyword === normalizedTerm || normalizedKeyword.includes(normalizedTerm) || normalizedTerm.includes(normalizedKeyword);
    });

    if (belongsToCluster) {
      clusters.push(clusterName);
    }
  }

  return clusters;
}

function getWeightedScore(
  keyword: string,
  count: number,
  category: KeywordCategory,
  activeClusterHits: Record<string, number>
): number {
  const frequencyWeight = count;
  const techBoost = HIGH_VALUE_KEYWORDS.has(keyword) || category === 'technology' ? 6 : 0;
  const architectureBoost = category === 'architecture' ? 5 : 0;
  const responsibilityBoost = category === 'responsibility' ? 4 : 0;
  const phraseBoost = keyword.includes(' ') ? 2 : 0;
  const clusterBoost = getKeywordClusters(keyword).reduce((sum, clusterName) => {
    const clusterHitCount = activeClusterHits[clusterName] ?? 0;
    if (!clusterHitCount) return sum;
    return sum + Math.min(clusterHitCount, 4);
  }, 0);

  return frequencyWeight + techBoost + architectureBoost + responsibilityBoost + phraseBoost + clusterBoost;
}

function getTier(score: number): KeywordTier {
  if (score >= 8) return 'mustHave';
  if (score >= 5) return 'important';
  return 'secondary';
}

export function extractKeywords(jobDescription: string): WeightedKeyword[] {
  const normalizedJobDescription = jobDescription.toLowerCase();
  const activeClusterHits = detectClusterHits(normalizedJobDescription);
  const matches = normalizedJobDescription.match(/[a-zA-Z][a-zA-Z0-9+#.\-/]{1,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const rawToken of matches) {
    const normalized = rawToken.trim();
    if (!normalized) continue;
    if (normalized.length < 3 && !SHORT_TECH_TERMS.has(normalized)) continue;
    if (STOP_WORDS.has(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  for (const phrase of [...ARCHITECTURE_PHRASES, ...RESPONSIBILITY_PHRASES]) {
    const phraseCount = countPhraseOccurrences(normalizedJobDescription, phrase);
    if (phraseCount > 0) {
      counts.set(phrase, phraseCount);
    }
  }

  return [...counts.entries()]
    .map(([keyword, count]) => {
      const category = getCategory(keyword);
      const score = getWeightedScore(keyword, count, category, activeClusterHits);
      return {
        keyword,
        count,
        score,
        category,
        tier: getTier(score)
      };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, MAX_KEYWORDS);
}

export function scanResumeAgainstKeywords(
  resumeText: string,
  keywords: WeightedKeyword[]
) {
  const normalizedResume = resumeText.toLowerCase();
  const matchedKeywords: WeightedKeyword[] = [];
  const missingKeywords: WeightedKeyword[] = [];

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const keywordData of keywords) {
    const weight = Math.max(keywordData.score, 1);
    totalWeight += weight;

    const pattern = new RegExp(`\\b${escapeRegExp(keywordData.keyword)}\\b`, 'i');
    if (pattern.test(normalizedResume)) {
      matchedWeight += weight;
      matchedKeywords.push(keywordData);
    } else {
      missingKeywords.push(keywordData);
    }
  }

  const matchScore = totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100);
  const topKeywords = keywords.slice(0, TOP_BUCKET_SIZE);
  const coveredTop = topKeywords.filter((keywordData) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keywordData.keyword)}\\b`, 'i');
    return pattern.test(normalizedResume);
  }).length;

  const mustHaveKeywords = keywords.filter((item) => item.tier === 'mustHave');
  const importantKeywords = keywords.filter((item) => item.tier === 'important');
  const secondaryKeywords = keywords.filter((item) => item.tier === 'secondary');
  const missingMustHaveKeywords = missingKeywords.filter((item) => item.tier === 'mustHave');
  const insights = buildInsights(
    matchScore,
    missingKeywords,
    matchedKeywords,
    coveredTop,
    topKeywords.length,
    missingMustHaveKeywords
  );

  return {
    matchScore,
    missingKeywords,
    matchedKeywords,
    mustHaveKeywords,
    importantKeywords,
    secondaryKeywords,
    missingMustHaveKeywords,
    insights
  };
}

function buildInsights(
  score: number,
  missingKeywords: WeightedKeyword[],
  matchedKeywords: WeightedKeyword[],
  coveredTop: number,
  topKeywordCount: number,
  missingMustHaveKeywords: WeightedKeyword[]
): string[] {
  const insights: string[] = [];

  if (score < 40) {
    insights.push('Your resume does not yet align well with this role. Focus on adding role-specific language from the job post.');
  } else if (score < 70) {
    insights.push('Your resume shows partial alignment. Tightening your bullet language around high-value keywords should improve match quality.');
  } else {
    insights.push('Your resume is already strongly aligned with this role. Keep refining impact metrics and role-specific outcomes.');
  }

  if (missingMustHaveKeywords.length > 0) {
    const topMissingMustHave = missingMustHaveKeywords.slice(0, 3).map((item) => item.keyword).join(', ');
    insights.push(`Critical gap: you are missing core hiring-signal keywords like ${topMissingMustHave}. Prioritize these first.`);
  } else if (missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 3).map((item) => item.keyword).join(', ');
    insights.push(`Most important missing terms: ${topMissing}. Add these naturally in your summary, experience, or skills sections.`);
  }

  if (topKeywordCount > 0) {
    insights.push(`You cover ${coveredTop} of the top ${topKeywordCount} highest-priority keywords from this job description.`);
  }

  if (insights.length < 3 && matchedKeywords.length > 0) {
    const strongest = matchedKeywords.slice(0, 3).map((item) => item.keyword).join(', ');
    insights.push(`Strong alignment areas already present in your resume: ${strongest}.`);
  }

  return insights.slice(0, 3);
}
