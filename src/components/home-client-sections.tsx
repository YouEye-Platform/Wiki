/**
 * Home Page Client Sections — localStorage-backed dashboard panels
 *
 * Reading List section that hydrates from localStorage on the client side.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import {
  getBookmarks,
  type BookmarkEntry,
} from "@/lib/reading-history";

export function ReadingListSection({ lang }: { lang: string }) {
  const [items, setItems] = useState<BookmarkEntry[]>([]);

  useEffect(() => {
    setItems(getBookmarks().slice(0, 6));
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-muted-foreground" />
          Reading list
        </h2>
      </div>
      {items.length > 0 ? (
        <div className="space-y-0.5">
          {items.map((item) => (
            <Link
              key={`${item.lang}-${item.title}`}
              href={`/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}?lang=${item.lang}`}
              className="flex items-center py-2 px-2 -mx-2 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {item.displayTitle}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Save articles to read later
        </p>
      )}
    </section>
  );
}
