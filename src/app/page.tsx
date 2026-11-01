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
  Landmark,
  FlaskConical,
  Globe,
  Cpu,
  Palette,
  Trophy,
  Leaf,
  TrainFront,
} from "lucide-react";
import { ReadingListSection } from "@/components/home-client-sections";
import { resolveAppLocale } from "@/lib/locale";

export const revalidate = 3600;

const EXPLORE_TOPICS = [
  { name: "History", slug: "History", icon: Landmark },
  { name: "Science", slug: "Science", icon: FlaskConical },
  { name: "Geography", slug: "Geography", icon: Globe },
  { name: "Technology", slug: "Technology", icon: Cpu },
  { name: "Arts", slug: "Arts", icon: Palette },
  { name: "Sports", slug: "Sport", icon: Trophy },
  { name: "Nature", slug: "Nature", icon: Leaf },
  { name: "Transport", slug: "Transport", icon: TrainFront },
];

export default async function WikiHomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession("ye-wiki").catch(() => null);
  let lang = sp.lang ?? "en";
  let uiLocale = resolveAppLocale(undefined);

  if (session) {
    const api = createApiClient("ye-wiki");
    const [settings, headerConfig] = await Promise.all([
      sp.lang ? Promise.resolve(null) : api.getUserSettings(session.userId),
      api.fetchHeaderConfig(session.userId),
    ]);
    if (settings) lang = (settings.language as string) ?? "en";
    uiLocale = resolveAppLocale(headerConfig?.locale);
  }

  const t = await getTranslations({ locale: uiLocale, namespace: "wiki" });

  const featured = await getFeaturedContent(undefined, lang, session?.userId).catch(() => null);
  const tfa = featured?.tfa;
  const onThisDay = featured?.onthisday?.slice(0, 5) ?? [];

  const appBase = process.env.APP_BASE_URL ?? "";

  return (
    <div className="wiki-discovery max-w-[1100px] mx-auto px-4 py-6">

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr] gap-10">
        {/* ── Left Column ── */}
        <div className="space-y-9">
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
                <div className="wiki-feature rounded-2xl border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors">
                  {tfa.thumbnail && (
                    <div className="w-full h-52 overflow-hidden bg-muted">
                      <img
                        src={proxyImageUrl(tfa.thumbnail.source, appBase)}
                        alt={tfa.title}
                        className="w-full h-full object-cover "
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-2xl font-serif font-normal text-card-foreground group-hover:text-primary transition-colors mb-1">
                      {(tfa.displaytitle ?? tfa.title).replace(/<[^>]*>/g, "")}
                    </h3>
                    {tfa.description && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        {tfa.description}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-card-foreground/80 line-clamp-4">
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
        <div className="space-y-9">
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
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      />
                      {i < onThisDay.length - 1 && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-6 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {event.year}
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/90 mt-0.5">
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
                    <topic.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {t(`topics.${topic.name.toLowerCase()}`)}
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
