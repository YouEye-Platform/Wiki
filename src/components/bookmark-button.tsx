"use client";

import { useTranslations as useInterfaceTranslations } from "next-intl";
/**
 * Bookmark Button — toggles article in reading list (localStorage)
 */



import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/reading-history";

interface BookmarkButtonProps {
  title: string;
  displayTitle: string;
  lang: string;
}

export function BookmarkButton({ title, displayTitle, lang }: BookmarkButtonProps) {
  const translateInterface = useInterfaceTranslations("interface");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(title, lang));
  }, [title, lang]);

  return (
    <button
      onClick={() => {
        const nowSaved = toggleBookmark({ title, displayTitle, lang });
        setSaved(nowSaved);
      }}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
      title={saved ? translateInterface("m22f9175a2a50") : translateInterface("m7f53c60a772e")}
    >
      <Bookmark
        className={`h-3.5 w-3.5 ${saved ? "fill-primary text-primary" : ""}`}
      />
      {saved ? translateInterface("mb5c120b316c2") : translateInterface("m1509f561f241")}
    </button>
  );
}
