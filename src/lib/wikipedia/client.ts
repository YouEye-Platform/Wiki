/**
 * Wikipedia client — direct API calls with caching.
 *
 * Handles:
 *   - In-memory caching with TTL
 *   - HTML rewriting (image proxy URLs, internal links, edit button removal)
 *   - Language list parsing from the sitematrix API
 *   - Media proxying for privacy
 */

import { internetFetch } from "@/lib/internet";

const DEFAULT_LANG = "en";

// ─── Cache ─────────────────────────────────────────────────

const CACHE = new Map<string, { data: unknown; expires: number }>();
const SHORT_TTL = 3600_000; // 1 hour
const LONG_TTL = 86400_000; // 24 hours

function getCached<T>(key: string): T | null {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttl = SHORT_TTL) {
  CACHE.set(key, { data, expires: Date.now() + ttl });
  if (CACHE.size > 500) {
    const oldest = CACHE.keys().next().value;
    if (oldest) CACHE.delete(oldest);
  }
}

// ─── Fetch helpers ────────────────────────────────────────

async function fetchJSON<T>(url: string, ttl = SHORT_TTL, userId?: string): Promise<T> {
  const cached = getCached<T>(url);
  if (cached) return cached;

  const res = await internetFetch(url, {
    headers: {
      "User-Agent": "YouEye-Wiki/1.0 (self-hosted; privacy proxy)",
      Accept: "application/json",
    },
  }, userId);

  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  setCache(url, data, ttl);
  return data as T;
}

async function fetchText(url: string, userId?: string): Promise<string> {
  const cached = getCached<string>(url);
  if (cached) return cached;

  const res = await internetFetch(url, {
    headers: { "User-Agent": "YouEye-Wiki/1.0 (self-hosted; privacy proxy)" },
  }, userId);

  if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);
  const text = await res.text();
  setCache(url, text);
  return text;
}

// ─── Public API (type-safe, used by route handlers) ────────

export interface ArticleSummary {
  title: string;
  displaytitle?: string;
  description?: string;
  extract: string;
  extract_html?: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { desktop: { page: string }; mobile: { page: string } };
  lang?: string;
  dir?: string;
  pageid?: number;
}

export interface SearchResult {
  title: string;
  snippet: string;
  pageid: number;
  size: number;
  wordcount: number;
  timestamp: string;
}

export interface FeaturedContent {
  tfa?: ArticleSummary;
  onthisday?: Array<{ text: string; year: number; pages: ArticleSummary[] }>;
  image?: { title: string; thumbnail: { source: string }; description?: { text: string } };
}

export interface WikiLanguage {
  code: string;
  name: string;
  localName: string;
  articleCount?: number;
}

export interface InfoboxFact {
  label: string;
  value: string;
}

// ─── Infobox parser ──────────────────────────────────────

/**
 * Strip HTML tags, style blocks, and normalize whitespace.
 * Preserves list separators as commas.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, ", ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/^[,\s•]+|[,\s•]+$/g, "")
    .trim();
}

/**
 * Parse the Wikipedia infobox from article HTML.
 * Returns up to `limit` key-value facts, filtering out noise.
 */
export function parseInfobox(html: string, limit = 6): InfoboxFact[] {
  const tableMatch = html.match(
    /<table[^>]*class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?<\/table>/
  );
  if (!tableMatch) return [];

  const infobox = tableMatch[0];

  // Extract label-data pairs
  const pairRe =
    /<th[^>]*class="infobox-label"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*class="infobox-data"[^>]*>([\s\S]*?)<\/td>/g;
  const facts: InfoboxFact[] = [];
  let m: RegExpExecArray | null;

  // Labels to skip — these are noise or redundant with the summary
  const skipLabels = new Set([
    "website", "web site", "official website", "url",
    "module", "signature", "logo", "image", "caption",
    "map", "flag", "coat of arms", "anthem", "seal",
  ]);

  while ((m = pairRe.exec(infobox)) !== null) {
    const label = stripHtml(m[1]);
    const value = stripHtml(m[2]);

    // Skip empty, very short, or noise fields
    if (!label || !value || value.length < 2) continue;
    if (skipLabels.has(label.toLowerCase())) continue;
    // Skip "See list" prefixes — clean or skip
    if (value === "See list") continue;
    const cleaned = value.replace(/^See list\s*/, "");
    if (!cleaned) continue;

    // Truncate long values (keep first ~120 chars, break at word boundary)
    let truncated = cleaned;
    if (truncated.length > 120) {
      truncated = truncated.slice(0, 120).replace(/[,\s•][^,\s•]*$/, "") + "…";
    }

    facts.push({ label, value: truncated });
    if (facts.length >= limit) break;
  }

  return facts;
}

/**
 * Fetch article HTML and extract infobox facts.
 * Uses the same cached HTML as getArticleHtml.
 */
export async function getInfoboxFacts(
  title: string,
  lang = DEFAULT_LANG,
  limit = 6,
  userId?: string,
): Promise<InfoboxFact[]> {
  try {
    const html = await getArticleHtml(title, lang, userId);
    return parseInfobox(html, limit);
  } catch {
    return [];
  }
}

export async function getArticleSummary(
  title: string,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<ArticleSummary> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const baseRest = `https://${lang}.wikipedia.org/api/rest_v1`;
  return fetchJSON<ArticleSummary>(`${baseRest}/page/summary/${encoded}`, SHORT_TTL, userId);
}

export async function getArticleHtml(
  title: string,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<string> {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const baseRest = `https://${lang}.wikipedia.org/api/rest_v1`;
  return fetchText(`${baseRest}/page/html/${encoded}`, userId);
}

export async function searchWikipedia(
  query: string,
  limit = 20,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<{ results: SearchResult[]; total: number }> {
  const baseAction = `https://${lang}.wikipedia.org/w/api.php`;
  const sp = new URLSearchParams({
    action: "query", list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json", origin: "*",
  });
  const raw = await fetchJSON<{ query: { search: unknown[]; searchinfo?: { totalhits: number } } }>(
    `${baseAction}?${sp}`,
    SHORT_TTL,
    userId,
  );
  return { results: raw.query.search as SearchResult[], total: raw.query.searchinfo?.totalhits ?? 0 };
}

export async function getSuggestions(
  query: string,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<string[]> {
  const baseAction = `https://${lang}.wikipedia.org/w/api.php`;
  const sp = new URLSearchParams({
    action: "opensearch", search: query,
    limit: "8", namespace: "0", format: "json",
  });
  const data = await fetchJSON<[string, string[]]>(`${baseAction}?${sp}`, SHORT_TTL, userId);
  return data[1] ?? [];
}

export async function getFeaturedContent(
  date?: Date,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<FeaturedContent> {
  const d = date ?? new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  const baseRest = `https://${lang}.wikipedia.org/api/rest_v1`;
  return fetchJSON<FeaturedContent>(
    `${baseRest}/feed/featured/${yyyy}/${mm}/${dd}`, LONG_TTL, userId
  );
}

export async function proxyMedia(
  path: string,
  userId?: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const url = `https://upload.wikimedia.org/${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await internetFetch(url, {
      headers: { "User-Agent": "YouEye-Wiki/1.0 (self-hosted; privacy proxy)" },
      signal: controller.signal,
    }, userId);
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    return { buffer, contentType };
  } catch {
    return null;
  }
}

/**
 * Rewrite an image URL to go through our proxy.
 * Handles upload.wikimedia.org URLs — returns the original URL for others.
 */
export function proxyImageUrl(url: string, appBaseUrl = ""): string {
  if (!url) return url;
  const match = url.match(/^https?:\/\/upload\.wikimedia\.org\/(.+)$/);
  if (match) return `${appBaseUrl}/api/wiki/media/${match[1]}`;
  const match2 = url.match(/^\/\/upload\.wikimedia\.org\/(.+)$/);
  if (match2) return `${appBaseUrl}/api/wiki/media/${match2[1]}`;
  return url;
}

export function rewriteHtml(
  html: string,
  appBaseUrl: string,
  lang = DEFAULT_LANG
): string {
  return (
    html
      // ── Strip <base> tag (Wikipedia REST API sets base to en.wikipedia.org,
      //    which breaks our relative proxy URLs when injected via dangerouslySetInnerHTML) ──
      .replace(/<base[^>]*>/gi, "")
      // ── Image proxying ──
      .replace(
        /src="\/\/upload\.wikimedia\.org\/([^"]+)"/g,
        `src="${appBaseUrl}/api/wiki/media/$1"`
      )
      .replace(
        /src="https:\/\/upload\.wikimedia\.org\/([^"]+)"/g,
        `src="${appBaseUrl}/api/wiki/media/$1"`
      )
      // srcset proxying (responsive images)
      .replace(
        /srcset="([^"]+)"/g,
        (_, srcset: string) =>
          `srcset="${srcset.replace(
            /(?:https?:)?\/\/upload\.wikimedia\.org\/([^\s,]+)/g,
            `${appBaseUrl}/api/wiki/media/$1`
          )}"`
      )
      // ── Internal wiki links → stay in-app ──
      // Relative: /wiki/Title
      .replace(
        /href="\/wiki\/([^"]+)"/g,
        `href="${appBaseUrl}/wiki/$1"`
      )
      // Absolute same-lang: https://en.wikipedia.org/wiki/Title
      .replace(
        /href="https:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^"]+)"/g,
        (_, linkLang: string, title: string) =>
          linkLang === lang
            ? `href="${appBaseUrl}/wiki/${title}"`
            : `href="${appBaseUrl}/wiki/${title}?lang=${linkLang}"`
      )
      // Protocol-relative: //en.wikipedia.org/wiki/Title
      .replace(
        /href="\/\/([a-z-]+)\.wikipedia\.org\/wiki\/([^"]+)"/g,
        (_, linkLang: string, title: string) =>
          linkLang === lang
            ? `href="${appBaseUrl}/wiki/${title}"`
            : `href="${appBaseUrl}/wiki/${title}?lang=${linkLang}"`
      )
      // ── Strip edit/action links ──
      .replace(/<span class="mw-editsection">[\s\S]*?<\/span>/g, "")
      .replace(
        /href="(?:https?:)?\/\/[a-z-]+\.wikipedia\.org\/w\/index\.php[^"]*"/g,
        'href="#" data-removed="true"'
      )
      // ── Strip Wikidata/Wikimedia links but keep text ──
      .replace(
        /href="https?:\/\/(?:www\.)?wikidata\.org\/[^"]*"/g,
        'href="#" data-external="wikidata"'
      )
      // ── External links (non-Wikipedia) get target=_blank ──
      .replace(
        /href="(https?:\/\/(?!([a-z-]+\.)?wikipedia\.org)[^"]+)"/g,
        'href="$1" target="_blank" rel="noopener noreferrer"'
      )
  );
}

/**
 * Get the interlanguage links for a specific article.
 * Returns an array of {lang, title} pairs for every language the article exists in.
 */
export async function getArticleLanguages(
  title: string,
  lang = DEFAULT_LANG,
  userId?: string,
): Promise<Array<{ lang: string; title: string }>> {
  const key = `langlinks:${lang}:${title}`;
  const cached = getCached<Array<{ lang: string; title: string }>>(key);
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(title.replace(/ /g, "_"));
    const sp = new URLSearchParams({
      action: "query", titles: decodeURIComponent(encoded),
      prop: "langlinks", lllimit: "500", format: "json",
    });
    const data = await fetchJSON<{
      query: { pages: Record<string, { langlinks?: Array<{ lang: string; "*": string }> }> };
    }>(`https://${lang}.wikipedia.org/w/api.php?${sp}`, SHORT_TTL, userId);

    const pages = data.query.pages;
    const page = Object.values(pages)[0];
    const links = (page?.langlinks ?? []).map((ll) => ({
      lang: ll.lang,
      title: ll["*"],
    }));

    setCache(key, links, SHORT_TTL);
    return links;
  } catch {
    return [];
  }
}

export async function getAvailableLanguages(userId?: string): Promise<WikiLanguage[]> {
  const key = "wiki-languages-list";
  const cached = getCached<WikiLanguage[]>(key);
  if (cached) return cached;

  try {
    const sp = new URLSearchParams({
      action: "sitematrix", smtype: "language",
      smlangprop: "code|name|localname", format: "json",
    });
    const data = await fetchJSON<{ sitematrix: Record<string, unknown> }>(
      `https://en.wikipedia.org/w/api.php?${sp}`, LONG_TTL, userId
    );

    const languages: WikiLanguage[] = [];
    const matrix = data.sitematrix;

    const knownCounts: Record<string, number> = {
      en: 6900000, ceb: 6120000, de: 2900000, sv: 2600000, fr: 2600000,
      nl: 2130000, ru: 1970000, es: 1960000, it: 1870000, arz: 1620000,
      pl: 1580000, ja: 1420000, zh: 1380000, vi: 1290000, uk: 1290000,
      war: 1270000, ar: 1230000, pt: 1110000, fa: 980000, ca: 740000,
      sr: 680000, id: 670000, ko: 640000, no: 620000, fi: 560000,
      hu: 530000, cs: 520000, sh: 460000, ro: 440000, nan: 430000,
      tr: 420000, eu: 410000, ms: 380000, ce: 370000, eo: 340000,
      he: 330000, hy: 310000, bg: 290000, da: 290000, tt: 250000,
      uz: 240000, et: 240000, sk: 240000, kk: 230000, min: 230000,
      be: 220000, el: 220000, lt: 210000, hr: 200000, simple: 240000,
      az: 200000, gl: 190000, sl: 180000, ur: 180000, ka: 170000,
      hi: 160000, th: 160000, ta: 150000, bn: 140000, mk: 130000,
    };

    for (const key of Object.keys(matrix)) {
      if (key === "count" || key === "specials") continue;
      const entry = matrix[key] as {
        code?: string;
        name?: string;
        localname?: string;
      };
      if (entry?.code) {
        languages.push({
          code: entry.code,
          name: entry.name || entry.code,
          localName: entry.localname || entry.name || entry.code,
          articleCount: knownCounts[entry.code],
        });
      }
    }

    languages.sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));
    setCache(key, languages, LONG_TTL);
    return languages;
  } catch {
    return [
      { code: "en", name: "English", localName: "English", articleCount: 6900000 },
      { code: "de", name: "German", localName: "Deutsch", articleCount: 2900000 },
      { code: "fr", name: "French", localName: "Français", articleCount: 2600000 },
      { code: "nl", name: "Dutch", localName: "Nederlands", articleCount: 2130000 },
      { code: "ru", name: "Russian", localName: "Русский", articleCount: 1970000 },
      { code: "es", name: "Spanish", localName: "Español", articleCount: 1960000 },
      { code: "it", name: "Italian", localName: "Italiano", articleCount: 1870000 },
      { code: "pl", name: "Polish", localName: "Polski", articleCount: 1580000 },
      { code: "ja", name: "Japanese", localName: "日本語", articleCount: 1420000 },
      { code: "zh", name: "Chinese", localName: "中文", articleCount: 1380000 },
      { code: "vi", name: "Vietnamese", localName: "Tiếng Việt", articleCount: 1290000 },
      { code: "uk", name: "Ukrainian", localName: "Українська", articleCount: 1290000 },
      { code: "ar", name: "Arabic", localName: "العربية", articleCount: 1230000 },
      { code: "pt", name: "Portuguese", localName: "Português", articleCount: 1110000 },
      { code: "fa", name: "Persian", localName: "فارسی", articleCount: 980000 },
      { code: "ca", name: "Catalan", localName: "Català", articleCount: 740000 },
      { code: "ko", name: "Korean", localName: "한국어", articleCount: 640000 },
      { code: "fi", name: "Finnish", localName: "Suomi", articleCount: 560000 },
      { code: "hu", name: "Hungarian", localName: "Magyar", articleCount: 530000 },
      { code: "cs", name: "Czech", localName: "Čeština", articleCount: 520000 },
    ];
  }
}
