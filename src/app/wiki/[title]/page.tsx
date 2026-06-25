/**
 * Article Viewer Page — Three-column layout with sticky TOC sidebar
 *
 * Layout:
 * - Tab bar: Article | Talk | Read | View history + language count badge
 * - Left sidebar: Sticky table of contents (desktop only)
 * - Center: Article content with lead image, summary, full body
 * - Right: Wikipedia infobox floats naturally from article HTML
 */

import {
  getArticleSummary,
  getArticleHtml,
  getArticleLanguages,
  rewriteHtml,
  proxyImageUrl,
} from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import { emitArticleReadEvent } from "@/lib/timeline/emit";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleToc } from "@/components/article-toc";
import { ArticleLanguages } from "@/components/article-languages";
import { BookmarkButton } from "@/components/bookmark-button";

interface PageProps {
  params: Promise<{ title: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { title } = await params;
  const decoded = decodeURIComponent(title).replace(/_/g, " ");
  return { title: `${decoded} — Wiki` };
}

export default async function ArticlePage({
  params,
  searchParams,
}: PageProps) {
  const { title } = await params;
  const decoded = decodeURIComponent(title);
  const sp = await searchParams;
  const session = await getSession("ye-wiki").catch(() => null);

  let lang = sp.lang;
  if (!lang) {
    if (session) {
      const api = createApiClient("ye-wiki");
      const settings = await api.getUserSettings(session.userId);
      lang = (settings.language as string) ?? "en";
    } else {
      lang = "en";
    }
  }

  let summary;
  let html;
  let articleLangs: Array<{ lang: string; title: string }> = [];

  try {
    [summary, html, articleLangs] = await Promise.all([
      getArticleSummary(decoded, lang, session?.userId),
      getArticleHtml(decoded, lang, session?.userId),
      getArticleLanguages(decoded, lang, session?.userId),
    ]);
  } catch {
    notFound();
  }

  if (!summary || !html) notFound();

  const appBase = process.env.APP_BASE_URL ?? "";
  const rewrittenHtml = rewriteHtml(html, appBase, lang);
  const wikiUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(decoded)}`;
  const proxiedThumb = summary.thumbnail
    ? proxyImageUrl(summary.thumbnail.source, appBase)
    : null;
  const displayTitle = (summary.displaytitle ?? summary.title).replace(
    /<[^>]*>/g,
    ""
  );

  // Emit timeline event (non-blocking)
  if (session) {
    const domain = process.env.YOUEYE_DOMAIN ?? "youeye.local";
    emitArticleReadEvent(
      session.userId,
      decoded,
      summary.title ?? decoded,
      summary.extract ?? "",
      domain
    ).catch(() => {});
  }

  const tabItems = [
    { label: "Article", href: null, active: true },
    { label: "Talk", href: `${wikiUrl.replace("/wiki/", "/wiki/Talk:")}`, active: false },
    { label: "Read", href: null, active: false },
    { label: "View history", href: `${wikiUrl}?action=history`, active: false },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-4">
      {/* ── Top nav ── */}
      <div className="flex items-center justify-between mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Main page
        </Link>
        <div className="flex items-center gap-3">
          {lang !== "en" && (
            <span className="text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-md border border-border">
              {lang}.wikipedia.org
            </span>
          )}
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Wikipedia
          </a>
        </div>
      </div>

      {/* ── Article title ── */}
      <header className="mb-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[1.75rem] leading-tight font-serif font-normal text-foreground">
            {displayTitle}
          </h1>
          <BookmarkButton
            title={decoded}
            displayTitle={displayTitle}
            lang={lang}
          />
        </div>
      </header>

      {summary.description && (
        <p className="text-sm text-muted-foreground italic mb-2">
          {summary.description}
        </p>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex items-center justify-between border-b border-border mb-4">
        <div className="flex items-center gap-0">
          {tabItems.map((tab) => (
            tab.href ? (
              <a
                key={tab.label}
                href={tab.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors border-b-2 border-transparent"
              >
                {tab.label}
              </a>
            ) : (
              <span
                key={tab.label}
                className={`px-3 py-2 text-sm transition-colors border-b-2 ${
                  tab.active
                    ? "text-primary border-primary font-medium"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                {tab.label}
              </span>
            )
          ))}
        </div>
        {articleLangs.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded-md bg-accent/50 border border-border">
            <Globe className="h-3 w-3" />
            {articleLangs.length} languages
          </span>
        )}
      </div>

      {/* ── Language links ── */}
      {articleLangs.length > 0 && (
        <div className="mb-4">
          <ArticleLanguages
            title={decoded}
            currentLang={lang}
            languages={articleLangs}
          />
        </div>
      )}

      {/* ── Three-column layout ── */}
      <div className="flex gap-6">
        {/* Left sidebar — sticky TOC (desktop only) */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 scrollbar-thin">
            <ArticleToc html={rewrittenHtml} />
          </div>
        </aside>

        {/* Main article content */}
        <article className="min-w-0 flex-1">
          {/* Mobile-only TOC */}
          <div className="lg:hidden">
            <ArticleToc html={rewrittenHtml} />
          </div>

          {/* Lead section with thumbnail */}
          <div className="mb-4">
            {proxiedThumb && (
              <div className="float-right ml-4 mb-3 max-w-[220px] border border-border rounded-xl bg-card p-1.5 shadow-sm">
                <img
                  src={proxiedThumb}
                  alt={summary.title}
                  className="w-full rounded-lg"
                  width={summary.thumbnail!.width}
                  height={summary.thumbnail!.height}
                />
              </div>
            )}
            <p className="text-[15px] leading-[1.7] text-foreground/90 font-serif">
              {summary.extract}
            </p>
            <div className="clear-both" />
          </div>

          {/* Full article body */}
          <div
            className="wiki-article"
            dangerouslySetInnerHTML={{ __html: rewrittenHtml }}
          />
        </article>
      </div>

    </div>
  );
}
