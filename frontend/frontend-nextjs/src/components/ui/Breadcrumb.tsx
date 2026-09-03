import Link from "next/link";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

/**
 * Visible breadcrumb navigation. Keep items in sync with the
 * BreadcrumbList JSON-LD emitted on the same page.
 */
export default function Breadcrumb({
  items,
  className = "",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-2">
              {isLast || !item.href ? (
                <span aria-current="page" className="text-black/40">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-black/50 transition-colors hover:text-black hover:opacity-70"
                >
                  {item.name}
                </Link>
              )}
              {!isLast && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3 w-3 text-black/30"
                  fill="none"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
