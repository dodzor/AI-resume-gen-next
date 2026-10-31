import Link from "next/link"

const control =
  "inline-flex h-11 items-center justify-center rounded-md border px-3 text-sm font-medium active:bg-muted sm:h-8 sm:px-2.5"
const idle = `${control} border-border text-foreground hover:bg-muted/60`
const current = `${control} min-w-8 border-blue-600 bg-blue-600 tabular-nums text-white`
const numberClass = `${control} min-w-8 border-border tabular-nums text-foreground hover:bg-muted/60`
const disabled = `${control} border-border text-muted-foreground opacity-40`

export function discoverPageItems(page: number, pageCount: number) {
  const wanted = new Set<number>([1, pageCount])
  for (let value = page - 2; value <= page + 2; value++) wanted.add(value)
  const pages = [...wanted].filter((value) => value >= 1 && value <= pageCount).sort((left, right) => left - right)
  const items: Array<number | "ellipsis"> = []
  for (const value of pages) {
    const previous = items[items.length - 1]
    if (typeof previous === "number" && value - previous > 1) items.push("ellipsis")
    items.push(value)
  }
  return items
}

export function DiscoverPagination({
  page,
  pageCount,
  hrefFor,
  className,
}: {
  page: number
  pageCount: number
  hrefFor: (page: number) => string
  className?: string
}) {
  if (pageCount <= 1) return null
  const items = discoverPageItems(page, pageCount)

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-1 ${className ?? ""}`}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={idle}>
          Previous
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          Previous
        </span>
      )}
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            className={item === page ? current : numberClass}
          >
            {item.toLocaleString()}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={idle}>
          Next
        </Link>
      ) : (
        <span className={disabled} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  )
}
