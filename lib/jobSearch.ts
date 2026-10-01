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

export type JobSearchIndex = {
  jobCount: number
  postings: Map<string, Uint32Array>
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

export function tokenize(text: string) {
  const matches = fold(text).match(/[a-z0-9]+/g)
  if (!matches) return []
  return matches.filter(keepToken)
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

export function buildSearchPostings(texts: string[]) {
  const lists = new Map<string, number[]>()
  for (let jobIndex = 0; jobIndex < texts.length; jobIndex++) {
    const text = texts[jobIndex]
    texts[jobIndex] = ""
    const seen = new Set<string>()
    for (const token of tokenize(text)) {
      if (seen.has(token)) continue
      seen.add(token)
      const list = lists.get(token)
      if (list) list.push(jobIndex)
      else lists.set(token, [jobIndex])
    }
  }

  const postings = new Map<string, Uint32Array>()
  for (const [token, list] of lists) postings.set(token, Uint32Array.from(list))
  return postings
}

export function encodeSearchIndex(jobCount: number, postings: Map<string, Uint32Array>) {
  const entries = [...postings.entries()]
  let size = 16
  const words = entries.map(([word, list]) => {
    const bytes = Buffer.from(word)
    size += 2 + bytes.length + 4 + list.byteLength
    return { bytes, list }
  })

  const buffer = Buffer.allocUnsafe(size)
  buffer.write("GHJS", 0, "utf8")
  buffer.writeUInt32LE(1, 4)
  buffer.writeUInt32LE(jobCount, 8)
  buffer.writeUInt32LE(entries.length, 12)
  let offset = 16
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
  if (offset !== size) throw new Error("Search index size mismatch")
  return buffer
}

export function decodeSearchIndex(buffer: Buffer): JobSearchIndex | null {
  if (buffer.length < 16 || buffer.toString("utf8", 0, 4) !== "GHJS") return null
  if (buffer.readUInt32LE(4) !== 1) return null
  const jobCount = buffer.readUInt32LE(8)
  const tokenCount = buffer.readUInt32LE(12)
  const postings = new Map<string, Uint32Array>()
  let offset = 16

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
    const list = new Uint32Array(copy.buffer, copy.byteOffset, count)
    postings.set(word, list)
    offset += byteLength
  }

  return { jobCount, postings }
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
