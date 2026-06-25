/**
 * Wiki Homepage — Modern dashboard layout
 *
 * Sections:
 * - Welcome header with inline search
 * - Featured article (Wikipedia API)
 * - Reading list (localStorage bookmarks)
 * - On This Day (Wikipedia API)
 * - Explore topics (curated categories)
 */

import {
  getFeaturedContent,
  proxyImageUrl,
} from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";
import { createApiClient } from "@/lib/api";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Compass,
  Star,
} from "lucide-react";
import { ReadingListSection } from "@/components/home-client-sections";

export const revalidate = 3600;

const EXPLORE_TOPICS = [
  { name: "History", slug: "History", icon: "🏛️" },
  { name: "Science", slug: "Science", icon: "🔬" },
  { name: "Geography", slug: "Geography", icon: "🌍" },
  { name: "Technology", slug: "Technology", icon: "💻" },
  { name: "Arts", slug: "Arts", icon: "🎨" },
  { name: "Sports", slug: "Sport", icon: "⚽" },
  { name: "Nature", slug: "Nature", icon: "🌿" },
  { name: "Transport", slug: "Transport", icon: "🚂" },
];

export default async function WikiHomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession("ye-wiki").catch(() => null);
  let lang = sp.lang ?? "en";

  if (!sp.lang && session) {
    const api = createApiClient("ye-wiki");
    const settings = await api.getUserSettings(session.userId);
    lang = (settings.language as string) ?? "en";
  }

  const t = await getTranslations("wiki");

  const featured = await getFeaturedContent(undefined, lang, session?.userId).catch(() => null);
  const tfa = featured?.tfa;
  const onThisDay = featured?.onthisday?.slice(0, 5) ?? [];

  const appBase = process.env.APP_BASE_URL ?? "";

  // Event dot colors cycle
  const dotColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 py-6">

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Left Column ── */}
        <div className="space-y-6">
          {/* Featured Article */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                {t("featuredArticle")}
              </h2>
            </div>
            {tfa ? (
              <Link
                href={`/wiki/${encodeURIComponent(tfa.title.replace(/ /g, "_"))}?lang=${lang}`}
                className="block group"
              >
                <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-border/70 transition-all">
                  {tfa.thumbnail && (
                    <div className="w-full h-40 overflow-hidden bg-muted">
                      <img
                        src={proxyImageUrl(tfa.thumbnail.source, appBase)}
                        alt={tfa.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-base font-serif font-bold text-card-foreground group-hover:text-primary transition-colors mb-1">
                      {(tfa.displaytitle ?? tfa.title).replace(/<[^>]*>/g, "")}
                    </h3>
                    {tfa.description && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        {tfa.description}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-card-foreground/80 line-clamp-3">
                      {tfa.extract}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-medium group-hover:gap-1.5 transition-all">
                      {t("readArticle")} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
                {t("noFeatured")}
              </div>
            )}
          </section>

          {/* Reading List (client-side) */}
          <ReadingListSection lang={lang} />
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* On This Day */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {t("onThisDay")}
              </h2>
            </div>
            {onThisDay.length > 0 ? (
              <div className="space-y-3">
                {onThisDay.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative mt-1.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${dotColors[i % dotColors.length]}`}
                      />
                      {i < onThisDay.length - 1 && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {event.year}
                      </span>
                      <p className="text-sm leading-snug text-foreground/90 mt-0.5">
                        {event.text}
                      </p>
                      {event.pages?.[0] && (
                        <Link
                          href={`/wiki/${encodeURIComponent(event.pages[0].title.replace(/ /g, "_"))}?lang=${lang}`}
                          className="text-xs text-primary hover:underline mt-1 inline-block font-medium"
                        >
                          {event.pages[0].title} →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground text-sm">
                <Calendar className="h-5 w-5 mx-auto mb-2 opacity-40" />
                {t("noEvents")}
              </div>
            )}
          </section>

          {/* Explore Topics */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Compass className="h-4 w-4 text-muted-foreground" />
                {t("exploreTopics")}
              </h2>
            </div>
            <div className="space-y-0.5">
              {EXPLORE_TOPICS.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/wiki/${encodeURIComponent(topic.slug)}?lang=${lang}`}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-2.5">
                    <span className="text-base">{topic.icon}</span>
                    {topic.name}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
