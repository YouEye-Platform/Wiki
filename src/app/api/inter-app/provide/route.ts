import { createInterAppHandler } from "@/lib/routes/inter-app";
import { searchWikipedia, getArticleSummary } from "@/lib/wikipedia/client";

export const POST = createInterAppHandler({
  search: async (data) => {
    const q = String(data.query ?? "");
    const lang = String(data.lang ?? "en");
    const userId = typeof data.userId === "string" ? data.userId : undefined;
    if (!q) return { provider: "ye-wiki", results: [] };

    const { results } = await searchWikipedia(q, 5, lang, userId);
    return {
      provider: "ye-wiki",
      results: results.map((r) => ({
        title: r.title,
        snippet: r.snippet.replace(/<[^>]+>/g, ""),
        url: `/wiki/${encodeURIComponent(r.title)}?lang=${lang}`,
      })),
    };
  },

  "info-card": async (data) => {
    const url = String(data.url ?? "");
    const match = url.match(/([a-z-]+)\.wikipedia\.org\/wiki\/(.+)/);
    if (!match) return { error: "URL not recognized" };

    const lang = match[1];
    const title = decodeURIComponent(match[2]);
    const userId = typeof data.userId === "string" ? data.userId : undefined;
    const summary = await getArticleSummary(title, lang, userId);

    return {
      title: summary.title,
      description: summary.extract,
      image: summary.thumbnail?.source,
      appName: "Wiki",
      appIcon: "BookOpen",
    };
  },

  "get-article-summary": async (data) => {
    const title = String(data.title ?? "");
    const lang = String(data.lang ?? "en");
    const userId = typeof data.userId === "string" ? data.userId : undefined;
    if (!title) return { error: "Missing title" };

    const summary = await getArticleSummary(title, lang, userId);
    return { ...summary } as Record<string, unknown>;
  },
});
