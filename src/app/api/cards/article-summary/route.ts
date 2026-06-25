/**
 * Article Summary Info Card API
 *
 * Returns structured card data for a Wikipedia article.
 * Used by YE-UI's info card system and inter-app queries.
 *
 * GET /api/cards/article-summary?url=https://en.wikipedia.org/wiki/Iron_Man
 * GET /api/cards/article-summary?query=Iron+Man
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getArticleSummary, getInfoboxFacts, proxyImageUrl } from "@/lib/wikipedia/client";

function extractArticleInfo(
  url: string
): { title: string; lang: string } | null {
  const match = url.match(
    /(?:https?:)?\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^#?]+)/
  );
  if (match) return { lang: match[1], title: decodeURIComponent(match[2].replace(/_/g, " ")) };

  const relMatch = url.match(/\/wiki\/([^#?]+)/);
  if (relMatch)
    return { lang: "en", title: decodeURIComponent(relMatch[1].replace(/_/g, " ")) };

  return null;
}

export async function GET(request: Request) {
  const session = await getSession("ye-wiki").catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const query = searchParams.get("query");

  let title: string;
  let lang = "en";

  if (url) {
    const info = extractArticleInfo(url);
    if (!info) {
      return NextResponse.json(
        { error: "Could not parse Wikipedia URL" },
        { status: 400 }
      );
    }
    title = info.title;
    lang = info.lang;
  } else if (query) {
    title = query;
  } else {
    return NextResponse.json(
      { error: "Missing url or query parameter" },
      { status: 400 }
    );
  }

  try {
    const [summary, infoboxFacts] = await Promise.all([
      getArticleSummary(title, lang, session.userId),
      getInfoboxFacts(title, lang, 6, session.userId),
    ]);
    const appBase = process.env.APP_BASE_URL ?? "";
    const thumbnail = summary.thumbnail
      ? proxyImageUrl(summary.thumbnail.source, appBase)
      : null;
    const displayTitle = (summary.displaytitle ?? summary.title ?? title)
      .replace(/<[^>]*>/g, "");

    return NextResponse.json({
      card_type: "article-summary",
      provider: "ye-wiki",
      title: displayTitle,
      subtitle: summary.description ?? null,
      description: summary.extract ?? null,
      image: thumbnail,
      facts: infoboxFacts,
      actions: [
        {
          label: "Read full article",
          url: `${appBase}/wiki/${encodeURIComponent(title)}${lang !== "en" ? `?lang=${lang}` : ""}`,
        },
        {
          label: "Wikipedia",
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
          external: true,
        },
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 502 }
    );
  }
}
