/**
 * Wiki Search Page — Wikipedia-style search results
 *
 * Clean text-focused results with optional thumbnails on the right,
 * matching Wikipedia's search result layout.
 */

import { searchWikipedia, getArticleSummary, proxyImageUrl } from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import { getTranslations } from "next-intl/server";
import { Search, BookOpen } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "../search-bar";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; lang?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  return { title: q ? `"${q}" — Wiki Search` : "Search — Wiki" };
}

async function getResultThumbnails(
  titles: string[],
  lang: string,
  appBase: string,
  userId?: string
): Promise<Record<string, string>> {
  const thumbs: Record<string, string> = {};
  // Fetch thumbnails for top 10 results
  const fetches = titles.slice(0, 10).map(async (title) => {
    try {
      const summary = await getArticleSummary(title, lang, userId);
      if (summary?.thumbnail?.source) {
        thumbs[title] = proxyImageUrl(summary.thumbnail.source, appBase);
      }
    } catch {
      // Skip failed thumbnail fetches
    }
  });
  await Promise.all(fetches);
  return thumbs;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q;
  const session = await getSession("ye-wiki").catch(() => null);

  // Determine language: URL param > user settings > default
  let lang = params.lang;
  if (!lang) {
    if (session) {
      const api = createApiClient("ye-wiki");
      const settings = await api.getUserSettings(session.userId);
      lang = (settings.language as string) ?? "en";
    } else {
      lang = "en";
    }
  }

  const t = await getTranslations("wiki");
  const tc = await getTranslations("common");

  if (!q) {
    return (
      <div className="max-w-[580px] mx-auto px-4 py-20 text-center">
        <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-serif mb-2 text-foreground">
          {t("search")}
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          {t("searchHint")}
        </p>
        <div className="max-w-md mx-auto">
          <SearchBar lang={lang} />
        </div>
      </div>
    );
  }

  const appBase = process.env.APP_BASE_URL ?? "";
  const { results, total } = await searchWikipedia(q, 20, lang, session?.userId);
  const thumbnails = await getResultThumbnails(
    results.map((r) => r.title),
    lang,
    appBase,
    session?.userId
  );

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      {/* Search bar */}
      <div className="max-w-[580px] mb-5">
        <SearchBar lang={lang} initialQuery={q} />
      </div>

      {/* Results header */}
      <p className="text-sm text-muted-foreground mb-4 pb-2 border-b border-border">
        {total.toLocaleString()} results for{" "}
        <strong className="text-foreground">&ldquo;{q}&rdquo;</strong>
        {lang !== "en" && (
          <span className="ml-1 text-xs">({lang}.wikipedia.org)</span>
        )}
      </p>

      {results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-serif">{tc("noResults")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {results.map((result) => {
            const thumb = thumbnails[result.title];
            return (
              <Link
                key={result.pageid}
                href={`/wiki/${encodeURIComponent(result.title.replace(/ /g, "_"))}?lang=${lang}`}
                className="flex gap-4 py-4 group hover:bg-accent/30 -mx-3 px-3 rounded transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-serif text-primary group-hover:underline mb-0.5">
                    {result.title}
                  </h3>
                  <p
                    className="text-sm text-foreground/80 leading-relaxed line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: result.snippet
                        .replace(
                          /<span class="searchmatch">/g,
                          '<mark class="bg-primary/20 text-foreground rounded px-0.5">'
                        )
                        .replace(/<\/span>/g, "</mark>"),
                    }}
                  />
                  <span className="text-xs text-muted-foreground mt-1 inline-block">
                    {result.wordcount.toLocaleString()} words
                  </span>
                </div>
                {thumb && (
                  <div className="shrink-0 w-[120px] h-[80px] rounded overflow-hidden bg-muted self-start mt-1">
                    <img
                      src={thumb}
                      alt={result.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
