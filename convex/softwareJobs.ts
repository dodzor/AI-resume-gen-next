import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const MAX_PAGE_SIZE = 200;
const MAX_TEXT_BYTES = 800_000;
const PAGE_SIZE = 20;
const MAX_PAGE_SCAN = 4_000;
const SEARCH_LIMIT = 64;
const MAX_SEARCH_TERMS = 8;
const MAX_TERM_BYTES = 32;

function assertSyncSecret(secret: string) {
  const expected = process.env.SOFTWARE_JOB_SYNC_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Unauthorized software job sync");
  }
}

const softwareJobFields = {
  greenhouseId: v.number(),
  boardToken: v.string(),
  title: v.string(),
  companyName: v.string(),
  location: v.string(),
  url: v.string(),
  updatedAt: v.string(),
  text: v.string(),
  remote: v.boolean(),
  countries: v.array(v.string()),
};

function listing(job: Doc<"softwareJobs">, matchedInDescription = false) {
  return {
    id: job.greenhouseId,
    boardToken: job.boardToken,
    title: job.title,
    companyName: job.companyName,
    location: job.location,
    url: job.url,
    updatedAt: job.updatedAt,
    countries: job.countries ?? [],
    matchedInDescription,
  };
}

async function replaceCountryLinks(
  ctx: MutationCtx,
  jobId: Id<"softwareJobs">,
  remote: boolean,
  countries: string[],
) {
  const links = await ctx.db
    .query("softwareJobCountries")
    .withIndex("by_job", (q) => q.eq("jobId", jobId))
    .collect();
  for (const link of links) await ctx.db.delete(link._id);
  for (const country of countries) {
    await ctx.db.insert("softwareJobCountries", { jobId, country, remote });
  }
}

export const listSoftwareJobStamps = query({
  args: {
    secret: v.string(),
    cursor: v.union(v.string(), v.null()),
    numItems: v.number(),
  },
  handler: async (ctx, args) => {
    assertSyncSecret(args.secret);
    const numItems = Math.min(Math.max(Math.floor(args.numItems), 1), MAX_PAGE_SIZE);
    return await ctx.db.query("softwareJobs").paginate({
      numItems,
      cursor: args.cursor,
    });
  },
});

export const upsertSoftwareJobs = mutation({
  args: {
    secret: v.string(),
    jobs: v.array(v.object(softwareJobFields)),
  },
  handler: async (ctx, args) => {
    assertSyncSecret(args.secret);
    let upserted = 0;
    let skipped = 0;

    for (const job of args.jobs) {
      if (new TextEncoder().encode(job.text).length > MAX_TEXT_BYTES) {
        skipped += 1;
        continue;
      }

      const fields = {
        greenhouseId: job.greenhouseId,
        boardToken: job.boardToken,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        url: job.url,
        updatedAt: job.updatedAt,
        remote: job.remote,
        countries: job.countries,
      };
      const existing = await ctx.db
        .query("softwareJobs")
        .withIndex("by_url", (q) => q.eq("url", job.url))
        .unique();

      if (existing && existing.updatedAt === job.updatedAt) {
        skipped += 1;
        continue;
      }

      if (existing) {
        const description = await ctx.db.get(existing.descriptionId);
        if (description) {
          await ctx.db.patch(description._id, { text: job.text, remote: job.remote });
          await ctx.db.patch(existing._id, fields);
          await replaceCountryLinks(ctx, existing._id, job.remote, job.countries);
        } else {
          const descriptionId = await ctx.db.insert("softwareJobDescriptions", {
            text: job.text,
            remote: job.remote,
          });
          await ctx.db.patch(existing._id, { ...fields, descriptionId });
          await replaceCountryLinks(ctx, existing._id, job.remote, job.countries);
        }
      } else {
        const descriptionId = await ctx.db.insert("softwareJobDescriptions", {
          text: job.text,
          remote: job.remote,
        });
        const jobId = await ctx.db.insert("softwareJobs", { ...fields, descriptionId });
        await replaceCountryLinks(ctx, jobId, job.remote, job.countries);
      }
      upserted += 1;
    }

    return { upserted, skipped };
  },
});

export const patchSoftwareJobFacets = mutation({
  args: {
    secret: v.string(),
    jobs: v.array(
      v.object({
        url: v.string(),
        remote: v.boolean(),
        countries: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertSyncSecret(args.secret);
    let patched = 0;
    for (const job of args.jobs) {
      const existing = await ctx.db
        .query("softwareJobs")
        .withIndex("by_url", (q) => q.eq("url", job.url))
        .unique();
      if (!existing) continue;
      await ctx.db.patch(existing._id, { remote: job.remote, countries: job.countries });
      await ctx.db.patch(existing.descriptionId, { remote: job.remote });
      await replaceCountryLinks(ctx, existing._id, job.remote, job.countries);
      patched += 1;
    }
    return { patched };
  },
});

export const deleteSoftwareJobs = mutation({
  args: {
    secret: v.string(),
    ids: v.array(v.id("softwareJobs")),
  },
  handler: async (ctx, args) => {
    assertSyncSecret(args.secret);
    let deleted = 0;

    for (const id of args.ids) {
      const job = await ctx.db.get(id);
      if (!job) continue;
      const links = await ctx.db
        .query("softwareJobCountries")
        .withIndex("by_job", (q) => q.eq("jobId", id))
        .collect();
      for (const link of links) await ctx.db.delete(link._id);
      const description = await ctx.db.get(job.descriptionId);
      if (description) await ctx.db.delete(description._id);
      await ctx.db.delete(id);
      deleted += 1;
    }

    return { deleted };
  },
});

export const setSoftwareCatalog = mutation({
  args: {
    secret: v.string(),
    total: v.number(),
    remoteTotal: v.number(),
    countries: v.array(
      v.object({
        name: v.string(),
        count: v.number(),
        remoteCount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertSyncSecret(args.secret);
    const existing = await ctx.db.query("softwareCatalog").take(1);
    const fields = {
      total: args.total,
      remoteTotal: args.remoteTotal,
      countries: args.countries,
      updatedAt: Date.now(),
    };
    if (existing[0]) await ctx.db.replace(existing[0]._id, fields);
    else await ctx.db.insert("softwareCatalog", fields);
  },
});

export const getSoftwareCatalog = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("softwareCatalog").take(1);
    return existing[0] ?? null;
  },
});

export const scanSoftwareJobStats = query({
  args: {
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit), 1), 4_000);
    const result = await ctx.db.query("softwareJobs").paginate({ numItems: limit, cursor: args.cursor });
    let remote = 0;
    const countries = new Map<string, { count: number; remoteCount: number }>();
    for (const job of result.page) {
      const isRemote = job.remote === true;
      if (isRemote) remote += 1;
      for (const name of job.countries ?? []) {
        const current = countries.get(name) ?? { count: 0, remoteCount: 0 };
        current.count += 1;
        if (isRemote) current.remoteCount += 1;
        countries.set(name, current);
      }
    }
    return {
      scanned: result.page.length,
      remote,
      countries: [...countries.entries()].map(([name, counts]) => ({ name, ...counts })),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

type ScannedPage<T> = {
  page: T[];
  isDone: boolean;
  continueCursor: string;
};

async function readOffsetPage<T>(
  load: (cursor: string | null, numItems: number) => Promise<ScannedPage<T>>,
  present: (rows: T[]) => Promise<ReturnType<typeof listing>[]>,
  cursor: string | null,
  skip: number,
  numItems: number,
) {
  const requestedSkip = Math.max(0, skip);
  const pageSize = Math.max(0, numItems);
  const budget = Math.min(Math.max(requestedSkip + pageSize, 1), MAX_PAGE_SCAN);
  const result = await load(cursor, budget);
  const scanned = result.page.length;
  if (scanned < requestedSkip) {
    return { page: [], isDone: result.isDone, continueCursor: result.continueCursor, skipped: scanned, reached: false };
  }
  const pageEnd = requestedSkip + pageSize;
  if (pageEnd > budget && scanned >= budget && !result.isDone) {
    return { page: [], isDone: false, continueCursor: result.continueCursor, skipped: scanned, reached: false };
  }
  return {
    page: await present(result.page.slice(requestedSkip, pageEnd)),
    isDone: result.isDone,
    continueCursor: result.continueCursor,
    skipped: requestedSkip,
    reached: true,
  };
}

export const listSoftwareJobsPage = query({
  args: {
    cursor: v.union(v.string(), v.null()),
    skip: v.optional(v.number()),
    numItems: v.number(),
    remote: v.optional(v.boolean()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const numItems = Math.min(Math.max(Math.floor(args.numItems), 0), PAGE_SIZE);
    const skip = Math.max(0, Math.floor(args.skip ?? 0));
    if (args.country) {
      const countryQuery = () =>
        ctx.db
          .query("softwareJobCountries")
          .withIndex("by_country_remote", (q) =>
            args.remote ? q.eq("country", args.country!).eq("remote", true) : q.eq("country", args.country!),
          );
      return await readOffsetPage(
        (cursor, count) => countryQuery().paginate({ numItems: count, cursor }),
        async (links) => {
          const page = [];
          for (const link of links) {
            const job = await ctx.db.get(link.jobId);
            if (job) page.push(listing(job));
          }
          return page;
        },
        args.cursor,
        skip,
        numItems,
      );
    }

    const jobsQuery = () =>
      args.remote
        ? ctx.db.query("softwareJobs").withIndex("by_remote", (q) => q.eq("remote", true))
        : ctx.db.query("softwareJobs");
    return await readOffsetPage(
      (cursor, count) => jobsQuery().paginate({ numItems: count, cursor }),
      async (jobs) => jobs.map((job) => listing(job)),
      args.cursor,
      skip,
      numItems,
    );
  },
});

type SearchMatch = {
  job: Doc<"softwareJobs">;
  titleHit: boolean;
  descriptionHit: boolean;
  hits: number;
  queryHit: boolean;
};

async function addTitleHits(ctx: QueryCtx, text: string, remote: boolean, matches: Map<string, SearchMatch>) {
  const rows = await ctx.db
    .query("softwareJobs")
    .withSearchIndex("search_title", (q) =>
      remote ? q.search("title", text).eq("remote", true) : q.search("title", text),
    )
    .take(SEARCH_LIMIT);
  for (const job of rows) {
    const existing = matches.get(job.url);
    if (existing) {
      existing.titleHit = true;
      existing.hits += 1;
    } else {
      matches.set(job.url, { job, titleHit: true, descriptionHit: false, hits: 1, queryHit: false });
    }
  }
  return rows.length === SEARCH_LIMIT;
}

async function addDescriptionHits(ctx: QueryCtx, text: string, remote: boolean, matches: Map<string, SearchMatch>) {
  const rows = await ctx.db
    .query("softwareJobDescriptions")
    .withSearchIndex("search_text", (q) =>
      remote ? q.search("text", text).eq("remote", true) : q.search("text", text),
    )
    .take(SEARCH_LIMIT);
  for (const description of rows) {
    const job = await ctx.db
      .query("softwareJobs")
      .withIndex("by_description", (q) => q.eq("descriptionId", description._id))
      .unique();
    if (!job || (remote && job.remote !== true)) continue;
    const existing = matches.get(job.url);
    if (existing) {
      existing.descriptionHit = true;
      existing.hits += 1;
    } else {
      matches.set(job.url, { job, titleHit: false, descriptionHit: true, hits: 1, queryHit: false });
    }
  }
  return rows.length === SEARCH_LIMIT;
}

export const searchSoftwareJobs = query({
  args: {
    query: v.optional(v.string()),
    terms: v.array(v.string()),
    remote: v.optional(v.boolean()),
    country: v.optional(v.string()),
    page: v.number(),
  },
  handler: async (ctx, args) => {
    const remote = args.remote === true;
    const queryText = (args.query ?? "").trim().slice(0, 80);
    const terms = [];
    const seen = new Set<string>();
    for (const term of args.terms) {
      const trimmed = term.trim().toLowerCase();
      if (!trimmed || trimmed.length > MAX_TERM_BYTES || seen.has(trimmed)) continue;
      seen.add(trimmed);
      terms.push(trimmed);
      if (terms.length === MAX_SEARCH_TERMS) break;
    }
    const matches = new Map<string, SearchMatch>();
    let capped = false;

    if (queryText) {
      const titleCapped = await addTitleHits(ctx, queryText, remote, matches);
      const descriptionCapped = await addDescriptionHits(ctx, queryText, remote, matches);
      capped = titleCapped || descriptionCapped;
      for (const match of matches.values()) match.queryHit = true;
    }

    for (const term of terms) {
      const before = new Set(matches.keys());
      const titleCapped = await addTitleHits(ctx, term, remote, matches);
      const descriptionCapped = await addDescriptionHits(ctx, term, remote, matches);
      capped = capped || titleCapped || descriptionCapped;
      if (queryText) {
        for (const [url, match] of matches) {
          if (!before.has(url) && !match.queryHit) matches.delete(url);
        }
      }
    }

    let ranked = [...matches.values()];
    if (args.country) {
      ranked = ranked.filter((match) => (match.job.countries ?? []).includes(args.country!));
    }
    ranked.sort((left, right) => {
      if (left.titleHit !== right.titleHit) return left.titleHit ? -1 : 1;
      return right.hits - left.hits;
    });

    const page = Math.max(1, Math.floor(args.page) || 1);
    const start = (page - 1) * PAGE_SIZE;
    const companies = new Set(ranked.map((match) => match.job.companyName));
    return {
      page: ranked.slice(start, start + PAGE_SIZE).map((match) =>
        listing(match.job, match.descriptionHit && !match.titleHit),
      ),
      total: ranked.length,
      capped,
      companyCount: companies.size,
      isDone: start + PAGE_SIZE >= ranked.length,
    };
  },
});
