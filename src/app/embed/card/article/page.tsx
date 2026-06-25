/**
 * Wiki Info Card — Knowledge Panel embed for Search RHS
 *
 * Structured knowledge panel: prominent image, rich infobox facts,
 * clean extract, and action links. Styled with shadcn tokens and
 * the wiki app's serif typography.
 *
 * Query params:
 *   ?url=https://en.wikipedia.org/wiki/Iron_Man&w=480
 */

import {
  getArticleSummary,
  getInfoboxFacts,
  proxyImageUrl,
} from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";
import { BookOpen, ExternalLink, Globe } from "lucide-react";

interface CardPageProps {
  searchParams: Promise<{ url?: string; w?: string }>;
}

function extractArticleInfo(
  url: string
): { title: string; lang: string } | null {
  const match = url.match(
    /(?:https?:)?\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^#?]+)/
  );
  if (match) return { lang: match[1], title: decodeURIComponent(match[2]) };

  const relMatch = url.match(/\/wiki\/([^#?]+)/);
  if (relMatch)
    return { lang: "en", title: decodeURIComponent(relMatch[1]) };

  return null;
}

export default async function ArticleCardPage({
  searchParams,
}: CardPageProps) {
  const params = await searchParams;
  const { url } = params;

  if (!url) {
    return <CardError message="No URL provided" />;
  }

  const info = extractArticleInfo(url);
  if (!info) {
    return <CardError message="URL not recognized" />;
  }

  try {
    const session = await getSession("ye-wiki").catch(() => null);
    const [summary, infoboxFacts] = await Promise.all([
      getArticleSummary(info.title, info.lang, session?.userId),
      getInfoboxFacts(info.title, info.lang, 6, session?.userId),
    ]);

    const appBase = process.env.APP_BASE_URL ?? "";
    const thumbnail = summary.thumbnail
      ? proxyImageUrl(summary.thumbnail.source, appBase)
      : null;
    const displayTitle = (summary.displaytitle ?? summary.title ?? info.title)
      .replace(/<[^>]*>/g, "")
      .replace(/_/g, " ");
    const extract = summary.extract ?? "";

    const wikiAppUrl = appBase
      ? `${appBase}/wiki/${encodeURIComponent(info.title)}`
      : `/wiki/${encodeURIComponent(info.title)}`;

    const wikiUrl = `https://${info.lang}.wikipedia.org/wiki/${encodeURIComponent(info.title)}`;

    return (
      <div className="font-serif text-foreground">
        {/* ── Header: image + title ── */}
        <div className="flex gap-4 p-4 pb-3">
          {thumbnail && (
            <div className="shrink-0">
              <img
                src={thumbnail}
                alt={displayTitle}
                className="w-[100px] h-[100px] rounded-lg object-cover border border-border shadow-sm"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold leading-tight line-clamp-2">
              {displayTitle}
            </h2>
            {summary.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {summary.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
              <Globe className="h-3 w-3" />
              <span>Wikipedia</span>
              {info.lang !== "en" && (
                <span className="ml-1 uppercase tracking-wide font-sans text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {info.lang}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Extract ── */}
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4">
            {extract}
          </p>
        </div>

        {/* ── Infobox facts ── */}
        {infoboxFacts.length > 0 && (
          <div className="mx-4 mb-3 rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm font-sans">
              <tbody>
                {infoboxFacts.map((fact, i) => (
                  <tr
                    key={fact.label}
                    className={i < infoboxFacts.length - 1 ? "border-b border-border" : ""}
                  >
                    <th className="text-left font-medium text-muted-foreground px-3 py-2 bg-muted/40 whitespace-nowrap align-top w-[1%] text-xs">
                      {fact.label}
                    </th>
                    <td className="px-3 py-2 text-foreground/85 text-xs leading-relaxed">
                      {fact.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="px-4 py-3 flex items-center gap-3 border-t border-border">
          <a
            href={wikiAppUrl}
            target="_top"
            className="inline-flex items-center gap-1.5 text-sm font-medium font-sans text-primary hover:text-primary/80 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read full article
          </a>
          <span className="text-border">·</span>
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Wikipedia
          </a>
        </div>
      </div>
    );
  } catch {
    return <CardError message="Failed to load article" />;
  }
}

function CardError({ message }: { message: string }) {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground text-center py-4">
        {message}
      </p>
    </div>
  );
}
