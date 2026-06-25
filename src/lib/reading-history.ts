/**
 * Reading List — localStorage-backed bookmarks
 *
 * Provides a reading list (bookmarks) for saving articles.
 * All data lives in the browser — no backend needed.
 */

export interface BookmarkEntry {
  title: string;
  displayTitle: string;
  lang: string;
  addedAt: number;
}

const BOOKMARKS_KEY = "ye-wiki-bookmarks";
const MAX_BOOKMARKS = 50;

export function getBookmarks(): BookmarkEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleBookmark(
  entry: Omit<BookmarkEntry, "addedAt">
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const bookmarks = getBookmarks();
    const idx = bookmarks.findIndex(
      (b) => b.title === entry.title && b.lang === entry.lang
    );
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return false; // removed
    } else {
      bookmarks.unshift({ ...entry, addedAt: Date.now() });
      localStorage.setItem(
        BOOKMARKS_KEY,
        JSON.stringify(bookmarks.slice(0, MAX_BOOKMARKS))
      );
      return true; // added
    }
  } catch {
    return false;
  }
}

export function isBookmarked(title: string, lang: string): boolean {
  return getBookmarks().some((b) => b.title === title && b.lang === lang);
}
