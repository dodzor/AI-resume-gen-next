# How `/discover` loads Greenhouse jobs

Greenhouse publishes each company’s jobs separately. There is no call that returns every open role, so the company list has to come from somewhere else. The roles themselves still come live from Greenhouse.

## One board per company

A Greenhouse careers page is a public JSON feed for that employer only:

`https://boards-api.greenhouse.io/v1/boards/{token}/jobs`

The token is the slug in the board URL. Stripe is `stripe`, so `job-boards.greenhouse.io/stripe` and the API path both use `stripe`. 143 Studios is `143studiosinc`. The token is often the company name in lowercase, but not always, and guessing it from the name fails often enough that you cannot discover companies by trying names.

Greenhouse’s own docs describe this as the feed for your company’s offices, departments, and published jobs. Reading it requires no API key. Asking `https://boards-api.greenhouse.io/v1/boards` for a list of every customer returns 404. The private Harvest API can see one employer’s recruiting data, and only with a key from that employer’s account. It is not a catalog of other companies.

So “all companies” means: know the tokens, then request each board and merge the results.

## Where the 4,966 tokens come from

Last Round AI published an [ATS company directory](https://r2.datahub.io/cmsfkkpze0002i804bnlm20wd/main/raw/ats-directory/README.md) under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). It maps 9,935 companies to the public board slug that serves their postings, across Greenhouse, Lever, and Ashby. They built it by calling those public APIs, not by logging into anyone’s hiring system. The Greenhouse slice is 4,966 companies, last confirmed between 12 July and 1 August 2026.

That file is a list of slugs, not a list of jobs. RoleMirror keeps only the Greenhouse slugs, in `lib/greenhouseBoards.json`. The first entries are `10alabs`, `10pearlsuk`, `10xgenomics`, `12twenty`, `143studiosinc`.

## What the page does with them

`/discover` does not call Greenhouse 4,966 times on every click. A refresh walks the slug list 16 boards at a time, keeps title, company, location, URL, and updated date, and writes the merged list to `.cache/greenhouse-jobs.json`. The page reads that cache for six hours, then refreshes it.

The latest refresh asked all 4,966 boards. **3,953** still had at least one open role, **162,456** roles in total. The other thousand or so answered with an error or an empty list: the board was removed, renamed, or had nothing published. Those companies are left out rather than shown as empty.

Two different ages are involved. The company list is a snapshot from August 2026, so an employer that started using Greenhouse after that is missing until the slug list is updated. The job rows are whatever those boards returned at the last refresh, which is current as of that run.
