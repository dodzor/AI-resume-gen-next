const WINDOW = 6
const EMPTY: readonly string[] = []

const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  "United States": [
    "united states of america",
    "united states",
    "usa",
    "us",
    "puerto rico",
    "new england",
    "nyc",
    "district of columbia",
    "alabama",
    "alaska",
    "arizona",
    "arkansas",
    "california",
    "colorado",
    "connecticut",
    "delaware",
    "florida",
    "georgia",
    "hawaii",
    "idaho",
    "illinois",
    "indiana",
    "iowa",
    "kansas",
    "kentucky",
    "louisiana",
    "maine",
    "maryland",
    "massachusetts",
    "michigan",
    "minnesota",
    "mississippi",
    "missouri",
    "montana",
    "nebraska",
    "nevada",
    "new hampshire",
    "new jersey",
    "new mexico",
    "new york",
    "north carolina",
    "north dakota",
    "ohio",
    "oklahoma",
    "oregon",
    "pennsylvania",
    "rhode island",
    "south carolina",
    "south dakota",
    "tennessee",
    "texas",
    "utah",
    "vermont",
    "virginia",
    "washington",
    "west virginia",
    "wisconsin",
    "wyoming",
    "ak",
    "az",
    "ar",
    "ca",
    "ct",
    "dc",
    "fl",
    "ga",
    "ia",
    "il",
    "ks",
    "ky",
    "ma",
    "md",
    "mi",
    "mn",
    "mo",
    "ms",
    "mt",
    "nc",
    "nd",
    "ne",
    "nh",
    "nj",
    "nm",
    "nv",
    "ny",
    "oh",
    "pa",
    "ri",
    "sc",
    "sd",
    "tn",
    "tx",
    "ut",
    "va",
    "vt",
    "wa",
    "wi",
    "wv",
    "wy",
  ],
  "United Kingdom": [
    "united kingdom",
    "great britain",
    "britain",
    "northern ireland",
    "england",
    "scotland",
    "wales",
    "uk",
    "gb",
  ],
  Ireland: ["republic of ireland", "ireland"],
  Canada: [
    "canada",
    "british columbia",
    "newfoundland and labrador",
    "prince edward island",
    "nova scotia",
    "new brunswick",
    "newfoundland",
    "ontario",
    "quebec",
    "alberta",
    "manitoba",
    "saskatchewan",
    "bc",
    "qc",
    "ab",
    "mb",
    "sk",
    "ns",
    "nb",
  ],
  Australia: [
    "australia",
    "new south wales",
    "western australia",
    "south australia",
    "australian capital territory",
    "queensland",
    "tasmania",
    "nsw",
    "qld",
    "vic",
    "tas",
    "act",
  ],
  "New Zealand": ["new zealand", "nz"],
  India: [
    "india",
    "andhra pradesh",
    "madhya pradesh",
    "uttar pradesh",
    "tamil nadu",
    "west bengal",
    "maharashtra",
    "karnataka",
    "telangana",
    "haryana",
    "gujarat",
    "rajasthan",
    "kerala",
    "punjab",
    "ind",
  ],
  Germany: ["germany", "deutschland", "schleswig holstein"],
  France: ["france"],
  Brazil: ["brazil", "brasil", "minas gerais", "rio de janeiro", "sao paulo"],
  Mexico: ["mexico"],
  Netherlands: ["netherlands", "holland"],
  Spain: ["spain", "espana"],
  Italy: ["italy", "italia"],
  Japan: ["japan", "jpn"],
  "South Korea": ["south korea", "republic of korea", "korea"],
  "North Korea": ["north korea"],
  China: ["china"],
  "Hong Kong": ["hong kong"],
  Taiwan: ["taiwan"],
  Singapore: ["singapore"],
  Malaysia: ["malaysia"],
  Indonesia: ["indonesia"],
  Philippines: ["philippines"],
  Thailand: ["thailand"],
  Vietnam: ["vietnam", "viet nam"],
  Cambodia: ["cambodia"],
  Laos: ["laos"],
  Myanmar: ["myanmar", "burma"],
  Bangladesh: ["bangladesh"],
  Pakistan: ["pakistan"],
  "Sri Lanka": ["sri lanka"],
  Nepal: ["nepal"],
  Portugal: ["portugal"],
  Belgium: ["belgium"],
  Switzerland: ["switzerland", "schweiz", "suisse"],
  Austria: ["austria"],
  Sweden: ["sweden"],
  Norway: ["norway"],
  Denmark: ["denmark"],
  Finland: ["finland"],
  Iceland: ["iceland"],
  Poland: ["poland"],
  "Czech Republic": ["czech republic", "czechia"],
  Slovakia: ["slovakia"],
  Hungary: ["hungary"],
  Romania: ["romania"],
  Bulgaria: ["bulgaria"],
  Greece: ["greece"],
  Turkey: ["turkey", "turkiye"],
  Ukraine: ["ukraine"],
  Serbia: ["serbia"],
  Croatia: ["croatia"],
  Slovenia: ["slovenia"],
  "Bosnia and Herzegovina": ["bosnia and herzegovina", "bosnia"],
  "North Macedonia": ["north macedonia", "macedonia"],
  Albania: ["albania"],
  Montenegro: ["montenegro"],
  Kosovo: ["kosovo"],
  Estonia: ["estonia"],
  Latvia: ["latvia"],
  Lithuania: ["lithuania"],
  Luxembourg: ["luxembourg"],
  Malta: ["malta"],
  Cyprus: ["cyprus"],
  Israel: ["israel"],
  "United Arab Emirates": ["united arab emirates", "uae"],
  "Saudi Arabia": ["saudi arabia", "king abdullah economic city"],
  Qatar: ["qatar"],
  Kuwait: ["kuwait"],
  Bahrain: ["bahrain"],
  Oman: ["oman"],
  Jordan: ["jordan"],
  Lebanon: ["lebanon"],
  Egypt: ["egypt"],
  Morocco: ["morocco"],
  Tunisia: ["tunisia"],
  Algeria: ["algeria"],
  "South Africa": ["south africa"],
  Nigeria: ["nigeria"],
  Kenya: ["kenya"],
  Ghana: ["ghana"],
  Ethiopia: ["ethiopia"],
  Tanzania: ["tanzania"],
  Uganda: ["uganda"],
  Rwanda: ["rwanda"],
  Senegal: ["senegal"],
  "Ivory Coast": ["ivory coast", "cote d ivoire"],
  Argentina: ["argentina"],
  Chile: ["chile"],
  Colombia: ["colombia"],
  Peru: ["peru"],
  Ecuador: ["ecuador"],
  Uruguay: ["uruguay"],
  Paraguay: ["paraguay"],
  Bolivia: ["bolivia"],
  Venezuela: ["venezuela"],
  "Costa Rica": ["costa rica"],
  Panama: ["panama"],
  Guatemala: ["guatemala"],
  "Dominican Republic": ["dominican republic"],
  Armenia: ["armenia"],
  Azerbaijan: ["azerbaijan"],
  Kazakhstan: ["kazakhstan"],
  Macau: ["macau", "macao"],
}

// These abbreviations are also ordinary words, so they only count when they
// lead a comma-separated segment ("Portland, OR", "Hyderabad, IN").
const SEGMENT_CODES = new Map<string, string>([
  ["al", "United States"],
  ["co", "United States"],
  ["de", "United States"],
  ["hi", "United States"],
  ["id", "United States"],
  ["in", "United States"],
  ["la", "United States"],
  ["me", "United States"],
  ["ok", "United States"],
  ["or", "United States"],
  ["on", "Canada"],
  ["es", "Spain"],
  ["sp", "Brazil"],
  ["mg", "Brazil"],
  ["rj", "Brazil"],
  ["pr", "Brazil"],
])

// IN is Indiana or India. DE is Delaware or Germany. A city decides first.
const DEFERRED_CODES = new Set(["in", "de"])

const CANADA_CODES = new Set(["on", "bc", "qc", "ab", "mb", "sk", "ns", "nb", "nl", "pe"])

const CITY_COUNTRIES: Record<string, readonly string[]> = {
  "United States": [
    "san francisco bay area",
    "san francisco",
    "new york city",
    "los angeles",
    "salt lake city",
    "kansas city",
    "san jose",
    "san diego",
    "san antonio",
    "palo alto",
    "mountain view",
    "sunnyvale",
    "cupertino",
    "santa monica",
    "redmond",
    "bellevue",
    "chicago",
    "austin",
    "boston",
    "seattle",
    "dallas",
    "houston",
    "miami",
    "atlanta",
    "denver",
    "phoenix",
    "philadelphia",
    "detroit",
    "minneapolis",
    "charlotte",
    "raleigh",
    "nashville",
    "las vegas",
    "orlando",
    "tampa",
    "pittsburgh",
    "columbus",
    "indianapolis",
    "cleveland",
    "cincinnati",
    "st louis",
    "saint louis",
    "baltimore",
    "sacramento",
    "jacksonville",
    "brooklyn",
    "manhattan",
    "portland",
    "irvine",
    "oakland",
    "berkeley",
    "pasadena",
    "foster city",
    "jersey city",
    "boca raton",
    "queens",
  ],
  "United Kingdom": [
    "london",
    "banbury",
    "manchester",
    "birmingham",
    "edinburgh",
    "glasgow",
    "bristol",
    "leeds",
    "liverpool",
    "cambridge",
    "oxford",
    "belfast",
    "cardiff",
  ],
  Ireland: ["dublin", "cork", "galway"],
  Canada: [
    "toronto",
    "montreal",
    "vancouver",
    "calgary",
    "ottawa",
    "edmonton",
    "waterloo",
    "mississauga",
    "kitchener",
  ],
  Australia: ["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra"],
  "New Zealand": ["auckland", "wellington", "christchurch"],
  India: [
    "bengaluru",
    "bangalore",
    "hyderabad",
    "gurugram",
    "gurgaon",
    "mumbai",
    "new delhi",
    "delhi",
    "noida",
    "pune",
    "chennai",
    "kolkata",
    "ahmedabad",
    "jaipur",
    "chandigarh",
    "mohali",
    "indore",
    "kochi",
    "thiruvananthapuram",
    "coimbatore",
    "lucknow",
    "nagpur",
  ],
  Germany: [
    "berlin",
    "karlsruhe",
    "munich",
    "hamburg",
    "frankfurt",
    "cologne",
    "koln",
    "stuttgart",
    "dusseldorf",
    "duesseldorf",
    "leipzig",
    "dresden",
    "dortmund",
    "essen",
    "nuremberg",
    "hannover",
  ],
  France: ["paris", "lyon", "marseille", "toulouse", "nice", "nantes", "grenoble"],
  Spain: ["madrid", "barcelona", "valencia", "seville", "sevilla", "bilbao", "malaga"],
  Italy: ["rome", "roma", "milan", "milano", "turin", "naples", "florence"],
  Netherlands: ["amsterdam", "rotterdam", "the hague", "utrecht", "eindhoven"],
  Portugal: ["lisbon", "lisboa", "porto"],
  Belgium: ["brussels", "bruxelles", "antwerp"],
  Switzerland: ["zurich", "geneva", "geneve", "basel", "bern"],
  Austria: ["vienna", "wien"],
  Sweden: ["stockholm", "gothenburg", "malmo"],
  Norway: ["oslo"],
  Denmark: ["copenhagen"],
  Finland: ["helsinki"],
  Poland: ["warsaw", "krakow", "wroclaw", "poznan", "gdansk"],
  "Czech Republic": ["prague", "brno"],
  Hungary: ["budapest"],
  Romania: ["bucharest"],
  Greece: ["athens"],
  Turkey: ["istanbul", "ankara"],
  Bulgaria: ["sofia"],
  Ukraine: ["kyiv", "lviv"],
  Serbia: ["belgrade"],
  Cyprus: ["nicosia"],
  Lithuania: ["vilnius"],
  Israel: ["tel aviv", "jerusalem", "herzliya"],
  "United Arab Emirates": ["dubai", "abu dhabi"],
  "Saudi Arabia": ["riyadh", "jeddah"],
  Qatar: ["doha"],
  Japan: ["tokyo", "osaka", "kyoto", "yokohama"],
  "South Korea": ["seoul", "busan"],
  China: ["shanghai", "beijing", "shenzhen", "guangzhou", "hangzhou"],
  Taiwan: ["taipei"],
  Malaysia: ["kuala lumpur"],
  Indonesia: ["jakarta"],
  Philippines: ["manila"],
  Thailand: ["bangkok"],
  Vietnam: ["ho chi minh city", "ho chi minh", "saigon", "hanoi"],
  Brazil: ["sao paulo", "brasilia", "belo horizonte", "curitiba", "recife", "barueri"],
  Mexico: ["mexico city", "guadalajara", "monterrey"],
  Argentina: ["buenos aires"],
  Chile: ["santiago"],
  Colombia: ["bogota", "medellin"],
  Peru: ["lima"],
  "South Africa": ["cape town", "johannesburg"],
  Kenya: ["nairobi"],
  Nigeria: ["lagos", "abuja"],
  Egypt: ["cairo"],
  Morocco: ["casablanca"],
}

const NOISE = new Set([
  "remote",
  "hybrid",
  "onsite",
  "site",
  "hq",
  "office",
  "only",
  "the",
  "based",
  "home",
  "worldwide",
  "flex",
  "flexible",
  "multiple",
  "locations",
  "location",
  "not",
  "listed",
  "anywhere",
  "global",
  "world",
  "wide",
  "preferred",
  "area",
  "areas",
  "region",
  "field",
  "within",
  "across",
  "near",
  "greater",
  "metro",
])

function buildLookup(groups: Record<string, readonly string[]>) {
  const lookup = new Map<string, string>()
  for (const [country, phrases] of Object.entries(groups)) {
    for (const phrase of phrases) {
      const existing = lookup.get(phrase)
      if (existing && existing !== country) {
        throw new Error(`Country phrase "${phrase}" maps to ${existing} and ${country}`)
      }
      lookup.set(phrase, country)
    }
  }
  return lookup
}

const PHRASE_LOOKUP = buildLookup(COUNTRY_ALIASES)
const CITY_LOOKUP = buildLookup(CITY_COUNTRIES)

const COUNTRY_NAMES = [...new Set(PHRASE_LOOKUP.values())].sort((a, b) => a.localeCompare(b))
const NAME_BY_SLUG = new Map(COUNTRY_NAMES.map((name) => [countrySlug(name), name]))
const NAME_BY_LOWER = new Map(COUNTRY_NAMES.map((name) => [name.toLowerCase(), name]))

const parsed = new Map<string, readonly string[]>()

export function countrySlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function countryFromParam(value: string | undefined) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return NAME_BY_SLUG.get(trimmed.toLowerCase()) ?? NAME_BY_LOWER.get(trimmed.toLowerCase())
}

export function countriesInLocation(location: string): readonly string[] {
  const cached = parsed.get(location)
  if (cached) return cached
  const countries = parseLocation(location)
  parsed.set(location, countries)
  return countries
}

export function locationMatchesCountry(location: string, country: string) {
  return countriesInLocation(location).includes(country)
}

function parseLocation(location: string): readonly string[] {
  if (!location || location === "Location not listed") return EMPTY
  const tokens = tokensOf(location)
  if (tokens.length === 0) return EMPTY
  const found = new Set<string>()
  collect(tokens, PHRASE_LOOKUP, found)
  const deferred = new Set<string>()
  addSegmentCodes(location, found, deferred)
  dropCanadaSuffixCa(location, found)
  if (found.has("Panama") && found.has("United States") && panamaIsOnlyPanamaCity(tokens)) {
    found.delete("Panama")
  }
  if (found.size === 0) collect(tokens, CITY_LOOKUP, found)
  if (found.size === 0) {
    for (const country of deferred) found.add(country)
  }
  if (found.size === 0) return EMPTY
  return [...found]
}

function tokensOf(value: string) {
  const folded = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([A-Za-z])\.(?=[A-Za-z])/g, "$1")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
  if (!folded) return []
  return folded.split(" ")
}

function collect(tokens: string[], lookup: Map<string, string>, found: Set<string>) {
  const used = new Array<boolean>(tokens.length)
  const max = Math.min(WINDOW, tokens.length)
  for (let length = max; length >= 1; length--) {
    for (let index = 0; index + length <= tokens.length; index++) {
      let blocked = false
      for (let cursor = index; cursor < index + length; cursor++) {
        if (used[cursor]) {
          blocked = true
          break
        }
      }
      if (blocked) continue
      const key = length === 1 ? tokens[index] : tokens.slice(index, index + length).join(" ")
      const country = lookup.get(key)
      if (!country) continue
      found.add(country)
      for (let cursor = index; cursor < index + length; cursor++) used[cursor] = true
    }
  }
}

function meaningfulTokens(tokens: string[]) {
  const words: string[] = []
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    if (/^\d+$/.test(token)) continue
    if (token === "on" && tokens[index + 1] === "site") {
      index += 1
      continue
    }
    if (NOISE.has(token)) continue
    words.push(token)
  }
  return words
}

function addSegmentCodes(location: string, found: Set<string>, deferred: Set<string>) {
  for (const part of location.split(/[,|;]/)) {
    const words = meaningfulTokens(tokensOf(part))
    const code = codeToken(words)
    if (!code) continue
    const country = SEGMENT_CODES.get(code)
    if (!country) continue
    if (DEFERRED_CODES.has(code)) deferred.add(country)
    else found.add(country)
  }
}

function codeToken(words: string[]) {
  if (words.length === 0) return undefined
  const [head, next] = words
  if ((head === "or" || head === "and") && next && SEGMENT_CODES.has(next)) return next
  if (SEGMENT_CODES.has(head) && (head !== "or" || words.length === 1)) return head
  const last = words[words.length - 1]
  if (words.length > 1 && last !== "or" && SEGMENT_CODES.has(last)) return last
  return undefined
}

function segmentIsCanada(part: string) {
  const words = meaningfulTokens(tokensOf(part))
  if (words.some((word) => word === "canada" || CANADA_CODES.has(word))) return true
  const found = new Set<string>()
  collect(tokensOf(part), PHRASE_LOOKUP, found)
  return found.has("Canada") && !found.has("United States")
}

// "Toronto, ON, CA" uses CA for Canada. "San Francisco, CA" stays the United States.
function dropCanadaSuffixCa(location: string, found: Set<string>) {
  if (!found.has("United States") || !found.has("Canada")) return
  const parts = location.split(/[,|;]/)
  let removed = false
  const kept: string[] = []
  for (let index = 0; index < parts.length; index++) {
    const words = meaningfulTokens(tokensOf(parts[index]))
    const canadaSuffix = words.length === 1 && words[0] === "ca" && index > 0 && segmentIsCanada(parts[index - 1])
    if (canadaSuffix) {
      removed = true
      continue
    }
    kept.push(...tokensOf(parts[index]))
  }
  if (!removed) return
  const retry = new Set<string>()
  collect(kept, PHRASE_LOOKUP, retry)
  if (!retry.has("United States")) found.delete("United States")
}

function panamaIsOnlyPanamaCity(tokens: string[]) {
  let panamaCity = false
  let barePanama = false
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] !== "panama") continue
    if (tokens[index + 1] === "city") panamaCity = true
    else barePanama = true
  }
  return panamaCity && !barePanama
}
