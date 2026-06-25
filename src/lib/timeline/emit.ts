/**
 * Timeline Event Emitter for Wiki App
 *
 * Server-side utility that posts timeline events to YE-UI.
 * Implements debouncing to avoid duplicate events.
 */

import { createApiClient } from "@/lib/api";

const api = createApiClient("ye-wiki");

async function postTimelineEntry(userId: string, collection: string, data: Record<string, unknown>) {
  await api.postTimelineEntry(userId, collection, data);
}

/** In-memory debounce cache: key = userId:type:entityId, value = timestamp */
const debounceCache = new Map<string, number>();

/** Debounce window in milliseconds (5 minutes for reads, 1 minute for edits) */
const DEBOUNCE_MS: Record<string, number> = {
  "wiki-article-read": 5 * 60 * 1000,
  "wiki-article-edit": 1 * 60 * 1000,
};

/**
 * Check if an event should be debounced.
 * Returns true if the same event was emitted within the debounce window.
 */
function shouldDebounce(
  userId: string,
  eventType: string,
  entityId: string
): boolean {
  const key = `${userId}:${eventType}:${entityId}`;
  const lastEmitted = debounceCache.get(key);
  const debounceWindow = DEBOUNCE_MS[eventType] ?? 5 * 60 * 1000;

  if (lastEmitted && Date.now() - lastEmitted < debounceWindow) {
    return true;
  }

  debounceCache.set(key, Date.now());

  // Clean old entries to prevent memory leak (keep last 1000)
  if (debounceCache.size > 1000) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, v] of debounceCache.entries()) {
      if (v < cutoff) debounceCache.delete(k);
    }
  }

  return false;
}

/**
 * Emit a wiki article read event.
 * Debounced: same article by same user within 5 minutes is skipped.
 */
export async function emitArticleReadEvent(
  userId: string,
  articleSlug: string,
  articleTitle: string,
  excerpt: string,
  domain: string
): Promise<void> {
  if (shouldDebounce(userId, "wiki-article-read", articleSlug)) {
    return;
  }

  const infoCardUrl = `https://wiki.${domain}/api/cards/article-summary?url=${encodeURIComponent(`/wiki/${articleSlug}`)}`;

  await postTimelineEntry(userId, "history", {
    app_id: "wiki",
    entry_type: "wiki-article-read",
    title: `Read: ${articleTitle}`,
    timestamp: new Date().toISOString(),
    embed_path: `/embed/timeline/article?slug=${encodeURIComponent(articleSlug)}&lang=en`,
    tags: { slug: articleSlug },
    data: {
      entityId: articleSlug,
      excerpt: excerpt.substring(0, 200),
      infoCardUrl,
      actionUrl: `https://wiki.${domain}/wiki/${encodeURIComponent(articleSlug)}`,
    },
    info_card: {
      card_type: "article-summary",
      endpoint: infoCardUrl,
    },
  });
}

/**
 * Emit a wiki article edit event.
 * Debounced: same article by same user within 1 minute is skipped.
 */
export async function emitArticleEditEvent(
  userId: string,
  articleSlug: string,
  articleTitle: string,
  editDescription: string,
  domain: string
): Promise<void> {
  if (shouldDebounce(userId, "wiki-article-edit", articleSlug)) {
    return;
  }

  const infoCardUrl = `https://wiki.${domain}/api/cards/article-summary?url=${encodeURIComponent(`/wiki/${articleSlug}`)}`;

  await postTimelineEntry(userId, "history", {
    app_id: "wiki",
    entry_type: "wiki-article-edit",
    title: `Edited: ${articleTitle}`,
    timestamp: new Date().toISOString(),
    embed_path: `/embed/timeline/article?slug=${encodeURIComponent(articleSlug)}&lang=en`,
    tags: { slug: articleSlug },
    data: {
      entityId: articleSlug,
      editDescription,
      infoCardUrl,
      actionUrl: `https://wiki.${domain}/wiki/${encodeURIComponent(articleSlug)}`,
    },
    info_card: {
      card_type: "article-summary",
      endpoint: infoCardUrl,
    },
  });
}
