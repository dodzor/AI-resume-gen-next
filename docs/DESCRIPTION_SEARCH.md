# How description search works

The job cache stores title, company, location, and URL. It does not store the posting body. Greenhouse only includes that body when the board request asks for it, and at this size the text has to become an index during refresh. Scanning every description on each visit to `/discover` is the wrong shape.

The last refresh covered about 162,000 roles. A sample board with `?content=true` returns each posting's `content` as escaped HTML, about 7–12KB per role. Stored raw, that is on the order of 1GB. The listing cache is about 41MB, and `/discover` loads the whole job list even when nobody is searching.

## Build the index when the cache refreshes

`fetchBoard` in `lib/greenhouseJobs.ts` requests

`https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`

`plainTextFromGreenhouseContent` in `lib/jobSearch.ts` decodes the HTML entities, strips the tags, and collapses whitespace. That text is not stored on `GreenhouseJobListing`.

After `refreshGreenhouseJobs` writes `.cache/greenhouse-jobs.json`, it calls `writeSearchIndex`. That tokenizes each description and writes `.cache/greenhouse-job-search.bin`: a map from word to the positions of the jobs that contain it.

`tokenize` drops one-letter tokens and common words (`the`, `and`, `with`). A query token of three letters or fewer looks up that exact word, so `rn` matches `RN` and skips `learning`. A longer token unions every indexed word that contains it, so `engineer` still hits `engineering`, matching the title search. A multi-word query intersects those lists, so every word has to appear. `descriptionMatchPositions` does that lookup.

The last index was about 165,000 words and 223MB. It is built once per refresh and kept in memory by `loadJobSearchIndex`. Each search is an intersection of those lists.

## List title matches and description matches together

On `/discover`, a role is shown when the title matches or the description matches. Title matches come first, in cache order, then description-only matches. The category filter, chip counts, and pagination all use that combined list.

When a result matched only in the description, the row says "Matched in description". The title will not contain the words the person typed, so the row has to say why it is there.

If the index file is missing or older than the job cache, the page still searches titles and says that descriptions are still indexing. `fetchGreenhouseJobs` starts a refresh in that case. A refresh that returns fewer than 90% of the cached roles keeps the previous cache and waits 30 minutes before trying again.

## Why once per refresh is the right cost

A refresh runs at most every six hours, when the job cache is older than `CACHE_TTL_MS`. It requests all 4,966 boards with the description included, dedupes the roles, then builds the index. The last run finished in about three minutes. Almost all of that was the HTTP fetches. Tokenizing the descriptions and writing the index is a short step at the end.

After that, `/discover` does not read the descriptions. The index stays in memory, and the file is reread only when its timestamp changes. A search intersects posting lists.

Rebuilding that index on every search, or scanning 162,000 HTML bodies per query, would be the slow design. The waste in the current refresh is that it starts over: a job that did not change is downloaded, stripped, and reindexed with everything else. An incremental index would update only new and removed roles. That only matters for the six-hour refresh, not for someone typing a query.
