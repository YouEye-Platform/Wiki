/**
 * Wiki Timeline Embed — Article Read Card
 *
 * Compact card rendered as iframe inside YE-UI timeline entries.
 * Fetches fresh data from Wikipedia API based on URL params.
 *
 * Query params:
 *   ?slug=Iron_Man   — Wikipedia article slug
 *   &lang=en         — Language (default: en)
 */

import { getArticleSummary, proxyImageUrl } from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";
import { BookOpen } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ slug?: string; lang?: string }>;
}

export default async function TimelineArticlePage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const { slug, lang = "en" } = params;

  if (!slug) {
    return <ErrorCard message="No article specified" />;
  }

  try {
    const decoded = decodeURIComponent(slug);
    const session = await getSession("ye-wiki").catch(() => null);
    const summary = await getArticleSummary(decoded, lang, session?.userId);
    const appBase = process.env.APP_BASE_URL ?? "";
    const thumbnail = summary.thumbnail
      ? proxyImageUrl(summary.thumbnail.source, appBase)
      : null;
    const title =
      (summary.displaytitle ?? summary.title ?? decoded)
        .replace(/<[^>]*>/g, "")
        .replace(/_/g, " ");
    const excerpt = summary.extract
      ? summary.extract.slice(0, 140) +
        (summary.extract.length > 140 ? "..." : "")
      : null;

    const wikiUrl = appBase
      ? `${appBase}/wiki/${encodeURIComponent(decoded)}`
      : `/wiki/${encodeURIComponent(decoded)}`;

    return (
      <div className="p-2.5">
        <div className="flex gap-3">
          {thumbnail && (
            <img
              src={thumbnail}
              alt={title}
              className="w-12 h-12 rounded object-cover shadow-sm shrink-0"
            />
          )}

          <div className="min-w-0 flex-1">
            {/* Action badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-medium text-blue-500">
                Read Article
              </span>
              {lang !== "en" && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                  {lang}
                </span>
              )}
            </div>

            {/* Title */}
            <a
              href={wikiUrl}
              target="_top"
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
            >
              {title}
            </a>

            {/* Description */}
            {summary.description && (
              <p className="text-[11px] text-muted-foreground italic mt-0.5">
                {summary.description}
              </p>
            )}

            {/* Excerpt */}
            {excerpt && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {excerpt}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    return <ErrorCard message="Failed to load article" />;
  }
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="p-2.5">
      <p className="text-xs text-muted-foreground py-2 text-center">
        {message}
      </p>
    </div>
  );
}
