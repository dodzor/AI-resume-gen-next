const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "so", "as",
  "at", "by", "for", "from", "in", "into", "of", "on", "onto", "to", "with",
  "without", "about", "above", "after", "before", "between", "over", "under",
  "again", "further", "once", "here", "there", "when", "where", "why", "how",
  "all", "any", "both", "each", "few", "more", "most", "other", "some", "such",
  "no", "nor", "not", "only", "own", "same", "than", "too", "very",
  "can", "will", "just", "should", "now",
  "is", "are", "was", "were", "be", "been", "being", "am",
  "have", "has", "had", "having", "do", "does", "did", "doing",
  "this", "that", "these", "those", "it", "its", "we", "our", "ours", "you",
  "your", "yours", "they", "them", "their", "theirs", "he", "she", "his", "her",
  "what", "which", "who", "whom",
])

const EMPTY = new Uint32Array()
const MAX_TOKEN_LENGTH = 64

const INDEX_VERSION = 2
const ANCHOR_DF_RATIO = 0.03

export type SkillTerm = {
  term: string
  acronym: boolean
  fromRole?: boolean
}

export type JobSearchIndex = {
  jobCount: number
  postings: Map<string, Uint32Array>
  acronyms: Map<string, Uint32Array>
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (entity, digits: string) => {
      const code = Number(digits)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
    })
    .replace(/&#x([0-9a-f]+);/gi, (entity, digits: string) => {
      const code = parseInt(digits, 16)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
}

export function plainTextFromGreenhouseContent(content: string) {
  let text = content
  for (let pass = 0; pass < 2; pass++) text = decodeEntities(text)
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fold(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
}

function keepToken(token: string) {
  return token.length > 1 && token.length <= MAX_TOKEN_LENGTH && !STOPWORDS.has(token)
}

function isAcronym(raw: string) {
  let letters = 0
  for (const char of raw) {
    if (char >= "0" && char <= "9") continue
    if (char < "A" || char > "Z") return false
    letters += 1
  }
  return letters >= 2
}

export function tokenizeWithCase(text: string): SkillTerm[] {
  const matches = text.match(/[\p{L}\p{N}]+/gu)
  if (!matches) return []
  const tokens: SkillTerm[] = []
  for (const raw of matches) {
    const term = fold(raw).match(/[a-z0-9]+/g)?.join("") ?? ""
    if (!keepToken(term)) continue
    tokens.push({ term, acronym: isAcronym(raw) })
  }
  return tokens
}

export function tokenize(text: string) {
  return tokenizeWithCase(text).map((token) => token.term)
}

export function descriptionQueryTerms(query: string) {
  const terms: string[] = []
  const seen = new Set<string>()
  for (const token of tokenize(query)) {
    if (seen.has(token)) continue
    seen.add(token)
    terms.push(token)
  }
  return terms
}

function addPosting(lists: Map<string, number[]>, token: string, jobIndex: number) {
  const list = lists.get(token)
  if (list) list.push(jobIndex)
  else lists.set(token, [jobIndex])
}

function freezePostings(lists: Map<string, number[]>) {
  const postings = new Map<string, Uint32Array>()
  for (const [token, list] of lists) postings.set(token, Uint32Array.from(list))
  return postings
}

export function buildSearchPostings(texts: string[]) {
  const lists = new Map<string, number[]>()
  const acronymLists = new Map<string, number[]>()
  for (let jobIndex = 0; jobIndex < texts.length; jobIndex++) {
    const text = texts[jobIndex]
    texts[jobIndex] = ""
    const seen = new Set<string>()
    const seenAcronyms = new Set<string>()
    for (const token of tokenizeWithCase(text)) {
      if (!seen.has(token.term)) {
        seen.add(token.term)
        addPosting(lists, token.term, jobIndex)
      }
      if (!token.acronym || seenAcronyms.has(token.term)) continue
      seenAcronyms.add(token.term)
      addPosting(acronymLists, token.term, jobIndex)
    }
  }

  return { postings: freezePostings(lists), acronyms: freezePostings(acronymLists) }
}

function measureEntries(entries: [string, Uint32Array][]) {
  let size = 0
  const words = entries.map(([word, list]) => {
    const bytes = Buffer.from(word)
    size += 2 + bytes.length + 4 + list.byteLength
    return { bytes, list }
  })
  return { size, words }
}

function writeEntries(buffer: Buffer, offset: number, words: Array<{ bytes: Buffer; list: Uint32Array }>) {
  for (const { bytes, list } of words) {
    buffer.writeUInt16LE(bytes.length, offset)
    offset += 2
    bytes.copy(buffer, offset)
    offset += bytes.length
    buffer.writeUInt32LE(list.length, offset)
    offset += 4
    Buffer.from(list.buffer, list.byteOffset, list.byteLength).copy(buffer, offset)
    offset += list.byteLength
  }
  return offset
}

export function encodeSearchIndex(
  jobCount: number,
  postings: Map<string, Uint32Array>,
  acronyms: Map<string, Uint32Array> = new Map(),
) {
  const words = measureEntries([...postings.entries()])
  const acronymWords = measureEntries([...acronyms.entries()])
  const size = 16 + words.size + 4 + acronymWords.size
  const buffer = Buffer.allocUnsafe(size)
  buffer.write("GHJS", 0, "utf8")
  buffer.writeUInt32LE(INDEX_VERSION, 4)
  buffer.writeUInt32LE(jobCount, 8)
  buffer.writeUInt32LE(postings.size, 12)
  let offset = writeEntries(buffer, 16, words.words)
  buffer.writeUInt32LE(acronyms.size, offset)
  offset += 4
  offset = writeEntries(buffer, offset, acronymWords.words)
  if (offset !== size) throw new Error("Search index size mismatch")
  return buffer
}

function readPostings(buffer: Buffer, offset: number, tokenCount: number) {
  const postings = new Map<string, Uint32Array>()
  for (let index = 0; index < tokenCount; index++) {
    if (offset + 2 > buffer.length) return null
    const wordLength = buffer.readUInt16LE(offset)
    offset += 2
    if (offset + wordLength + 4 > buffer.length) return null
    const word = buffer.toString("utf8", offset, offset + wordLength)
    offset += wordLength
    const count = buffer.readUInt32LE(offset)
    offset += 4
    const byteLength = count * 4
    if (offset + byteLength > buffer.length) return null
    const copy = Buffer.allocUnsafe(byteLength)
    buffer.copy(copy, 0, offset, offset + byteLength)
    postings.set(word, new Uint32Array(copy.buffer, copy.byteOffset, count))
    offset += byteLength
  }
  return { postings, offset }
}

export function decodeSearchIndex(buffer: Buffer): JobSearchIndex | null {
  if (buffer.length < 16 || buffer.toString("utf8", 0, 4) !== "GHJS") return null
  const version = buffer.readUInt32LE(4)
  if (version !== 1 && version !== INDEX_VERSION) return null
  const jobCount = buffer.readUInt32LE(8)
  const tokenCount = buffer.readUInt32LE(12)
  const words = readPostings(buffer, 16, tokenCount)
  if (!words) return null
  if (version === 1) return { jobCount, postings: words.postings, acronyms: new Map() }

  if (words.offset + 4 > buffer.length) return null
  const acronymCount = buffer.readUInt32LE(words.offset)
  const acronyms = readPostings(buffer, words.offset + 4, acronymCount)
  if (!acronyms) return null
  return { jobCount, postings: words.postings, acronyms: acronyms.postings }
}

function intersectSorted(left: Uint32Array, right: Uint32Array) {
  const out: number[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      out.push(left[i])
      i += 1
      j += 1
    } else if (left[i] < right[j]) {
      i += 1
    } else {
      j += 1
    }
  }
  return Uint32Array.from(out)
}

function postingsForTerm(term: string, index: JobSearchIndex) {
  if (term.length <= 3) return index.postings.get(term) ?? EMPTY

  const hit = new Uint8Array(index.jobCount)
  let count = 0
  for (const [word, list] of index.postings) {
    if (!word.includes(term)) continue
    for (const id of list) {
      if (id >= index.jobCount || hit[id] === 1) continue
      hit[id] = 1
      count += 1
    }
  }

  const out = new Uint32Array(count)
  let written = 0
  for (let id = 0; id < hit.length; id++) {
    if (hit[id] === 1) out[written++] = id
  }
  return out
}

const TITLE_MATCH_WEIGHT = 3

function titleTermMatcher(term: string) {
  if (term.length <= 3) {
    const pattern = new RegExp(`\\b${term}\\b`, "i")
    return (title: string, _lower: string) => pattern.test(title)
  }
  return (_title: string, lower: string) => lower.includes(term)
}

function termWeight(term: string, jobCount: number, index: JobSearchIndex | null) {
  const df = index?.postings.get(term)?.length ?? 0
  const idf = Math.log((jobCount + 1) / (df + 1))
  return idf
}

function skillPostings(term: SkillTerm, index: JobSearchIndex) {
  if (term.acronym) {
    const acronyms = index.acronyms.get(term.term)
    if (acronyms && acronyms.length > 0) return acronyms
  }
  return index.postings.get(term.term)
}

export function resumeMatchPositions(
  titleRoles: string[][],
  skillTerms: SkillTerm[],
  titles: string[],
  index: JobSearchIndex | null,
) {
  const jobCount = titles.length
  if (jobCount === 0 || (titleRoles.length === 0 && skillTerms.length === 0)) return []

  const scores = new Float64Array(jobCount)
  const qualifies = new Uint8Array(jobCount)
  const anchorHits = new Uint8Array(jobCount)
  const titleMatched = new Uint8Array(jobCount)
  const usableIndex = index && index.jobCount === jobCount ? index : null
  const anchorLimit = Math.max(1, Math.floor(jobCount * ANCHOR_DF_RATIO))
  let anchorTerms = 0

  if (usableIndex) {
    const prepared: Array<{ list: Uint32Array; weight: number; anchor: boolean; fromRole: boolean; acronym: boolean }> = []
    for (const term of skillTerms) {
      const list = skillPostings(term, usableIndex)
      if (!list || list.length === 0) continue
      const anchor = list.length <= anchorLimit
      if (anchor) anchorTerms += 1
      prepared.push({
        list,
        weight: Math.log((jobCount + 1) / (list.length + 1)),
        anchor,
        fromRole: Boolean(term.fromRole),
        acronym: term.acronym,
      })
    }
    for (const item of prepared) {
      for (const id of item.list) {
        if (id >= jobCount) continue
        scores[id] += item.weight
        if (item.fromRole && (item.anchor || !item.acronym)) qualifies[id] = 1
        if (item.anchor && anchorHits[id] < 255) anchorHits[id] += 1
      }
    }
  }

  const minAnchors = anchorTerms >= 2 ? 2 : 1
  for (let id = 0; id < jobCount; id++) {
    if (anchorHits[id] >= minAnchors) qualifies[id] = 1
  }

  const lowers = titles.map((title) => title.toLowerCase())
  for (const role of titleRoles) {
    const matchers = role.map((term) => ({
      matches: titleTermMatcher(term),
      weight: TITLE_MATCH_WEIGHT * termWeight(term, jobCount, usableIndex),
    }))
    for (let id = 0; id < jobCount; id++) {
      let weight = 0
      let matched = true
      for (const matcher of matchers) {
        if (!matcher.matches(titles[id], lowers[id])) {
          matched = false
          break
        }
        weight += matcher.weight
      }
      if (!matched || weight <= 0) continue
      scores[id] += weight
      titleMatched[id] = 1
      qualifies[id] = 1
    }
  }

  const ranked: number[] = []
  for (let id = 0; id < jobCount; id++) {
    if (qualifies[id] === 1 && scores[id] > 0) ranked.push(id)
  }
  ranked.sort((left, right) => {
    const byTitle = titleMatched[right] - titleMatched[left]
    if (byTitle !== 0) return byTitle
    return scores[right] - scores[left] || left - right
  })
  return ranked
}

export function descriptionMatchPositions(query: string, index: JobSearchIndex) {
  const terms = descriptionQueryTerms(query)
  if (terms.length === 0 || index.jobCount === 0) return EMPTY

  let matched: Uint32Array | null = null
  const lists = terms
    .map((term) => postingsForTerm(term, index))
    .sort((left, right) => left.length - right.length)
  for (const list of lists) {
    matched = matched ? intersectSorted(matched, list) : list
    if (matched.length === 0) return EMPTY
  }
  return matched ?? EMPTY
}
