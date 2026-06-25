/**
 * Widget Embed Page — visual display of wiki widgets for YE-UI dashboard
 *
 * Widgets:
 * - featured-article: Card with prominent image, title, excerpt, and CTA
 * - today-in-history: Timeline with colored dots, years, and event descriptions
 */

import { getFeaturedContent, proxyImageUrl } from "@/lib/wikipedia/client";
import { getSession } from "@/lib/auth";

interface WidgetPageProps {
  params: Promise<{ widgetId: string }>;
}

async function FeaturedArticleWidget() {
  try {
    const session = await getSession("ye-wiki").catch(() => null);
    const featured = await getFeaturedContent(undefined, "en", session?.userId);
    const tfa = featured?.tfa;

    if (!tfa) {
      return (
        <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
          No featured article available today.
        </div>
      );
    }

    const rawTitle = tfa.displaytitle ?? tfa.title;
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, "");
    const excerpt = tfa.extract?.slice(0, 180) + "...";
    const articleUrl = `/wiki/${encodeURIComponent(tfa.title.replace(/ /g, "_"))}`;
    const appBase = process.env.APP_BASE_URL ?? "";

    return (
      <div className="flex flex-col h-full">
        {tfa.thumbnail?.source && (
          <div className="w-full h-28 overflow-hidden bg-muted rounded-t-lg shrink-0">
            <img
              src={proxyImageUrl(tfa.thumbnail.source, appBase)}
              alt={cleanTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 p-3.5 flex flex-col">
          <h3 className="text-sm font-serif font-bold leading-tight text-card-foreground mb-1">
            {cleanTitle}
          </h3>
          {tfa.description && (
            <p className="text-[11px] text-muted-foreground italic mb-1.5 line-clamp-1">
              {tfa.description}
            </p>
          )}
          <p className="text-xs text-card-foreground/80 leading-snug line-clamp-3 flex-1">
            {excerpt}
          </p>
          <a
            href={articleUrl}
            target="_top"
            className="inline-flex items-center gap-1 mt-2.5 text-xs text-primary font-medium hover:underline"
          >
            Read article
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
        Unable to load featured content.
      </div>
    );
  }
}

async function TodayInHistoryWidget() {
  const dotColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-violet-500",
    "bg-rose-500",
  ];

  try {
    const session = await getSession("ye-wiki").catch(() => null);
    const featured = await getFeaturedContent(undefined, "en", session?.userId);
    const events = featured?.onthisday?.slice(0, 5) ?? [];

    if (events.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
          No events available for today.
        </div>
      );
    }

    return (
      <div className="p-3.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          On this day
        </h3>
        <div className="space-y-3">
          {events.map((event, i) => {
            const url = event.pages?.[0]
              ? `/wiki/${encodeURIComponent(event.pages[0].title.replace(/ /g, "_"))}`
              : undefined;

            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="relative mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`}
                  />
                  {i < events.length - 1 && (
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-px h-5 bg-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {String(event.year)}
                  </span>
                  <p className="text-xs leading-snug text-card-foreground/90 mt-0.5 line-clamp-2">
                    {event.text}
                  </p>
                  {url && (
                    <a
                      href={url}
                      target="_top"
                      className="text-[11px] text-primary hover:underline mt-0.5 inline-block font-medium"
                    >
                      {event.pages![0].title}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } catch {
    return (
      <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
        Unable to load events.
      </div>
    );
  }
}

function UnknownWidget({ widgetId }: { widgetId: string }) {
  return (
    <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
      Unknown widget: {widgetId}
    </div>
  );
}

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { widgetId } = await params;

  switch (widgetId) {
    case "featured-article":
      return <FeaturedArticleWidget />;
    case "today-in-history":
      return <TodayInHistoryWidget />;
    default:
      return <UnknownWidget widgetId={widgetId} />;
  }
}
