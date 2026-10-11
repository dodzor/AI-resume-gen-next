import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MAX_PAGE_SIZE = 200;
const MAX_TEXT_BYTES = 800_000;

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
};

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
          await ctx.db.patch(description._id, { text: job.text });
          await ctx.db.patch(existing._id, fields);
        } else {
          const descriptionId = await ctx.db.insert("softwareJobDescriptions", { text: job.text });
          await ctx.db.patch(existing._id, { ...fields, descriptionId });
        }
      } else {
        const descriptionId = await ctx.db.insert("softwareJobDescriptions", { text: job.text });
        await ctx.db.insert("softwareJobs", { ...fields, descriptionId });
      }
      upserted += 1;
    }

    return { upserted, skipped };
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
      const description = await ctx.db.get(job.descriptionId);
      if (description) await ctx.db.delete(description._id);
      await ctx.db.delete(id);
      deleted += 1;
    }

    return { deleted };
  },
});
